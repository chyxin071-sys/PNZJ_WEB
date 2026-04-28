# 06 从0到1实战案例

## 概述

本教程将带你完整体验一个微信小程序从需求分析到上线的全过程。我们会构建一个**待办事项管理小程序**，涵盖前面5个教程中学到的所有知识点。

**项目目标**：开发一个支持多人协作的待办事项管理小程序，用户可以创建、分配、完成待办，并实时接收通知。

**技术栈**：
- 微信小程序原生开发
- 云开发（云数据库 + 云函数 + 云存储）
- 订阅消息通知

**预计开发时间**：3-5天（新手）

---

## 第一步：需求分析

### 1.1 核心功能

**用户端功能**：
1. 用户登录（微信授权）
2. 创建待办（标题、描述、截止日期、优先级）
3. 查看待办列表（全部/待完成/已完成）
4. 编辑待办
5. 完成/删除待办
6. 分配待办给其他用户
7. 接收待办通知（被分配、即将到期）

**数据需求**：
- 用户信息（openid、昵称、头像）
- 待办信息（标题、描述、创建人、执行人、状态、优先级、截止日期）

### 1.2 技术决策

| 需求 | 技术方案 | 理由 |
|------|---------|------|
| 用户身份 | 云开发登录 + openid | 无需自建后端，安全可靠 |
| 数据存储 | 云数据库 | 实时同步，支持复杂查询 |
| 消息通知 | 订阅消息 | 官方推荐，用户体验好 |
| 文件上传 | 云存储 | 待办可附加图片附件 |

### 1.3 数据库设计

**users 集合**（用户表）：
```javascript
{
  _id: "自动生成",
  _openid: "用户openid（云开发自动写入）",
  nickName: "用户昵称",
  avatarUrl: "头像URL",
  createdAt: 1234567890000  // 注册时间戳
}
```

**todos 集合**（待办表）：
```javascript
{
  _id: "自动生成",
  _openid: "创建人openid",
  title: "待办标题",
  description: "详细描述",
  assignee: "执行人openid（可为空）",
  status: "pending | completed",
  priority: "low | medium | high",
  dueDate: 1234567890000,  // 截止时间戳
  attachments: ["cloud://xxx.png"],  // 附件cloudID数组
  createdAt: 1234567890000,
  updatedAt: 1234567890000
}
```

---

## 第二步：项目初始化

### 2.1 创建小程序项目

1. 打开微信开发者工具
2. 新建项目 → 选择"云开发"模板
3. 项目名称：`todo-miniprogram`
4. AppID：使用你的小程序AppID
5. 后端服务：选择"微信云开发"

### 2.2 开通云开发

```javascript
// miniprogram/app.js
App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'your-env-id',  // 替换为你的云环境ID
        traceUser: true,
      })
    }
  }
})
```

### 2.3 创建数据库集合

在云开发控制台 → 数据库 → 添加集合：
- `users`（权限：所有用户可读，仅创建者可写）
- `todos`（权限：所有用户可读，仅创建者可写）

### 2.4 项目目录结构

```
todo-miniprogram/
├── miniprogram/
│   ├── pages/
│   │   ├── index/          # 待办列表页
│   │   ├── create/         # 创建待办页
│   │   ├── detail/         # 待办详情页
│   │   └── login/          # 登录页
│   ├── components/
│   │   ├── todo-item/      # 待办卡片组件
│   │   └── user-picker/    # 用户选择器组件
│   ├── utils/
│   │   ├── util.js         # 工具函数
│   │   └── subscribe.js    # 订阅消息配置
│   ├── app.js
│   ├── app.json
│   └── app.wxss
└── cloudfunctions/
    ├── sendNotification/   # 发送通知云函数
    └── getUserInfo/        # 获取用户信息云函数
```

---

## 第三步：核心功能开发

### 3.1 用户登录

**pages/login/index.wxml**：
```xml
<view class="container">
  <image class="logo" src="/images/logo.png"></image>
  <text class="title">待办事项管理</text>
  <button class="login-btn" open-type="getUserProfile" bindtap="onLogin">
    微信登录
  </button>
</view>
```

