# 从0到1开发指南

> 本文档记录完整的小程序+Web端开发流程，从项目启动到上线发布的每一步。

---

## 📋 开发流程总览

```
1. 需求分析与规划 (1-3天)
   ↓
2. 技术选型与架构设计 (1-2天)
   ↓
3. 项目初始化 (1天)
   ↓
4. 数据库设计 (1-2天)
   ↓
5. 核心功能开发 (2-4周)
   ↓
6. 测试与优化 (3-5天)
   ↓
7. 上线发布 (1-2天)
```

---

## 第一阶段：需求分析与规划

### 1.1 明确项目目标

**核心问题**：
- 这个系统要解决什么问题？
- 谁会用这个系统？（角色）
- 他们要完成什么任务？（功能）
- 系统的边界在哪里？（不做什么）

**本项目的回答**：
```
问题：装修公司客户管理混乱、工地进度不透明、材料库存难管理
用户：销售、设计师、项目经理、管理员、业主
核心任务：
  - 销售：管理客户线索、跟进记录、报价
  - 设计师：设计工作流、文件管理
  - 项目经理：工地进度管理、工序验收
  - 管理员：员工管理、数据分析
  - 业主：查看工地进度
不做：财务管理、供应商管理、复杂的ERP功能
```

### 1.2 编写 PRD（产品需求文档）

**文档结构**：
1. 项目背景与目标
2. 用户角色与权限
3. 功能模块列表
4. 核心流程图
5. 页面原型（可选）
6. 非功能需求（性能、安全等）

**工具推荐**：
- 流程图：draw.io、ProcessOn
- 原型图：Figma、墨刀、Axure
- 文档：Markdown、飞书文档

**本项目 PRD**：`docs/PRD.md`

**【经验建议】**
- PRD 不需要一次写完，可以边开发边补充
- 重点是把核心流程想清楚，避免返工
- 如果是自己用的系统，PRD 可以简化，但核心流程必须有

### 1.3 制定开发计划

**里程碑规划**：
```
Week 1: 环境搭建 + 登录功能 + 数据库设计
Week 2: 客户管理 + 跟进记录
Week 3: 工地管理 + 报价功能
Week 4: 材料库存 + 待办通知
Week 5: 设计工作流 + 分享功能
Week 6: 测试优化 + 上线
```

**优先级排序**：
1. **P0（必须有）**：登录、客户管理、工地管理
2. **P1（重要）**：报价、材料、待办、通知
3. **P2（可以后做）**：数据分析、分享查看、设计工作流

**【经验建议】**
- 先做最小可用版本（MVP），快速验证
- 不要一开始就追求完美，功能可以迭代
- 预留 20-30% 的时间做测试和优化

---

## 第二阶段：技术选型与架构设计

### 2.1 技术选型决策

#### 前端技术栈

**小程序端**：
- **选择**：微信原生小程序
- **理由**：
  - 性能最好，体验最流畅
  - 可以直接使用云开发（数据库、存储、云函数）
  - 不需要学习额外框架（uni-app、Taro）
- **缺点**：
  - 只能在微信中使用，不能跨平台
  - 语法和 Vue/React 不同，学习成本

**Web端**：
- **选择**：Next.js 14 + TypeScript + Tailwind CSS
- **理由**：
  - Next.js：React 框架，支持 SSR、API Routes
  - TypeScript：类型安全，减少 bug
  - Tailwind CSS：快速开发，样式一致
- **其他选项**：
  - Vue + Nuxt：如果更熟悉 Vue
  - React + Vite：如果不需要 SSR
  - 纯 HTML/CSS/JS：如果功能简单

**【你的决策过程】**
```
TODO: 补充你当时的考虑
- 为什么选 Next.js 而不是 Vue？
- 为什么用 TypeScript？（之前会吗？）
- 为什么用 Tailwind？（学习成本高吗？）
```

#### 后端技术栈

**选择**：无独立后端，使用云开发 + Next.js API Routes

**架构**：
```
小程序端 → 云数据库（直接读写）
         → 云函数（订阅消息、获取手机号）

Web端 → Next.js API Routes → 云数据库（HTTP API）
```

