# 系统架构详解

> 本文档深入讲解 CM1.0 系统的技术架构、设计决策、数据流转等核心内容。

---

## 📋 目录

1. [整体架构](#整体架构)
2. [技术栈详解](#技术栈详解)
3. [数据流转](#数据流转)
4. [认证鉴权](#认证鉴权)
5. [文件存储](#文件存储)
6. [双端同步](#双端同步)
7. [性能优化](#性能优化)
8. [安全设计](#安全设计)
9. [扩展性设计](#扩展性设计)

---

## 1. 整体架构

### 1.1 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                           用户层                                 │
├──────────────────────────┬──────────────────────────────────────┤
│   小程序端（员工+业主）    │      Web端（管理员+员工）              │
│   ┌──────────────────┐   │      ┌──────────────────┐            │
│   │  微信原生框架     │   │      │  Next.js 14      │            │
│   │  - WXML/WXSS     │   │      │  - React 18      │            │
│   │  - JavaScript    │   │      │  - TypeScript    │            │
│   │  - 云开发 SDK     │   │      │  - Tailwind CSS  │            │
│   └──────────────────┘   │      └──────────────────┘            │
└──────────┬───────────────┴──────────────┬─────────────────────┘
           │                               │
           │ 云开发 SDK                     │ HTTP API
           │ (直接操作数据库)                │ (通过 API Routes)
           │                               │
           ↓                               ↓
    ┌──────────────────────────────────────────────────────┐
    │              Next.js API Routes (中间层)              │
    │  ┌────────────────────────────────────────────────┐  │
    │  │  /api/leads, /api/projects, /api/quotes, ...  │  │
    │  │  - 请求验证                                     │  │
    │  │  - 数据转换                                     │  │
    │  │  - 调用 TCB HTTP API                           │  │
    │  └────────────────────────────────────────────────┘  │
    └──────────────────────┬───────────────────────────────┘
                           │
                           │ TCB HTTP API
                           │ (签名认证)
                           ↓
    ┌──────────────────────────────────────────────────────┐
    │              微信云开发 TCB (腾讯云)                   │
    ├──────────────┬──────────────┬──────────────┬─────────┤
    │  云数据库     │   云存储      │   云函数      │  其他    │
    │  (NoSQL)     │   (COS)      │  (Node.js)   │         │
    │              │              │              │         │
    │  - users     │  - 工地照片   │  - send      │  - CDN  │
    │  - leads     │  - 报价附件   │    Subscribe │  - 日志  │
    │  - projects  │  - 设计文件   │    Message   │         │
    │  - quotes    │  - 头像图片   │  - getPhone  │         │
    │  - materials │              │    Number    │         │
    │  - ...       │              │  - login     │         │
    └──────────────┴──────────────┴──────────────┴─────────┘
```

### 1.2 架构特点

**无独立后端服务器**
- 小程序端直接操作云数据库（通过云开发 SDK）
- Web 端通过 Next.js API Routes 调用云数据库（通过 TCB HTTP API）
- 优点：开发效率高、运维成本低、自动扩容
- 缺点：业务逻辑分散在前端、安全性依赖数据库权限

**双端共享数据**
- 小程序和 Web 端使用同一个云数据库
- 数据实时同步，无需额外的同步机制
- 优点：数据一致性好、开发简单
- 缺点：需要统一数据格式和字段命名

**云函数处理特殊场景**
- 订阅消息发送（只能在服务端调用）
- 获取用户手机号（需要服务端解密）
- 获取用户 openid（需要服务端调用）

---

## 2. 技术栈详解

### 2.1 小程序端技术栈

**框架：微信原生小程序**

**选择理由**：
- 性能最优：原生框架，无额外编译层
- 功能完整：可以使用所有微信小程序 API
- 云开发集成：与云开发深度集成，开发效率高
- 学习成本：语法简单，类似 Vue

**替代方案**：
- uni-app：跨平台，但性能略差
- Taro：React 语法，但编译后体积大
- mpvue：已停止维护

**核心技术**：
```javascript
// 页面结构：WXML（类似 HTML）
<view class="container">
  <text>{{title}}</text>
</view>

// 样式：WXSS（类似 CSS）
.container {
  padding: 20rpx;
}

// 逻辑：JavaScript
Page({
  data: {
    title: '客户列表'
  },
  onLoad() {
    this.loadData()
  }
})

// 云开发 SDK
const db = wx.cloud.database()
db.collection('leads').get()
```

### 2.2 Web端技术栈

**框架：Next.js 14 (App Router)**

**选择理由**：
- React 生态：组件化开发，生态丰富
- App Router：新一代路由系统，性能更好
- API Routes：内置后端接口，无需独立服务器
- SSR/SSG：服务端渲染，SEO 友好（虽然本项目是内部系统）
- TypeScript：类型安全，减少 bug

**替代方案**：
- Vue + Nuxt：如果更熟悉 Vue
- React + Vite：如果不需要 SSR
- Angular：适合大型企业项目

**核心技术**：
```typescript
// 页面组件：app/leads/page.tsx
'use client'
import { useState, useEffect } from 'react'

export default function LeadsPage() {
  const [leads, setLeads] = useState([])

  useEffect(() => {
    fetch('/api/leads')
      .then(res => res.json())
      .then(data => setLeads(data))
  }, [])

  return <div>...</div>
}

// API 接口：app/api/leads/route.ts
export async function GET() {
  const data = await tcbRequest('DatabaseQuery', {...})
  return Response.json(data)
}
```

**样式：Tailwind CSS**

**选择理由**：
- 原子化 CSS：快速开发，样式一致
- 响应式：内置响应式工具类
- 可定制：可以自定义主题
- 无需写 CSS 文件：减少文件数量

**替代方案**：
- CSS Modules：传统方案，样式隔离
- Styled Components：CSS-in-JS
- Ant Design / Material-UI：组件库（本项目未使用）

### 2.3 数据库：微信云开发 TCB

**类型：NoSQL 文档型数据库**

**选择理由**：
- 与小程序深度集成：小程序端可以直接操作
- 无需运维：自动扩容、自动备份
- 开发效率高：无需写 SQL，使用 JavaScript API
- 成本低：小项目免费或低价套餐即可

**替代方案**：
- MySQL/PostgreSQL：关系型数据库，适合复杂查询
- MongoDB：自建 NoSQL，需要自己运维
- Supabase：开源的 Firebase 替代品

**数据结构**：
```javascript
// 文档型数据库，类似 JSON
{
  "_id": "lead_001",
  "customerName": "张三",
  "phone": "13800138000",
  "status": "待跟进",
  "manager": {
    "_id": "user_001",
    "name": "李四"
  },
  "followUps": [
    {
      "content": "电话沟通",
      "createdAt": { "$date": 1714147200000 }
    }
  ]
}
```

**优点**：
- 灵活：无需预定义表结构
- 嵌套：可以嵌套对象和数组
- 快速：读写速度快

**缺点**：
- 查询限制：单次查询最多 100 条
- 无事务：不支持事务（需要自己保证一致性）
- 无关联查询：需要多次查询拼接数据

### 2.4 文件存储：云存储 (COS)

**用途**：
- 工地照片
- 报价附件
- 设计文件
- 用户头像

**特点**：
- 自动 CDN 加速
- 支持图片处理（缩放、裁剪、水印）
- 按量计费

### 2.5 云函数：Node.js

**用途**：
- 发送订阅消息（`sendSubscribeMessage`）
- 获取用户手机号（`getPhoneNumber`）
- 获取用户 openid（`login`）

**特点**：
- 自动扩容
- 按调用次数计费
- 可以使用 npm 包

---

## 3. 数据流转

### 3.1 小程序端数据流

**读取数据**：
```
用户操作（点击列表）
  ↓
页面 onLoad 钩子
  ↓
调用云数据库 SDK
  db.collection('leads').get()
  ↓
云数据库返回数据
  ↓
setData 更新页面
  ↓
页面渲染
```

**写入数据**：
```
用户操作（提交表单）
  ↓
表单验证
  ↓
调用云数据库 SDK
  db.collection('leads').add({ data: {...} })
  ↓
云数据库写入成功
  ↓
显示成功提示
  ↓
刷新列表
```

**发送订阅消息**：
```
用户操作（工序验收）
  ↓
请求订阅授权
  wx.requestSubscribeMessage()
  ↓
用户授权
  ↓
调用云函数
  wx.cloud.callFunction({
    name: 'sendSubscribeMessage',
    data: {...}
  })
  ↓
云函数调用微信 API 发送消息
  ↓
用户收到订阅消息
```

### 3.2 Web端数据流

**读取数据**：
```
用户操作（打开页面）
  ↓
React useEffect 钩子
  ↓
调用前端 API
  fetch('/api/leads')
  ↓
Next.js API Routes 接收请求
  ↓
调用 TCB HTTP API
  tcbRequest('DatabaseQuery', {...})
  ↓
云数据库返回数据
  ↓
API Routes 返回 JSON
  ↓
前端更新 state
  setLeads(data)
  ↓
页面渲染
```

**写入数据**：
```
用户操作（提交表单）
  ↓
表单验证
  ↓
调用前端 API
  fetch('/api/leads', {
    method: 'POST',
    body: JSON.stringify(data)
  })
  ↓
Next.js API Routes 接收请求
  ↓
数据转换（换行符转义等）
  ↓
调用 TCB HTTP API
  tcbRequest('DatabaseAdd', {...})
  ↓
云数据库写入成功
  ↓
API Routes 返回成功
  ↓
前端显示成功提示
  ↓
刷新列表
```

### 3.3 双端数据同步

**场景**：小程序端添加跟进记录，Web 端实时看到

**实现方式**：
- 两端共享同一个云数据库
- 小程序端写入后，Web 端刷新页面即可看到
- 无需额外的同步机制

**注意事项**：
- 数据格式必须统一（字段名、类型）
- 时间字段格式需要兼容（对象/数字/字符串）
- 换行符需要统一处理（转义）

---

## 4. 认证鉴权

### 4.1 小程序端认证

**登录流程**：
```
1. 用户输入账号密码
   ↓
2. 查询 users 集合
   db.collection('users')
     .where({ account, password })
     .get()
   ↓
3. 验证成功
   ↓
4. 存储用户信息到 Storage
   wx.setStorageSync('pnzj_user', userInfo)
   ↓
5. 跳转到首页
```

**权限控制**：
```javascript
// 页面 onLoad 时检查登录状态
onLoad() {
  const user = wx.getStorageSync('pnzj_user')
  if (!user) {
    wx.redirectTo({ url: '/pages/login/index' })
    return
  }

  // 检查角色权限
  if (user.role !== 'admin') {
    wx.showToast({ title: '无权限访问', icon: 'none' })
    wx.navigateBack()
    return
  }
}
```

**优点**：
- 实现简单
- 无需服务端验证
- 适合内部系统

**缺点**：
- 安全性较低（前端可以绕过）
- 密码明文存储（已决定接受）

### 4.2 Web端认证

**登录流程**：
```
1. 用户输入账号密码
   ↓
2. 调用 /api/auth/login
   ↓
3. 后端查询 users 集合验证
   ↓
4. 验证成功，生成 JWT token
   const token = jwt.sign({ userId, role }, SECRET_KEY)
   ↓
5. 返回 token 给前端
   ↓
6. 前端存储 token 到 localStorage
   localStorage.setItem('pnzj_token', token)
   ↓
7. 跳转到首页
```

**权限控制**：
```typescript
// MainLayout 组件统一拦截
export default function MainLayout({ children }) {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('pnzj_token')
    const user = localStorage.getItem('pnzj_user')

    if (!token || !user) {
      router.push('/login')
      return
    }

    // 检查角色权限
    const userInfo = JSON.parse(user)
    if (pathname === '/analytics' && userInfo.role !== 'admin') {
      router.push('/')
    }
  }, [pathname])

  return <div>{children}</div>
}
```

**API 验证**（部分接口）：
```typescript
// app/api/employees/route.ts
export async function POST(request: Request) {
  const token = request.headers.get('Authorization')

  if (!token) {
    return Response.json({ error: '未登录' }, { status: 401 })
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY)
    // 继续处理请求
  } catch (err) {
    return Response.json({ error: 'Token 无效' }, { status: 401 })
  }
}
```

**优点**：
- 相对安全（token 有过期时间）
- 可以在后端验证权限

**缺点**：
- 实现复杂度略高
- 需要管理 token 过期

### 4.3 密码策略

**当前方案**：明文存储

**理由**：
- 内部系统，用户量小（< 20 人）
- 不涉及敏感数据（客户信息不算特别敏感）
- 简化开发和维护

**风险**：
- 数据库泄露会暴露密码
- 员工离职后密码可能被滥用

**改进方案**（如果需要）：
```javascript
// 使用 bcrypt 加密
const bcrypt = require('bcryptjs')

// 注册时加密
const hashedPassword = await bcrypt.hash(password, 10)
db.collection('users').add({
  account,
  password: hashedPassword
})

// 登录时验证
const user = await db.collection('users').where({ account }).get()
const isValid = await bcrypt.compare(password, user.password)
```

---

## 5. 文件存储

### 5.1 上传流程

**小程序端**：
```javascript
// 选择图片
wx.chooseImage({
  count: 1,
  success: async (res) => {
    const filePath = res.tempFilePaths[0]

    // 上传到云存储
    const cloudPath = `projects/${projectId}/${Date.now()}.jpg`
    const uploadRes = await wx.cloud.uploadFile({
      cloudPath,
      filePath
    })

    const fileID = uploadRes.fileID

    // 保存 fileID 到数据库
    db.collection('projects').doc(projectId).update({
      data: {
        photos: db.command.push(fileID)
      }
    })
  }
})
```

**Web端**：
```typescript
// 选择文件
<input type="file" onChange={handleFileChange} />

async function handleFileChange(e) {
  const file = e.target.files[0]

  // 上传到服务器
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData
  })

  const { url } = await res.json()

  // 保存 URL 到数据库
  await fetch(`/api/projects/${projectId}`, {
    method: 'PUT',
    body: JSON.stringify({
      photos: [...photos, url]
    })
  })
}
```

### 5.2 访问控制

**公开访问**（分享页图片）：
- 云存储权限设置为"所有用户可读"
- 任何人都可以通过 URL 访问

**私有访问**（内部文件）：
- 云存储权限设置为"仅创建者可读"
- 需要通过云函数获取临时 URL

### 5.3 文件命名规范

```
projects/{projectId}/{timestamp}.{ext}
quotes/{quoteId}/{timestamp}.{ext}
designs/{leadId}/{timestamp}.{ext}
avatars/{userId}.{ext}
```

---

## 6. 双端同步

### 6.1 数据一致性

**字段命名统一**：
- 使用驼峰命名：`customerName`, `createdAt`
- 布尔值用 `is` 开头：`isActive`
- 时间字段用 `At` 结尾：`createdAt`, `updatedAt`

**时间格式统一**：
```javascript
// 小程序端写入
createdAt: db.serverDate() // 会变成时间戳

// Web端写入
createdAt: { $date: Date.now() } // 对象格式

// 统一解析
function parseTime(time) {
  if (typeof time === 'number') return time
  if (time?.$date) return time.$date
  if (typeof time === 'string') return new Date(time).getTime()
  return Date.now()
}
```

**换行符处理**：
```javascript
// 写入前转义
const content = formData.content.replace(/\n/g, '\\n')

// 读取后还原
const content = data.content.replace(/\\n/g, '\n')
```

### 6.2 实时同步

**当前方案**：手动刷新

**改进方案**（如果需要）：
- 使用云数据库的实时推送功能
- 使用 WebSocket 推送更新
- 使用轮询定时刷新

---

## 7. 性能优化

### 7.1 小程序端优化

**减少 setData 调用**：
```javascript
// ❌ 不好
this.setData({ name: '张三' })
this.setData({ phone: '138...' })
this.setData({ status: '待跟进' })

// ✅ 好
this.setData({
  name: '张三',
  phone: '138...',
  status: '待跟进'
})
```

**图片懒加载**：
```xml
<image lazy-load="{{true}}" src="{{url}}" />
```

**分页加载**：
```javascript
const PAGE_SIZE = 20
let page = 0

async function loadMore() {
  const res = await db.collection('leads')
    .skip(page * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .get()

  this.setData({
    leads: [...this.data.leads, ...res.data]
  })

  page++
}
```

### 7.2 Web端优化

**使用 Next.js 的 Image 组件**：
```tsx
import Image from 'next/image'

<Image
  src="/photo.jpg"
  width={500}
  height={300}
  alt="工地照片"
/>
```

**代码分割**：
```tsx
import dynamic from 'next/dynamic'

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <p>加载中...</p>
})
```

**缓存 API 响应**：
```typescript
export async function GET() {
  return Response.json(data, {
    headers: {
      'Cache-Control': 'public, max-age=60'
    }
  })
}
```

---

## 8. 安全设计

### 8.1 当前安全措施

**前端权限控制**：
- MainLayout 统一拦截未登录用户
- 根据角色显示/隐藏功能

**数据库权限**：
- 设置为"所有用户可读写"（简化开发）
- 依赖前端权限控制

**API 验证**（部分接口）：
- 验证 JWT token
- 验证用户角色

### 8.2 安全风险

**高风险**：
- 密码明文存储
- 数据库权限过于宽松
- 前端可以绕过权限控制

**中风险**：
- APPID/APPSECRET 硬编码在代码中
- 没有 HTTPS（如果 Web 端部署在 HTTP）

**低风险**：
- 没有防止 XSS 攻击
- 没有防止 CSRF 攻击

### 8.3 改进建议

**如果要提升安全性**：
1. 密码加密（bcrypt）
2. 数据库权限改为"仅创建者可读写" + 云函数验证
3. 所有 API 都验证 token 和权限
4. 敏感信息用环境变量
5. Web 端部署 HTTPS
6. 添加 XSS/CSRF 防护

---

## 9. 扩展性设计

### 9.1 如何扩展到其他行业

**需要修改的部分**：
1. 数据模型（集合结构）
2. 业务流程（状态流转）
3. 页面文案和字段名
4. 权限角色定义

**可以复用的部分**：
1. 整体架构（小程序+Web+云开发）
2. 认证鉴权机制
3. 文件上传逻辑
4. 通知系统
5. 待办系统

### 9.2 如何支持更大规模

**数据库优化**：
- 建立索引（提升查询速度）
- 分表（按时间或业务拆分）
- 使用云函数聚合查询（突破 100 条限制）

**架构升级**：
- 引入独立后端服务器
- 使用关系型数据库（MySQL/PostgreSQL）
- 引入缓存（Redis）
- 引入消息队列（处理异步任务）

**性能优化**：
- CDN 加速静态资源
- 数据库读写分离
- 使用 SSR/SSG 优化首屏加载

---

**最后更新**：2026-04-27
**维护者**：XIN