**pages/login/index.js**：
```javascript
Page({
  async onLogin() {
    try {
      // 1. 获取用户信息
      const { userInfo } = await wx.getUserProfile({
        desc: '用于完善用户资料'
      })

      // 2. 云开发登录（自动获取openid）
      const { result } = await wx.cloud.callFunction({
        name: 'login'
      })

      // 3. 保存用户信息到数据库
      const db = wx.cloud.database()
      await db.collection('users').add({
        data: {
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl,
          createdAt: Date.now()
        }
      })

      // 4. 保存到本地存储
      wx.setStorageSync('userInfo', {
        ...userInfo,
        openid: result.openid
      })

      // 5. 跳转到首页
      wx.switchTab({ url: '/pages/index/index' })

    } catch (err) {
      wx.showToast({ title: '登录失败', icon: 'none' })
      console.error(err)
    }
  }
})
```

**cloudfunctions/login/index.js**（云函数）：
```javascript
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  return {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
  }
}
```

### 3.2 待办列表页

**pages/index/index.wxml**：
```xml
<view class="container">
  <!-- 筛选器 -->
  <view class="filter-bar">
    <view class="filter-item {{filter === 'all' ? 'active' : ''}}"
          bindtap="onFilterChange" data-filter="all">
      全部
    </view>
    <view class="filter-item {{filter === 'pending' ? 'active' : ''}}"
          bindtap="onFilterChange" data-filter="pending">
      待完成
    </view>
    <view class="filter-item {{filter === 'completed' ? 'active' : ''}}"
          bindtap="onFilterChange" data-filter="completed">
      已完成
    </view>
  </view>

  <!-- 待办列表 -->
  <view class="todo-list">
    <todo-item
      wx:for="{{todos}}"
      wx:key="_id"
      todo="{{item}}"
      bind:complete="onComplete"
      bind:delete="onDelete"
      bind:tap="onTodoTap"
    />
  </view>

  <!-- 空状态 -->
  <view wx:if="{{todos.length === 0}}" class="empty">
    <image src="/images/empty.png"></image>
    <text>暂无待办</text>
  </view>

  <!-- 创建按钮 -->
  <view class="create-btn" bindtap="onCreate">
    <image src="/images/add.png"></image>
  </view>
</view>
```

**pages/index/index.js**：
```javascript
const db = wx.cloud.database()

Page({
  data: {
    filter: 'all',
    todos: []
  },

  onLoad() {
    this.loadTodos()
  },

  async loadTodos() {
    wx.showLoading({ title: '加载中' })

    try {
      const { filter } = this.data
      let query = db.collection('todos')

      // 根据筛选条件查询
      if (filter !== 'all') {
        query = query.where({ status: filter })
      }

      const { data } = await query
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get()

      // 处理时间格式（避免常见坑）
      const todos = data.map(item => ({
        ...item,
        createdAt: this.parseTime(item.createdAt),
        dueDate: this.parseTime(item.dueDate)
      }))

      this.setData({ todos })
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' })
      console.error(err)
    } finally {
      wx.hideLoading()
    }
  },

  // 统一时间解析（避免格式不一致问题）
  parseTime(time) {
    if (typeof time === 'number') return time
    if (time?.$date) return time.$date
    if (typeof time === 'string') return new Date(time).getTime()
    return Date.now()
  },

  onFilterChange(e) {
    const { filter } = e.currentTarget.dataset
    this.setData({ filter })
    this.loadTodos()
  },

  async onComplete(e) {
    const { id } = e.detail
    try {
      await db.collection('todos').doc(id).update({
        data: {
          status: 'completed',
          updatedAt: Date.now()
        }
      })
      wx.showToast({ title: '已完成' })
      this.loadTodos()
    } catch (err) {
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  async onDelete(e) {
    const { id } = e.detail
    const res = await wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复'
    })
    if (!res.confirm) return

    try {
      await db.collection('todos').doc(id).remove()
      wx.showToast({ title: '已删除' })
      this.loadTodos()
    } catch (err) {
      wx.showToast({ title: '删除失败', icon: 'none' })
    }
  },

  onTodoTap(e) {
    const { id } = e.detail
    wx.navigateTo({ url: `/pages/detail/index?id=${id}` })
  },

  onCreate() {
    wx.navigateTo({ url: '/pages/create/index' })
  }
})
```

### 3.3 创建待办页