**理由**：
- 云开发免运维，不需要自己搭服务器
- 小程序端可以直接操作数据库，开发效率高
- Web端通过 API Routes 调用云数据库，保持一致性
- 成本低（小项目免费或低价套餐即可）

**其他选项**：
- Node.js + Express + MongoDB：需要自己搭服务器
- Java + Spring Boot + MySQL：适合大型项目
- Python + Django + PostgreSQL：适合数据分析场景

**【你的决策过程】**
```
TODO: 补充你当时的考虑
- 为什么不用独立后端？
- 有没有考虑过其他方案？
- 云开发的限制（100条查询）有没有影响？
```

#### 数据库选择

**选择**：微信云开发 TCB（腾讯云数据库）

**理由**：
- 与小程序深度集成，开发效率高
- NoSQL 文档型数据库，灵活性高
- 自动扩容，无需手动维护
- 小程序端可以直接操作，无需写接口

**缺点**：
- 单次查询限制 100 条（需要分页）
- 不支持复杂的关联查询（需要多次查询）
- 不支持事务（需要自己保证数据一致性）

**其他选项**：
- MySQL/PostgreSQL：适合复杂查询、事务场景
- MongoDB：如果需要自建 NoSQL
- Supabase：开源的 Firebase 替代品

### 2.2 架构设计

#### 整体架构图

```
┌─────────────────────────────────────────────────────────┐
│                        用户层                            │
├──────────────────────┬──────────────────────────────────┤
│   小程序端（员工）    │      Web端（管理员）              │
│   - 微信原生开发      │      - Next.js 14                │
│   - 云开发 SDK        │      - TypeScript                │
│   - 直接操作数据库    │      - Tailwind CSS              │
└──────────┬───────────┴──────────────┬───────────────────┘
           │                          │
           │                          │ HTTP API
           │                          ↓
           │                  ┌───────────────┐
           │                  │  API Routes   │
           │                  │  (Next.js)    │
           │                  └───────┬───────┘
           │                          │
           │                          │ TCB HTTP API
           ↓                          ↓
    ┌──────────────────────────────────────────┐
    │         微信云开发 TCB                    │
    ├──────────────┬──────────────┬────────────┤
    │   云数据库    │   云存储      │  云函数     │
    │   (NoSQL)    │   (COS)      │  (Node.js) │
    └──────────────┴──────────────┴────────────┘
```

#### 数据流转

**小程序端写入数据**：
```
用户操作 → 小程序页面 → 云数据库 SDK → 云数据库
                                    ↓
                              Web端实时同步
```

**Web端写入数据**：
```
用户操作 → Web页面 → API Routes → TCB HTTP API → 云数据库
                                              ↓
                                        小程序端实时同步
```

#### 认证鉴权方案

**小程序端**：
```javascript
// 登录流程
1. 用户输入账号密码
2. 查询 users 集合验证
3. 验证成功后存储用户信息到 Storage
4. 后续请求从 Storage 读取用户信息

// 权限控制
- 前端：根据 role 字段显示/隐藏功能
- 数据库：权限设置为"所有用户可读写"（简化开发）
```

**Web端**：
```javascript
// 登录流程
1. 用户输入账号密码
2. 调用 /api/auth/login
3. 后端验证成功后生成 JWT token
4. 前端存储 token 到 localStorage
5. 后续请求在 Header 中带上 token

// 权限控制
- 前端：MainLayout 组件统一拦截，检查 token 和 role
- 后端：API Routes 中验证 token（部分接口）
```

**【经验建议】**
- 小项目可以简化认证，不需要过度设计
- 密码加密看场景，内部系统可以明文（本项目选择）
- 权限控制前端为主，后端为辅（因为是内部系统）

### 2.3 编写架构文档

**文档内容**：
1. 整体架构图
2. 技术栈说明
3. 数据流转
4. 认证鉴权
5. 文件存储
6. 双端同步机制

**本项目架构文档**：`docs/ARCHITECTURE.md`（需扩充）

---

## 第三阶段：项目初始化

