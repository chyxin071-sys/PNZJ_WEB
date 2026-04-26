# 版本管理记录

> 项目：PNZJ CRM+ERP 管理系统
> 仓库：CM1.0
> 分支策略：main 为稳定版本，feature/* 为功能开发分支

---

## 版本命名规则

- **大版本（1.0 → 2.0）**：架构重构、核心功能重写
- **小版本（1.0 → 1.1）**：新增功能模块
- **补丁版本（1.0.0 → 1.0.1）**：Bug 修复、小优化

---

## v1.2.0（2026-04-27）深水区重构与双端协同

### 核心架构重构
- **主材清单快照解耦机制**：重构分享逻辑，员工端数据修改不再实时影响客户端，客户仅查看“被发送时的版本快照”，彻底解决实时数据变动带来的信任危机。
- **大节点流转与动态排期引擎**：打破线性流转限制，重构为“首尾签字、中间并行施工”模型；排期天数改按自然日计算，并实现基于实际完工日期的动态顺延。
- **全场景沉浸式交互**：全站全屏弹窗（新建待办/线索等）引入微信原生 `<root-portal>` 包裹，解决 TabBar 遮挡问题，提升原生 App 级体验。

### 新功能与体验升级
- **全站文件图纸可视化升级**：在项目资料与设计工作流中，图片直接展示云端缩略图，PDF/Word/Excel/CAD 等非图片文件自动匹配专属高亮颜色与图标，大幅提升文件辨识度。
- **专属入户密码权限管控**：为工地详情新增 `doorPassword` 字段，严格限制仅相关负责人与管理员可见，解决施工人员进场痛点且保护业主隐私。
- **主材清单智能录入与多选分享**：表单增加智能分类提示，支持员工一次性勾选多个主材分类发送给客户确认。
- **极速加载体验**：上传端强制 `wx.compressImage` 压缩，渲染端全面接入腾讯云 `imageMogr2` 输出 WebP 缩略图，彻底解决图片列表卡顿。

### 关键 Bug 修复与稳定性增强
- **订阅消息环境适配与防打扰**：修复体验版收不到订阅消息的问题（显式指定 `miniprogramState`）；新增基于 `OpenId` 的服务端物理去重，防止微信分身测试时收到重复消息轰炸。
- **核心通知与留痕闭环**：修复报价单、设计工作流、主材发送等核心动作通知漏发问题，全局规范通知范围为“相关人员+全量管理员”，并同步写入系统跟进记录。
- **主材清单图片死链修复**：拔除前期遗留的 mock 假上传代码，全面接入 `wx.cloud.uploadFile` 真实云存储入库并保存 `fileID`。
- **玄学白屏拦截**：修复 WXML 标签未闭合引发的 `__route__ is not defined` 偶发页面白屏与点击穿透问题。
- **多端登录互斥**：实现账号异地登录互斥（自动踢下线），并复用云函数绕过前端 `sessionToken` 更新的云开发权限安全限制。

---

## v1.1.0（2026-04-24）正式发布

### 新功能
- **客户查看权限申请系统**：外部用户（客户家属/朋友）通过分享链接查看工地进度时需申请权限，员工审批后放行；业主本人手机号验证自动通过
  - 新增 `shareAccessManage` 页面（申请管理）
  - 新增 `getPhoneNumber` 云函数（获取手机号）
  - 新增 `shareAccess` 数据库集合
  - 工地详情页快捷操作区改为 2x2 网格，新增"查看申请"入口
  - 订阅消息：申请提交通知员工、审批结果通知申请人
- **微信订阅消息通知**：接入微信订阅消息，关键操作自动推送通知
- **跟进记录红点未读提示**：
  - 客户列表卡片、客户详情 tab、工地详情按钮三处统一显示红点
  - 任意一处点开跟进记录即标记已读，三处同步消除红点
  - 机制：`leads.lastFollowUpAt` 时间戳 vs 本地 `followup_read_${leadId}` 对比判断

### Bug 修复（2026-04-22 第一批）
- **BUG-02**：所有 API 的 `docData` 换行符转义正则写错（`.replace(/\\n/g, '\\\\n')` → `.replace(/\n/g, '\\n')`），影响 6 个文件（leads/projects/followUps 的 route.ts 和 [id]/route.ts）
- **BUG-02**：`projects/[id]/page.tsx` localStorage key 错误（`'user'` → `'pnzj_user'`）
- **BUG-01**：`employees/[id]/route.ts` 名字同步补充了 `leads.manager` 字段
- **BUG-03**：客户详情页项目经理卡片改为始终显示；工地编辑弹窗项目经理改为下拉选择器
- **BUG-15**：客户详情页 API 失败时加了 `leadNotFound` 状态，不再无限转圈
- **BUG-06**：跟进记录前端加了 sort 确保倒序显示
- **BUG-04**：todos 页面"指派"用词改为"执行人"/"未分配"
- **BUG-16**：报价单新建保存后跳转到 `/quotes/{id}` 而非列表页
- **BUG-17/18**：`quotes/[id]/page.tsx` handleSave 改为真实调 PUT API；quotes API POST 返回 `_id`；`quotes/[id]/route.ts` 补充换行符转义修复

### Bug 修复（2026-04-22 第二批）
- **BUG-20**：新建待办执行人默认为自己
- **BUG-21**：新建客户时根据创建人角色自动填入对应字段
- **BUG-22**：已签单客户信息全员可见（只读）
- **BUG-23**：报价单保存时自动写入跟进记录
- **BUG-24**：新建工地时自动写入跟进记录
- **BUG-25**：客户来源选项更新，支持"其他"附加输入
- **BUG-26**：待办筛选关联客户按权限过滤，避免隐私泄露
- **BUG-27**：现场影像改为 3 列 grid 布局
- **BUG-28**：材料库新增重名校验
- **BUG-31**：上传图片前压缩（quality: 80）

### Bug 修复（2026-04-24）
- 分享页底部操作栏多余 Logo 已删除
- 工地详情页（小程序+Web）子工序 `current` 状态 UI 未显示黄色"施工中"标签 → 已修复两端渲染逻辑
- **跟进记录时间解析**：`createdAt` 字段存在三种格式（`{ $date: 毫秒 }`、纯数字时间戳、字符串），Web 端新增 `parseFollowUpTime` 函数统一兼容，修复小程序写入的系统跟进记录时间解析失败、排序乱掉的问题
- **跟进记录排序**（小程序）：`leadDetail/index.js` 和 `index/index.js` 新增 `parseCreatedAtTime()` 函数，改用时间戳数值比较排序，替代字符串比较
- **订阅消息授权**：在客户状态变更、开启设计工作流、完成设计节点、工地开工等关键操作前添加 `await requestSubscribe()` 静默请求授权
- **云函数环境**：`sendSubscribeMessage/index.js` 的 `miniprogramState` 从 `'developer'` 改为 `'formal'`
- **待办详情页样式**：修复查看模式下创建日期颜色和字体大小不一致问题
- **权限泄露修复**：待办列表关联客户名称改为批量查询后按权限实时脱敏（`index/index.js:188-247`）
- **待办详情权限**：补充 `manager` 字段的权限判断（`todoForm/index.js:140-150`）
- **密码同步**：小程序修改密码时同时更新 `passwordPlain` 和 `passwordHash`；管理员重置密码时 Web 端 API 同步更新两个字段

---

## v1.0.0（2026-04-17）正式发布

### 核心功能
- **CRM 线索管理**：线索录入、跟进记录、状态流转（待跟进→沟通中→已量房→方案阶段→已交定金→已签单/已流失）、签单功能
- **CRM 客户详情**：设计进度甘特图（设计阶段 Gantt）、文件管理、跟进时间线
- **ERP 项目管理**：8大节点甘特图（开工/水电/木工/瓦工/墙面/定制/软装/交付）、子工序验收、延期记录、节点裁剪
- **报价单**：报价单创建、查看、编辑
- **材料库**：材料录入、查看、编辑
- **待办任务**：创建、分配、完成、关联线索/项目
- **员工管理**：员工增删改查、启用/停用、角色管理
- **通知中心**：消息查看、已读/未读、收藏
- **合同管理**：页面框架（数据为 mock，待后续版本接入真实数据）
- **数据看板**：线索转化率图表、项目状态统计

### 技术架构
- 网页端：Next.js 14 + TypeScript + Tailwind CSS
- 小程序端：微信原生小程序
- 数据库：微信云开发（TCB）云数据库
- 文件存储：微信云开发 COS
- 认证：JWT（网页端）+ 云数据库直查（小程序端）

---

## 技术说明

### 跟进记录时间字段格式

数据库中 `createdAt` 字段存在四种格式混用，所有读取时间的地方必须用 `parseCreatedAtTime()` 函数处理：

| 格式 | 来源 | 示例 |
|------|------|------|
| `{ $date: 毫秒数 }` | Web 端 API 写入 | `{ $date: 1745500000000 }` |
| 纯数字时间戳 | 小程序 `db.serverDate()` 写入后读出 | `1745500000000` |
| 字符串 | 手动写入或 `displayTime` 字段 | `"2026-04-24 14:30"` |
| Date 对象 | 极少数情况 | `new Date(...)` |

### 数据同步机制

**员工姓名修改时同步的字段：**
- `leads`：creatorName, sales, designer, manager, signer
- `projects`：manager, sales, designer, creatorName
- `quotes`：sales, modifier
- `todos`：creatorName, assignees[].name
- `followUps`：createdBy
- `notifications`：senderName, targetUser

**客户信息修改时同步的字段：**
- `quotes`：customer, phone, address, sales, designer, manager, area, budget, requirementType
- `projects`：customer, phone, address, sales, designer
- `todos`：relatedTo.name（仅姓名变化时）
- `notifications`：content（仅姓名变化时）

### 微信订阅消息通知触点

| 触点 | 文件 | 通知对象 |
|------|------|---------|
| 手动添加/编辑跟进记录 | addFollowUp | sales + designer + manager + creatorName + 所有admin |
| 客户状态变更（非签单） | leadDetail | sales + creatorName + 所有admin |
| 客户状态变更→已签单 | leadDetail | 全员广播 |
| 开启设计工作流 | leadDetail | designer + 所有admin |
| 调整设计排期 | leadDetail | sales + creatorName + 所有admin |
| 完成设计节点 | leadDetail | sales + creatorName + 所有admin |
| 工地开工 | projectDetail | manager + sales + designer + creatorName + 所有admin |
| 工序验收 | projectDetail | manager + sales + designer + creatorName + 所有admin |
| 调整施工排期 | projectDetail | manager + sales + designer + creatorName + 所有admin |
| 新建工地 | projects | sales + designer + manager + creatorName + 所有admin |
| 报价操作 | quoteDetail | sales + designer + manager + creatorName + 所有admin |
| 待办完成（关联客户） | index | sales + designer + manager + creatorName + 所有admin |
| 业主验收签字 | projectShare | manager + sales + designer + 所有admin |
| 查看权限申请提交 | projectShare | 工地相关员工 + 所有admin |
| 查看权限审批结果 | shareAccessManage | 申请人（如有订阅） |

**注意**：修改评级、编辑客户资料（leadForm）、客户创建目前只写跟进记录，不发订阅消息通知。

---

## 如何提交版本

```bash
# 1. 确保代码已提交
git add .
git commit -m "feat: 描述本次更新内容"

# 2. 打版本标签
git tag -a v1.1.0 -m "v1.1.0: 客户查看权限申请功能 + 订阅消息通知"

# 3. 推送
git push origin main
git push origin --tags
```

### Commit 消息规范

| 前缀 | 含义 | 示例 |
|------|------|------|
| `feat:` | 新功能 | `feat: 合同模块接入真实数据` |
| `fix:` | Bug 修复 | `fix: 修复员工接口 tcbQuery 未导入` |
| `security:` | 安全修复 | `security: 密码改为 bcrypt 哈希存储` |
| `style:` | UI 样式调整 | `style: 优化移动端线索列表布局` |
| `refactor:` | 代码重构 | `refactor: 提取公共 track 埋点函数` |
| `docs:` | 文档更新 | `docs: 更新版本管理记录` |