**pages/create/index.wxml**：
```xml
<view class="container">
  <view class="form">
    <!-- 标题 -->
    <view class="form-item">
      <text class="label">标题</text>
      <input class="input" placeholder="请输入待办标题"
             value="{{title}}" bindinput="onTitleInput" />
    </view>

    <!-- 描述 -->
    <view class="form-item">
      <text class="label">描述</text>
      <textarea class="textarea" placeholder="请输入详细描述"
                value="{{description}}" bindinput="onDescInput" />
    </view>

    <!-- 优先级 -->
    <view class="form-item">
      <text class="label">优先级</text>
      <picker mode="selector" range="{{priorities}}" range-key="label"
              value="{{priorityIndex}}" bindchange="onPriorityChange">
        <view class="picker">{{priorities[priorityIndex].label}}</view>
      </picker>
    </view>

    <!-- 截止日期 -->
    <view class="form-item">
      <text class="label">截止日期</text>
      <picker mode="date" value="{{dueDate}}" bindchange="onDateChange">
        <view class="picker">{{dueDate || '请选择日期'}}</view>
      </picker>
    </view>

    <!-- 执行人 -->
    <view class="form-item">
      <text class="label">执行人</text>
      <user-picker selected="{{assignee}}" bind:change="onAssigneeChange" />
    </view>

    <!-- 附件 -->
    <view class="form-item">
      <text class="label">附件</text>
      <view class="attachments">
        <image wx:for="{{attachments}}" wx:key="*this"
               src="{{item}}" class="attachment" />
        <view class="add-attachment" bindtap="onAddAttachment">
          <image src="/images/add.png"></image>
        </view>
      </view>
    </view>
  </view>

  <!-- 提交按钮 -->
  <button class="submit-btn" bindtap="onSubmit">创建待办</button>
</view>
```

**pages/create/index.js**：
```javascript
const db = wx.cloud.database()

Page({
  data: {
    title: '',
    description: '',
    priorities: [
      { label: '低', value: 'low' },
      { label: '中', value: 'medium' },
      { label: '高', value: 'high' }
    ],
    priorityIndex: 1,
    dueDate: '',
    assignee: null,
    attachments: []
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value })
  },

  onDescInput(e) {
    this.setData({ description: e.detail.value })
  },

  onPriorityChange(e) {
    this.setData({ priorityIndex: e.detail.value })
  },

  onDateChange(e) {
    this.setData({ dueDate: e.detail.value })
  },

  onAssigneeChange(e) {
    this.setData({ assignee: e.detail.user })
  },

  async onAddAttachment() {
    try {
      const { tempFilePaths } = await wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })

      wx.showLoading({ title: '上传中' })

      // 上传到云存储
      const cloudPath = `todos/${Date.now()}-${Math.random().toString(36).slice(2)}.png`
      const { fileID } = await wx.cloud.uploadFile({
        cloudPath,
        filePath: tempFilePaths[0]
      })

      this.setData({
        attachments: [...this.data.attachments, fileID]
      })

      wx.hideLoading()
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '上传失败', icon: 'none' })
    }
  },

  async onSubmit() {
    const { title, description, priorities, priorityIndex, dueDate, assignee, attachments } = this.data

    // 表单验证
    if (!title.trim()) {
      wx.showToast({ title: '请输入标题', icon: 'none' })
      return
    }

    if (!dueDate) {
      wx.showToast({ title: '请选择截止日期', icon: 'none' })
      return
    }

    wx.showLoading({ title: '创建中' })

    try {
      // 创建待办
      const { _id } = await db.collection('todos').add({
        data: {
          title: title.trim(),
          description: description.trim(),
          priority: priorities[priorityIndex].value,
          dueDate: new Date(dueDate).getTime(),
          assignee: assignee?.openid || '',
          status: 'pending',
          attachments,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      })

      // 如果分配了执行人，发送通知
      if (assignee) {
        await wx.cloud.callFunction({
          name: 'sendNotification',
          data: {
            toUser: assignee.openid,
            type: 'todo_assigned',
            todoId: _id,
            title: '新待办分配',
            content: `${title}`
          }
        })
      }

      wx.hideLoading()
      wx.showToast({ title: '创建成功' })

      setTimeout(() => {
        wx.navigateBack()
      }, 1500)

    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '创建失败', icon: 'none' })
      console.error(err)
    }
  }
})
```

### 3.4 待办详情页