### 3.1 创建项目文件结构

#### 小程序端结构

```
mini-program/
├── pages/              # 页面
│   ├── index/         # 首页（待办列表）
│   ├── login/         # 登录页
│   ├── leadList/      # 客户列表
│   ├── leadDetail/    # 客户详情
│   ├── projectList/   # 工地列表
│   ├── projectDetail/ # 工地详情
│   ├── projectShare/  # 工地分享页
│   └── ...
├── components/         # 组件
│   ├── todoForm/      # 待办表单
│   ├── customerCard/  # 客户卡片
│   └── ...
├── utils/             # 工具函数
│   ├── format.js      # 格式化（脱敏）
│   ├── subscribe.js   # 订阅消息配置
│   └── date.js        # 日期处理
├── cloudfunctions/    # 云函数
│   ├── sendSubscribeMessage/
│   ├── getPhoneNumber/
│   └── login/
├── app.js             # 小程序入口
├── app.json           # 小程序配置
├── app.wxss           # 全局样式
└── project.config.json # 项目配置
```

#### Web端结构

```
web/
├── src/
│   ├── app/                    # Next.js 13+ App Router
│   │   ├── page.tsx           # 首页（仪表盘）
│   │   ├── layout.tsx         # 根布局
│   │   ├── leads/             # 客户管理
│   │   ├── projects/          # 工地管理
│   │   ├── quotes/            # 报价管理
│   │   ├── materials/         # 材料大厅
│   │   ├── inventory/         # 库存管理
│   │   ├── todos/             # 待办事项
│   │   ├── employees/         # 组织架构
│   │   ├── analytics/         # 数据分析
│   │   └── api/               # API Routes
│   │       ├── auth/
│   │       ├── leads/
│   │       ├── projects/
│   │       └── ...
│   ├── components/            # 组件
│   │   ├── MainLayout.tsx    # 主布局（权限拦截）
│   │   ├── DatePicker.tsx    # 日期选择器
│   │   ├── CustomerInfo.tsx  # 客户信息展示
│   │   └── ...
│   ├── lib/                   # 工具库
│   │   ├── wechat-tcb.ts     # TCB 封装
│   │   ├── date.ts           # 日期工具
│   │   └── auth.ts           # 认证工具
│   └── types/                 # TypeScript 类型
├── public/                    # 静态资源
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── next.config.js
```

### 3.2 初始化小程序项目

**步骤**：
1. 打开微信开发者工具
2. 新建项目 → 选择目录 → 输入 AppID
3. 选择"不使用云服务"（后续手动配置）
4. 创建成功后，删除默认的示例代码

**配置 app.json**：
```json
{
  "pages": [
    "pages/login/index",
    "pages/index/index"
  ],
  "window": {
    "navigationBarTitleText": "品诺筑家",
    "navigationBarBackgroundColor": "#2563eb",
    "navigationBarTextStyle": "white"
  },
  "tabBar": {
    "list": [
      {
        "pagePath": "pages/index/index",
        "text": "待办",
        "iconPath": "images/todo.png",
        "selectedIconPath": "images/todo-active.png"
      },
      {
        "pagePath": "pages/leadList/index",
        "text": "客户",
        "iconPath": "images/customer.png",
        "selectedIconPath": "images/customer-active.png"
      }
    ]
  },
  "cloud": true
}
```

**配置 project.config.json**：
```json
{
  "appid": "你的AppID",
  "cloudfunctionRoot": "cloudfunctions/",
  "setting": {
    "es6": true,
    "enhance": true,
    "minified": true
  }
}
```

### 3.3 初始化 Web 项目

**步骤**：
```bash
# 创建 Next.js 项目
npx create-next-app@latest web --typescript --tailwind --app

# 进入项目目录
cd web

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

**安装额外依赖**：
```bash
# 日期处理
npm install date-fns

# HTTP 请求（如果需要）
npm install axios

