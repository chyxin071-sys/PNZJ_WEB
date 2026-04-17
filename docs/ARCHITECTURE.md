# CM1.0 系统架构概览

> 版本：1.0 | 更新日期：2026-04-17

---

## 系统结构

```
CM1.0/
├── web/                    # 网页端（Next.js 14）
│   └── src/
│       ├── app/            # 页面路由
│       │   ├── page.tsx              # 首页数据看板
│       │   ├── leads/                # 线索管理
│       │   ├── projects/             # 项目管理（甘特图）
│       │   ├── quotes/               # 报价单
│       │   ├── contracts/            # 合同管理（1.0 为 mock）
│       │   ├── materials/            # 材料库
│       │   ├── todos/                # 待办任务
│       │   ├── employees/            # 员工管理
│       │   ├── notifications/        # 通知中心
│       │   ├── profile/              # 个人中心
│       │   └── api/                  # 后端 API 路由
│       ├── components/     # 公共组件
│       │   ├── MainLayout.tsx        # 主布局（导航栏、权限拦截）
│       │   ├── CustomerInfo.tsx      # 客户信息卡片
│       │   └── CustomerDocuments.tsx # 客户文件管理
│       ├── lib/            # 工具库
│       │   ├── wechat-tcb.ts         # TCB 云数据库操作封装
│       │   ├── date.ts               # 日期工具（工作日计算）
│       │   └── dateUtils.ts          # 日期格式化
│       └── models/         # Mongoose 模型（目前未使用，仅作参考）
│
└── mini-program/           # 微信小程序端
    ├── app.js              # 小程序入口（初始化云开发）
    ├── pages/              # 页面
    │   ├── index/          # 首页（待办列表）
    │   ├── leads/          # 线索列表
    │   ├── leadDetail/     # 线索详情（含设计甘特图）
    │   ├── projects/       # 项目列表
    │   ├── projectDetail/  # 项目详情（含施工甘特图）
    │   ├── quotes/         # 报价单列表
    │   ├── materials/      # 材料库
    │   ├── notifications/  # 通知中心
    │   ├── employees/      # 团队成员
    │   ├── profile/        # 个人中心
    │   └── login/          # 登录页
    └── utils/
        ├── date.js         # 日期工具
        └── format.js       # 数据脱敏（maskName/maskPhone/maskAddress）
```

---

## 数据库集合（TCB 云数据库）

| 集合名 | 用途 | 关键字段 |
|--------|------|---------|
| `users` | 员工账号 | `name`, `phone`, `account`, `role`, `passwordPlain`（待改为 hash）, `status` |
| `leads` | 客户线索 | `name`, `phone`, `customerNo`, `status`, `sales`, `designer`, `rating`, `files` |
| `followUps` | 跟进记录 | `leadId`, `content`, `method`, `createdBy`, `createdAt` |
| `projects` | 施工项目 | `customer`, `manager`, `startDate`, `status`, `nodesData`（8大节点甘特数据） |
| `quotes` | 报价单 | `customerName`, `items`, `total`, `sales`（缺 leadId 关联） |
| `materials` | 材料库 | `name`, `brand`, `spec`, `unit`, `price`, `category` |
| `todos` | 待办任务 | `title`, `priority`, `status`, `assignees`, `dueDate`, `relatedTo` |
| `notifications` | 通知消息 | `title`, `content`, `targetUser`, `isRead`, `isStarred`, `type` |

---

## 权限体系

| 角色 | 标识 | 权限说明 |
|------|------|---------|
| 超级管理员 | `admin` | 全部功能，可看所有数据，可管理员工 |
| 销售/客服 | `sales` | 线索（只能看自己负责的）、报价单、待办；禁止修改项目 |
| 设计师 | `designer` | 线索（只能看自己负责的）、报价单；禁止修改项目 |
| 项目经理 | `manager` | 项目管理（全部）、待办；线索只读 |

### 数据脱敏规则
- 非本人负责的线索：姓名显示为"李**"，手机号显示为"138****0000"，地址数字替换为"*"
- admin 角色不脱敏，看到完整信息

---

## 关键业务流程

### 线索生命周期
```
录入线索 → 待跟进 → 沟通中 → 已量房 → 方案阶段 → 已交定金 → 已签单
                                                              ↓
                                                         自动/手动创建项目
                                                              ↓
                                                         施工甘特图管理
```

### 项目甘特图流程
```
新建项目（未开工）→ 项目经理裁剪节点 → 正式开工（设置开始日期）
→ 8大节点顺序推进（每个节点含子工序）
→ 子工序验收（拍照+备注）→ 节点完成 → 下一节点自动开始
→ 延期记录（顺延后续所有节点）→ 竣工交付
```

---

## 网页端与小程序端数据同步方式

两端共用同一个 TCB 云数据库，数据实时同步：
- 网页端通过 Next.js API Routes 调用 TCB HTTP API
- 小程序端直接调用 `wx.cloud.database()` SDK
- 没有独立的后端服务器，所有逻辑在 Next.js API Routes 或小程序端处理

---

## 环境变量（待配置）

以下敏感信息应移入 `.env.local`（目前硬编码在代码中，需修复）：

```
WECHAT_APPID=wxc9f24e9a9f57bc7a
WECHAT_APPSECRET=（不要写在这里）
NEXT_PUBLIC_TCB_ENV_ID=cloud1-8grodf5s3006f004
JWT_SECRET=（自定义强密码）
TCB_SECRET_ID=（腾讯云 SecretId）
TCB_SECRET_KEY=（腾讯云 SecretKey）
```