**pages/detail/index.wxml**：
```xml
<view class="container">
  <!-- 标题和状态 -->
  <view class="header">
    <text class="title">{{todo.title}}</text>
    <view class="status {{todo.status}}">
      {{todo.status === 'completed' ? '已完成' : '待完成'}}
    </view>
  </view>

  <!-- 详情信息 -->
  <view class="info-card">
    <view class="info-item">
      <text class="label">优先级</text>
      <text class="value priority-{{todo.priority}}">
        {{todo.priority === 'high' ? '高' : todo.priority === 'medium' ? '中' : '低'}}
      </text>
    </view>
    <view class="info-item">
      <text class="label">截止日期</text>
      <text class="value {{isOverdue ? 'overdue' : ''}}">{{dueDateText}}</text>
    </view>
    <view class="info-item">
      <text class="label">执行人</text>
      <text class="value">{{assigneeName || '未分配'}}</text>
    </view>
    <view class="info-item">
      <text class="label">创建时间</text>
      <text class="value">{{createdAtText}}</text>
    </view>
  </view>

  <!-- 描述 -->
  <view class="section" wx:if="{{todo.description}}">
    <text class="section-title">描述</text>
    <text class="description">{{todo.description}}</text>
  </view>

  <!-- 附件 -->
  <view class="section" wx:if="{{todo.attachments.length > 0}}">
    <text class="section-title">附件</text>
    <view class="attachments">
      <image
        wx:for="{{todo.attachments}}"
        wx:key="*this"
        src="{{item}}"
        class="attachment"
        mode="aspectFill"
        bindtap="onPreviewImage"
        data-src="{{item}}"
      />
    </view>
  </view>

  <!-- 操作按钮 -->
  <view class="actions" wx:if="{{!todo.status === 'completed'}}">
    <button class="btn-complete" bindtap="onComplete">标记完成</button>
    <button class="btn-edit" bindtap="onEdit">编辑</button>
    <button class="btn-delete" bindtap="onDelete">删除</button>
  </view>
</view>
```

**pages/detail/index.js**：
```javascript
const db = wx.cloud.database()

Page({
  data: {
    todo: {},
    assigneeName: '',
    dueDateText: '',
    createdAtText: '',
    isOverdue: false
  },

  onLoad(options) {
    this.todoId = options.id
    this.loadTodo()
  },

  async loadTodo() {
    wx.showLoading({ title: '加载中' })
    try {
      const { data } = await db.collection('todos').doc(this.todoId).get()
      const todo = data

      // 处理时间
      const dueDate = this.parseTime(todo.dueDate)
      const createdAt = this.parseTime(todo.createdAt)
      const now = Date.now()

      this.setData({
        todo,
        dueDateText: this.formatDate(dueDate),
        createdAtText: this.formatDate(createdAt),
        isOverdue: dueDate < now && todo.status !== 'completed'
      })

      // 加载执行人名称
      if (todo.assignee) {
        this.loadAssigneeName(todo.assignee)
      }
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  async loadAssigneeName(openid) {
    try {
      const { data } = await db.collection('users')
        .where({ _openid: openid })
        .limit(1)
        .get()
      if (data.length > 0) {
        this.setData({ assigneeName: data[0].nickName })
      }
    } catch (err) {
      console.error('加载执行人失败', err)
    }
  },

  parseTime(time) {
    if (typeof time === 'number') return time
    if (time?.$date) return time.$date
    if (typeof time === 'string') return new Date(time).getTime()
    return Date.now()
  },

  formatDate(timestamp) {
    const d = new Date(timestamp)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  },

  async onComplete() {
    try {
      await db.collection('todos').doc(this.todoId).update({
        data: { status: 'completed', updatedAt: Date.now() }
      })
      wx.showToast({ title: '已完成' })
      this.loadTodo()
    } catch (err) {
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  onEdit() {
    wx.navigateTo({ url: `/pages/create/index?id=${this.todoId}` })
  },

  async onDelete() {
    const res = await wx.showModal({ title: '确认删除', content: '删除后无法恢复' })
    if (!res.confirm) return
    try {
      await db.collection('todos').doc(this.todoId).remove()
      wx.showToast({ title: '已删除' })
      setTimeout(() => wx.navigateBack(), 1500)
    } catch (err) {
      wx.showToast({ title: '删除失败', icon: 'none' })
    }
  },

  onPreviewImage(e) {
    const { src } = e.currentTarget.dataset
    wx.previewImage({
      current: src,
      urls: this.data.todo.attachments
    })
  }
})
```

### 3.5 通知功能

通知功能通过云函数实现，当待办被分配给某人时，发送订阅消息通知对方。

**cloudfunctions/sendNotification/index.js**：
```javascript
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const { toUser, type, todoId, title, content } = event

  // 订阅消息模板ID（在微信公众平台申请）
  const TEMPLATE_IDS = {
    todo_assigned: 'your-template-id-here'
  }

  try {
    const result = await cloud.openapi.subscribeMessage.send({
      touser: toUser,
      templateId: TEMPLATE_IDS[type],
      page: `pages/detail/index?id=${todoId}`,
      miniprogramState: 'formal',
      data: {
        thing1: { value: title },    // 待办标题
        thing2: { value: content },  // 内容描述
        time3: { value: new Date().toLocaleString('zh-CN') }  // 时间
      }
    })
    return { success: true, result }
  } catch (err) {
    console.error('发送通知失败', err)
    return { success: false, error: err.message }
  }
}
```