# 图标库
npm install lucide-react
```

**配置 tsconfig.json**：
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### 3.4 配置云开发

**小程序端**：
```javascript
// app.js
App({
  onLaunch() {
    // 初始化云开发
    wx.cloud.init({
      env: '你的环境ID',
      traceUser: true
    })
  }
})
```

**Web端**：
```typescript
// src/lib/wechat-tcb.ts
const TCB_ENV_ID = '你的环境ID'
const TCB_SECRET_ID = '你的SecretID'
const TCB_SECRET_KEY = '你的SecretKey'

// 封装 TCB HTTP API 调用
export async function tcbRequest(action: string, data: any) {
  // 实现签名和请求逻辑
  // 详见项目中的 wechat-tcb.ts
}
```

**【注意事项】**
- 环境ID 在云开发控制台获取
- SecretID 和 SecretKey 在腾讯云控制台获取（访问管理 → API密钥）
- **安全提示**：生产环境不要把密钥写在代码里，应该用环境变量

---

## 第四阶段：数据库设计

### 4.1 设计数据模型

**核心原则**：
- NoSQL 数据库，不需要严格的表结构
- 可以嵌套对象和数组
- 避免过度关联，适当冗余数据
- 考虑查询场景，设计合理的字段

**设计流程**：
1. 列出所有实体（客户、工地、报价等）
2. 列出每个实体的字段
3. 确定字段类型和约束
4. 确定关联关系
5. 考虑查询场景，优化设计

**本项目数据模型**：详见 `docs/DATABASE_SCHEMA.md`（待创建）

### 4.2 创建数据库集合

**在云开发控制台创建**：
```
users, leads, projects, quotes, contracts,
materials, inventory, followUps, todos,
notifications, shareAccess
```

**设置权限**：
- 所有集合设置为"所有用户可读写"
- 生产环境建议用云函数 + 权限校验

### 4.3 初始化数据

**创建管理员账号**：
```javascript
// 在云开发控制台 → 数据库 → users 集合 → 添加记录
{
  "account": "admin",
  "password": "123456",
  "name": "管理员",
  "role": "admin",
  "phone": "13800138000",
  "status": "active",
  "createdAt": { "$date": 1714147200000 }
}
```

**【经验建议】**
- 先创建一个管理员账号，用于登录测试
- 其他数据可以在开发过程中逐步添加
- 可以写一个数据导入脚本，批量创建测试数据

---

## 第五阶段：核心功能开发

### 5.1 开发顺序建议

**第一步：登录功能（必须先做）**
- 小程序端：登录页 + 账号密码验证
- Web端：登录页 + JWT 认证
- 原因：后续所有功能都依赖登录

**第二步：客户管理（核心功能）**
- 客户列表 + 详情页
- 跟进记录
- 状态变更
- 原因：这是业务的起点

**第三步：工地管理（核心功能）**
- 工地列表 + 详情页
- 施工排期
- 工序验收
- 原因：客户签单后就要创建工地

**第四步：报价功能**
- 报价单列表 + 详情页
- 报价单创建 + 编辑
- 原因：签单前需要报价

**第五步：材料与库存**
- 材料大厅
- 库存管理
- 原因：工地施工需要材料

**第六步：待办与通知**
- 待办列表 + 创建
- 通知中心
- 订阅消息
- 原因：提升协作效率

**第七步：高级功能**
- 设计工作流
- 分享查看权限
- 数据分析
- 原因：锦上添花的功能

**【经验建议】**
- 严格按顺序开发，不要跳着做
- 每完成一个模块就测试一遍
- 不要追求完美，先做出来再优化

### 5.2 开发规范

#### 命名规范

**数据库字段**：
- 使用驼峰命名：`customerName`, `createdAt`
- 布尔值用 `is` 开头：`isActive`, `isDeleted`
- 时间字段用 `At` 结尾：`createdAt`, `updatedAt`

**代码命名**：
- 组件：大驼峰 `CustomerCard.tsx`
- 函数：小驼峰 `fetchLeads()`
- 常量：大写下划线 `TCB_ENV_ID`

#### 代码组织

**小程序页面结构**：
```javascript
// pages/xxx/index.js
Page({
  data: {
    // 页面数据
  },

  onLoad(options) {
    // 页面加载
  },

  // 数据加载
  async loadData() {},

  // 事件处理
  handleXxx() {},

  // 工具函数
  _formatXxx() {}
})
```

**Web页面结构**：
```typescript
// app/xxx/page.tsx
'use client'

import { useState, useEffect } from 'react'

export default function XxxPage() {
  // 状态
  const [data, setData] = useState([])

  // 数据加载
  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {}

  // 事件处理
  function handleXxx() {}

  // 渲染
  return <div>...</div>
}
```

#### 错误处理

**小程序端**：
```javascript
try {
  const res = await db.collection('leads').get()
  // 处理数据
} catch (err) {
  console.error('查询失败', err)
  wx.showToast({
    title: '加载失败',
    icon: 'none'
  })
}
```

**Web端**：
```typescript
try {
  const res = await fetch('/api/leads')
  const data = await res.json()
  // 处理数据
} catch (err) {
  console.error('查询失败', err)
  alert('加载失败，请重试')
}
```

### 5.3 常见问题与解决方案

**问题1：云数据库查询限制100条**
```javascript
// 解决方案：分页查询
const PAGE_SIZE = 20
let page = 0
let allData = []

while (true) {
  const res = await db.collection('leads')
    .skip(page * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .get()

  allData = allData.concat(res.data)

  if (res.data.length < PAGE_SIZE) break
  page++
}
```

**问题2：时间字段格式不统一**
```javascript
// 小程序端写入
createdAt: db.serverDate() // 会变成时间戳

// Web端写入
createdAt: { $date: Date.now() } // 对象格式

// 统一解析函数
function parseTime(time) {
  if (typeof time === 'number') return time
  if (time?.$date) return time.$date
  if (typeof time === 'string') return new Date(time).getTime()
  return Date.now()
}
```

**问题3：换行符在数据库中显示为 \n**
```javascript
// 写入前转义
const content = formData.content.replace(/\n/g, '\\n')

// 读取后还原
const content = data.content.replace(/\\n/g, '\n')
```

**问题4：图片上传**
```javascript
// 小程序端
wx.chooseImage({
  success: async (res) => {
    const filePath = res.tempFilePaths[0]
    const cloudPath = `images/${Date.now()}.jpg`

    const uploadRes = await wx.cloud.uploadFile({
      cloudPath,
      filePath
    })

    const fileID = uploadRes.fileID
    // 保存 fileID 到数据库
  }
})

// Web端
// 需要先上传到云存储，再保存 URL
// 详见 /api/upload 接口
```

---

## 第六阶段：测试与优化

### 6.1 功能测试清单

详见 `docs/TESTING_GUIDE.md`（待创建）

### 6.2 性能优化

**小程序端**：
- 减少 setData 调用
- 图片懒加载
- 分页加载数据

**Web端**：
- 使用 Next.js 的 SSR/SSG
- 图片优化（next/image）
- 代码分割

### 6.3 用户体验优化

- 加载状态提示
- 错误提示友好
- 操作反馈及时
- 空状态设计

---

## 第七阶段：上线发布

### 7.1 上线前检查清单

详见 `docs/DEPLOYMENT.md`（待创建）

### 7.2 小程序提审

1. 开发者工具 → 上传代码
2. 小程序后台 → 版本管理 → 提交审核
3. 填写版本说明
4. 等待审核（通常1-3天）
5. 审核通过后发布

### 7.3 Web端部署

**使用 Vercel（推荐）**：
```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
cd web
vercel
```

**使用自己的服务器**：
```bash
# 构建
npm run build

# 启动
npm run start
```

---

## 附录：开发工具与资源

### 开发工具
- 微信开发者工具
- VS Code
- Postman（测试API）
- draw.io（画流程图）

### 学习资源
- 微信小程序官方文档：https://developers.weixin.qq.com/miniprogram/dev/framework/
- Next.js 官方文档：https://nextjs.org/docs
- Tailwind CSS 文档：https://tailwindcss.com/docs
- 云开发文档：https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html

### 社区资源
- 微信开放社区
- Stack Overflow
- GitHub

---

**最后更新**：2026-04-27
**维护者**：XIN