**在创建待办时请求订阅授权**（pages/create/index.js 补充）：
```javascript
// 在 onSubmit 前先请求订阅授权
async requestSubscribe() {
  try {
    await wx.requestSubscribeMessage({
      tmplIds: ['your-template-id-here']
    })
  } catch (err) {
    // 用户拒绝授权，不影响主流程
    console.log('订阅授权被拒绝')
  }
},

async onSubmit() {
  // 先请求订阅授权
  await this.requestSubscribe()

  // ... 后续创建待办的代码不变
}
```

---

## 第四步：测试上线

### 4.1 功能测试

在微信开发者工具中，按以下清单逐项测试：

**登录功能**：
```
□ 点击登录按钮，弹出授权弹窗
□ 授权后跳转到首页
□ 用户信息正确显示
□ 重新打开小程序，不需要重新登录
```

**待办列表**：
```
□ 列表正常加载
□ 筛选器切换正常（全部/待完成/已完成）
□ 列表按创建时间倒序显示
□ 空状态显示正常
□ 下拉刷新正常
```

**创建待办**：
```
□ 表单验证正常（标题必填、日期必选）
□ 优先级选择正常
□ 截止日期选择正常
□ 执行人选择正常
□ 图片上传正常
□ 创建成功后返回列表
□ 分配执行人后，对方收到通知
```

**待办详情**：
```
□ 详情信息正确显示
□ 过期待办显示红色日期
□ 图片预览正常
□ 标记完成正常
□ 编辑功能正常
□ 删除功能正常
```

### 4.2 常见测试问题

**问题1：订阅消息收不到**

原因和解决方案：
```
1. 检查模板ID是否正确
   → 在微信公众平台 → 订阅消息 → 查看模板ID

2. 检查 miniprogramState 是否正确
   → 开发版用 'developer'，正式版用 'formal'

3. 检查用户是否授权
   → 用户必须先点击授权，才能收到消息

4. 检查云函数是否部署
   → 在开发者工具 → 云函数 → 右键上传并部署
```

**问题2：图片显示不出来**

```
1. 检查 fileID 格式是否正确
   → 应该是 cloud://xxx 格式

2. 检查云存储权限
   → 在云开发控制台 → 存储 → 权限设置

3. 检查 image 组件的 src 属性
   → 直接用 fileID，不需要转换
```

**问题3：数据库查询为空**

```
1. 检查集合名称是否正确（大小写敏感）
2. 检查权限配置（是否允许读取）
3. 检查查询条件是否过滤掉了所有数据
4. 在云开发控制台直接查看数据库确认数据存在
```

### 4.3 提交审核

**审核前检查清单**：
```
□ 删除所有 console.log 调试代码
□ 删除所有测试用的 Mock 数据
□ 检查所有功能在真机上正常运行
□ 检查小程序名称、图标、描述是否填写
□ 检查隐私政策是否配置
□ 检查是否有违规内容（赌博、色情等）
□ 检查是否使用了未申请的权限
```

**提交步骤**：
1. 开发者工具 → 上传代码（填写版本号和备注）
2. 微信公众平台 → 版本管理 → 提交审核
3. 填写审核信息（功能描述、测试账号等）
4. 等待审核（通常 1-3 个工作日）

**常见审核被拒原因**：
```
❌ 功能描述与实际不符
❌ 没有配置隐私政策
❌ 使用了未申请的权限（如获取手机号）
❌ 页面有明显 Bug 或白屏
❌ 涉及支付但没有资质
```

### 4.4 发布上线

审核通过后：
1. 微信公众平台 → 版本管理 → 审核版本 → 发布
2. 选择发布范围（全量发布 or 灰度发布）
3. 确认发布

**灰度发布建议**：
- 第一次上线建议先灰度 10%，观察 1 天
- 没有问题再全量发布
- 如果有严重问题，可以回退到上一个版本

---

## 第五步：经验总结

### 5.1 开发过程中遇到的问题

#### 问题1：时间字段格式不统一

**现象**：待办列表排序混乱，时间显示异常

**原因**：
- 云数据库写入时间有多种格式
- `db.serverDate()` 写入后读出是 `{ $date: 毫秒 }` 对象
- `Date.now()` 写入是纯数字
- 直接写字符串是字符串

**解决方案**：
```javascript
// 统一的时间解析函数
parseTime(time) {
  if (typeof time === 'number') return time
  if (time?.$date) return time.$date
  if (typeof time === 'string') return new Date(time).getTime()
  return Date.now()
}

// 排序时用时间戳比较，不要用字符串比较
todos.sort((a, b) => parseTime(b.createdAt) - parseTime(a.createdAt))
```

**教训**：写入时间时，统一用 `Date.now()` 存纯数字时间戳，避免格式混乱。

#### 问题2：数据库权限配置错误

**现象**：用户 A 无法查看用户 B 创建的待办

**原因**：集合权限设置为"仅创建者可读写"，导致其他用户看不到

**解决方案**：
- 根据业务需求调整权限
- 协作类应用通常需要"所有用户可读，仅创建者可写"
- 或者通过云函数绕过权限限制

#### 问题3：订阅消息发送失败

**现象**：云函数报错，消息发不出去

**原因**：`miniprogramState` 设置为 `'developer'`，但用户用的是正式版

**解决方案**：
```javascript
// 开发测试时
miniprogramState: 'developer'

// 正式上线后
miniprogramState: 'formal'
```

**教训**：上线前一定要把 `miniprogramState` 改为 `'formal'`。

#### 问题4：图片上传路径冲突

**现象**：不同用户上传同名图片，互相覆盖

**原因**：云存储路径没有加用户标识

**解决方案**：
```javascript
// ❌ 容易冲突
const cloudPath = `todos/image.png`

// ✅ 加时间戳和随机数，避免冲突
const cloudPath = `todos/${Date.now()}-${Math.random().toString(36).slice(2)}.png`
```

### 5.2 性能优化经验

#### 优化1：减少 setData 调用

```javascript
// ❌ 多次 setData
this.setData({ loading: true })
this.setData({ todos: data })
this.setData({ loading: false })

// ✅ 合并成一次
this.setData({ loading: false, todos: data })
```

#### 优化2：图片压缩

```javascript
// 上传前压缩图片
const { tempFilePaths } = await wx.chooseImage({
  count: 1,
  sizeType: ['compressed'],  // 压缩图，不要用 original
  sourceType: ['album', 'camera']
})
```

#### 优化3：分页加载

```javascript
// 不要一次性加载所有数据
const { data } = await db.collection('todos')
  .orderBy('createdAt', 'desc')
  .skip(this.data.page * 20)  // 跳过已加载的
  .limit(20)                   // 每次只加载20条
  .get()
```

### 5.3 经验教训

1. **先设计，再开发**：花时间设计数据库结构，后期改起来很麻烦
2. **及时测试**：每完成一个功能就测试，不要等全部做完再测
3. **用 Git 管理代码**：每完成一个功能就提交，方便回退
4. **记录踩过的坑**：写到文档里，避免重复踩
5. **上线前全面检查**：删除调试代码、测试数据，检查所有功能

### 5.4 改进建议

如果要继续完善这个待办小程序，可以考虑：

**功能扩展**：
- 待办分组（按项目/标签分类）
- 重复待办（每天/每周自动创建）
- 评论功能（在待办下面讨论）
- 统计报表（完成率、逾期率）

**体验优化**：
- 支持拖拽排序
- 支持批量操作（批量完成/删除）
- 添加搜索功能
- 支持离线使用

**技术优化**：
- 使用实时数据库监听（`watch`），数据变化自动刷新
- 添加本地缓存，减少网络请求
- 图片懒加载

---

## 总结

通过这个待办事项小程序，我们完整走了一遍从需求到上线的全流程：

✅ **需求分析**：明确功能、技术选型、数据库设计
✅ **项目初始化**：创建项目、开通云开发、搭建目录结构
✅ **核心功能开发**：登录、列表、创建、详情、通知
✅ **测试上线**：功能测试、提交审核、发布上线
✅ **经验总结**：踩坑记录、性能优化、改进建议

这个项目涵盖了微信小程序开发的核心知识点，掌握了这些，你就可以开发大多数中小型小程序了。

**下一步建议**：
- 在自己的项目中实践这些知识
- 遇到问题查 [常见坑与解决方案](./03_COMMON_PITFALLS.md)
- 用 AI 辅助开发，参考 [AI 辅助开发指南](./05_AI_ASSISTED_DEVELOPMENT.md)

---

**最后更新**：2026-04-28
**维护者**：开源社区
