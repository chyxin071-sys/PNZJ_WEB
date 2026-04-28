# 最佳实践指南

> 本指南总结了微信小程序开发的最佳实践，帮助你写出高质量、易维护的代码。

---

## 第一部分：代码规范

### 1.1 命名规范

#### 文件命名

```
✅ 好的命名：
pages/
├── index/
│   ├── index.js
│   ├── index.wxml
│   ├── index.wxss
│   └── index.json
├── user-profile/
│   └── ...
└── product-list/
    └── ...

❌ 不好的命名：
pages/
├── page1/          # 不清楚是什么页面
├── UserProfile/    # 不要用大驼峰
└── product_list/   # 不要用下划线
```

#### 变量命名

```javascript
// ✅ 好的命名
const userName = '张三'           // 小驼峰
const MAX_COUNT = 100            // 常量用大写
const isLoading = false          // 布尔值用 is/has 开头
const hasPermission = true

// ❌ 不好的命名
const name = '张三'               // 太简单
const UserName = '张三'           // 不要用大驼峰
const user_name = '张三'          // 不要用下划线
const loading = false            // 布尔值不清晰
```

#### 函数命名

```javascript
// ✅ 好的命名
function getUserInfo() {}        // 动词开头
function handleClick() {}        // 事件处理用 handle
function onLoad() {}             // 生命周期用 on
function formatTime() {}         // 工具函数用动词

// ❌ 不好的命名
function user() {}               // 不清楚做什么
function click() {}              // 太简单
function time() {}               // 不是动词
```

#### 数据库字段命名

```javascript
// ✅ 好的命名
{
  "userName": "张三",            // 小驼峰
  "createdAt": 1714147200000,   // 时间用 At 结尾
  "isActive": true,             // 布尔值用 is 开头
  "phoneNumber": "138..."       // 完整单词
}

// ❌ 不好的命名
{
  "user_name": "张三",          // 不要用下划线
  "create_time": 1714147200000, // 不要用下划线
  "active": true,               // 布尔值不清晰
  "phone": "138..."             // 太简单
}
```

### 1.2 文件组织

#### 目录结构

```
mini-program/
├── pages/              # 页面
│   ├── index/         # 首页
│   ├── user/          # 用户相关
│   └── product/       # 商品相关
├── components/         # 组件
│   ├── user-card/     # 用户卡片
│   └── product-item/  # 商品项
├── utils/             # 工具函数
│   ├── format.js      # 格式化
│   ├── request.js     # 请求封装
│   └── date.js        # 日期处理
├── images/            # 图片资源
├── styles/            # 公共样式
├── cloudfunctions/    # 云函数
├── app.js
├── app.json
└── app.wxss
```

#### 页面文件组织

```javascript
// pages/index/index.js

// 1. 引入依赖
const db = wx.cloud.database()
const { formatTime } = require('../../utils/format')

// 2. 页面配置
Page({
  // 3. 页面数据
  data: {
    list: [],
    loading: false
  },

  // 4. 生命周期
  onLoad(options) {},
  onShow() {},
  onHide() {},

  // 5. 数据加载
  async loadData() {},

  // 6. 事件处理
  handleClick() {},
  handleInput() {},

  // 7. 工具函数（私有方法用 _ 开头）
  _formatData(data) {},
  _validateForm() {}
})
```

### 1.3 注释规范

#### 文件注释

```javascript
/**
 * 用户列表页
 * @description 显示所有用户列表，支持搜索和筛选
 * @author 张三
 * @date 2026-04-27
 */
```

#### 函数注释

```javascript
/**
 * 获取用户列表
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @returns {Promise<Array>} 用户列表
 */
async function getUserList(page, pageSize) {
  // 实现...
}
```

#### 代码注释

```javascript
// ✅ 好的注释：解释为什么这样做
// 使用时间戳排序，因为 createdAt 字段格式不统一
data.sort((a, b) => parseTime(b.createdAt) - parseTime(a.createdAt))

// ❌ 不好的注释：重复代码
// 对数据进行排序
data.sort((a, b) => b.createdAt - a.createdAt)
```

### 1.4 代码格式化

#### 使用工具

```bash
# 安装 Prettier
npm install --save-dev prettier

# 创建配置文件 .prettierrc
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "none"
}

# 格式化代码
npx prettier --write "**/*.js"
```

#### 统一风格

```javascript
// ✅ 统一使用单引号
const name = '张三'

// ✅ 统一缩进（2空格或4空格）
function test() {
  if (true) {
    console.log('test')
  }
}

// ✅ 统一换行
const obj = {
  name: '张三',
  age: 25
}
```

---

## 第二部分：数据库设计

### 2.1 集合设计原则

#### 原则1：合理命名

```javascript
// ✅ 好的命名
users          // 用户
products       // 商品
orders         // 订单
categories     // 分类

// ❌ 不好的命名
user           // 单数
User           // 大写
user_list      // 下划线
```

#### 原则2：避免过度拆分

```javascript
// ❌ 过度拆分
users          // 用户基本信息
user_profiles  // 用户详细信息
user_settings  // 用户设置

// ✅ 合理设计
users {
  _id,
  name,
  age,
  profile: {    // 嵌套对象
    bio,
    avatar
  },
  settings: {   // 嵌套对象
    theme,
    language
  }
}
```

#### 原则3：适当冗余

```javascript
// ✅ 适当冗余，提高查询效率
orders {
  _id,
  userId,
  userName,      // 冗余用户名，避免关联查询
  productId,
  productName,   // 冗余商品名
  amount
}

// ❌ 完全规范化，但查询慢
orders {
  _id,
  userId,        // 需要关联 users 表
  productId,     // 需要关联 products 表
  amount
}
```

### 2.2 字段命名规范

#### 基本规范

```javascript
{
  // 字符串：小驼峰
  "userName": "张三",
  "phoneNumber": "138...",

  // 数字：小驼峰
  "age": 25,
  "totalAmount": 1000,

  // 布尔值：is/has 开头
  "isActive": true,
  "hasPermission": false,

  // 时间：At 结尾
  "createdAt": { "$date": 1714147200000 },
  "updatedAt": { "$date": 1714147200000 },

  // 日期：Date 结尾
  "birthDate": "1990-01-01",
  "startDate": "2026-04-27"
}
```

#### 特殊字段

```javascript
{
  // ID 字段
  "_id": "user_001",           // 主键
  "userId": "user_001",        // 外键

  // 状态字段
  "status": "active",          // 枚举值用字符串
  "orderStatus": "pending",

  // 数组字段
  "tags": ["学生", "程序员"],
  "images": ["url1", "url2"],

  // 对象字段
  "address": {
    "province": "北京",
    "city": "北京市"
  }
}
```

### 2.3 索引设计

#### 何时需要索引

```javascript
// ✅ 需要索引的字段
- 经常用于查询条件的字段（如 status）
- 经常用于排序的字段（如 createdAt）
- 经常用于关联的字段（如 userId）

// ❌ 不需要索引的字段
- 很少查询的字段
- 数据量很小的集合（< 1000条）
- 字段值重复率很高的字段
```

#### 创建索引

```javascript
// 在云开发控制台创建
// 数据库 → 选择集合 → 索引管理 → 添加索引

// 单字段索引
{ "status": 1 }           // 升序
{ "createdAt": -1 }       // 降序

// 复合索引
{ "status": 1, "createdAt": -1 }

// 唯一索引
{ "account": 1 }  // 设置为唯一
```

### 2.4 数据冗余策略

#### 何时冗余

```javascript
// ✅ 适合冗余的场景
1. 经常一起查询的数据
2. 不经常变化的数据
3. 关联查询性能差的数据

// 示例：订单中冗余商品信息
orders {
  productId: "p001",
  productName: "iPhone",     // 冗余
  productPrice: 5999,        // 冗余
  productImage: "url"        // 冗余
}
```

#### 何时不冗余

```javascript
// ❌ 不适合冗余的场景
1. 经常变化的数据
2. 数据量很大的数据
3. 需要保持强一致性的数据

// 示例：不要冗余库存数量
orders {
  productId: "p001",
  stock: 100              // ❌ 不要冗余，库存经常变化
}
```

---

## 第三部分：组件化开发

### 3.1 组件拆分原则

#### 原则1：单一职责

```javascript
// ✅ 好的拆分
<user-card user="{{user}}" />           // 只负责显示用户卡片
<product-item product="{{product}}" />  // 只负责显示商品项

// ❌ 不好的拆分
<complex-component />  // 包含太多功能
```

#### 原则2：可复用

```javascript
// ✅ 可复用的组件
<button-primary text="提交" bindtap="handleSubmit" />
<button-primary text="取消" bindtap="handleCancel" />

// ❌ 不可复用的组件
<submit-button />  // 只能用于提交
```

#### 原则3：低耦合

```javascript
// ✅ 低耦合：通过属性传递数据
<user-card user="{{user}}" />

// ❌ 高耦合：组件内部直接访问全局数据
Component({
  attached() {
    const app = getApp()
    const user = app.globalData.user  // 耦合度高
  }
})
```

### 3.2 组件通信

#### 父传子：属性

```javascript
// 父组件
<user-card user="{{user}}" />

// 子组件
Component({
  properties: {
    user: {
      type: Object,
      value: {}
    }
  }
})
```

#### 子传父：事件

```javascript
// 子组件
Component({
  methods: {
    handleClick() {
      this.triggerEvent('itemclick', { id: 123 })
    }
  }
})

// 父组件
<user-card bind:itemclick="onItemClick" />

onItemClick(e) {
  console.log(e.detail.id)  // 123
}
```

#### 兄弟组件：事件总线

```javascript
// utils/event-bus.js
class EventBus {
  constructor() {
    this.events = {}
  }

  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = []
    }
    this.events[event].push(callback)
  }

  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback(data))
    }
  }

  off(event, callback) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(cb => cb !== callback)
    }
  }
}

module.exports = new EventBus()
```

```javascript
// 组件A
const eventBus = require('../../utils/event-bus')

Component({
  methods: {
    handleClick() {
      eventBus.emit('dataChanged', { id: 123 })
    }
  }
})

// 组件B
const eventBus = require('../../utils/event-bus')

Component({
  attached() {
    eventBus.on('dataChanged', this.onDataChanged)
  },

  detached() {
    eventBus.off('dataChanged', this.onDataChanged)
  },

  onDataChanged(data) {
    console.log(data.id)  // 123
  }
})
```

### 3.3 组件复用

#### 创建通用组件

```javascript
// components/button-primary/index.js
Component({
  properties: {
    text: {
      type: String,
      value: '按钮'
    },
    type: {
      type: String,
      value: 'primary'  // primary | default | warn
    },
    disabled: {
      type: Boolean,
      value: false
    },
    loading: {
      type: Boolean,
      value: false
    }
  },

  methods: {
    handleClick() {
      if (!this.data.disabled && !this.data.loading) {
        this.triggerEvent('click')
      }
    }
  }
})
```

```xml
<!-- components/button-primary/index.wxml -->
<button
  class="btn btn-{{type}}"
  disabled="{{disabled || loading}}"
  bindtap="handleClick"
>
  <text wx:if="{{loading}}">加载中...</text>
  <text wx:else>{{text}}</text>
</button>
```

#### 使用组件

```json
// page.json
{
  "usingComponents": {
    "button-primary": "/components/button-primary/index"
  }
}
```

```xml
<!-- page.wxml -->
<button-primary
  text="提交"
  type="primary"
  loading="{{loading}}"
  bind:click="handleSubmit"
/>
```

### 3.4 自定义组件

#### 完整示例

```javascript
// components/user-card/index.js
Component({
  // 组件属性
  properties: {
    user: {
      type: Object,
      value: {},
      observer(newVal, oldVal) {
        // 属性变化时触发
        console.log('user changed', newVal)
      }
    }
  },

  // 组件数据
  data: {
    isExpanded: false
  },

  // 生命周期
  lifetimes: {
    attached() {
      console.log('组件挂载')
    },
    detached() {
      console.log('组件卸载')
    }
  },

  // 方法
  methods: {
    handleClick() {
      this.setData({
        isExpanded: !this.data.isExpanded
      })
      this.triggerEvent('click', { user: this.data.user })
    }
  }
})
```

---

## 第四部分：性能优化

### 4.1 减少 setData 调用

#### 问题代码

```javascript
// ❌ 频繁调用 setData
for (let i = 0; i < 100; i++) {
  this.setData({
    [`items[${i}]`]: data[i]
  })
}
```

#### 优化方案

```javascript
// ✅ 批量更新
const items = []
for (let i = 0; i < 100; i++) {
  items.push(data[i])
}
this.setData({ items })
```

#### 只更新变化的数据

```javascript
// ❌ 更新整个对象
this.setData({
  user: {
    name: '张三',
    age: 25,
    city: '北京'
  }
})

// ✅ 只更新变化的字段
this.setData({
  'user.name': '张三'
})
```

### 4.2 图片优化

#### 压缩图片

```javascript
// 上传前压缩
wx.compressImage({
  src: filePath,
  quality: 80,  // 压缩质量 0-100
  success: res => {
    // 上传压缩后的图片
    wx.cloud.uploadFile({
      cloudPath: `images/${Date.now()}.jpg`,
      filePath: res.tempFilePath
    })
  }
})
```

#### 使用缩略图

```javascript
// 列表页用缩略图
const thumbnailUrl = `${fileID}?imageMogr2/thumbnail/200x200`

// 详情页用原图
const originalUrl = fileID
```

#### 懒加载

```xml
<image lazy-load="{{true}}" src="{{url}}" />
```

### 4.3 分页加载

#### 完整示例

```javascript
Page({
  data: {
    list: [],
    page: 0,
    pageSize: 20,
    hasMore: true,
    loading: false
  },

  onLoad() {
    this.loadMore()
  },

  async loadMore() {
    if (this.data.loading || !this.data.hasMore) {
      return
    }

    this.setData({ loading: true })

    try {
      const { page, pageSize } = this.data
      const res = await db.collection('products')
        .skip(page * pageSize)
        .limit(pageSize)
        .get()

      this.setData({
        list: [...this.data.list, ...res.data],
        page: page + 1,
        hasMore: res.data.length === pageSize,
        loading: false
      })
    } catch (err) {
      console.error(err)
      this.setData({ loading: false })
    }
  },

  onReachBottom() {
    this.loadMore()
  }
})
```

### 4.4 懒加载

#### 图片懒加载

```xml
<scroll-view scroll-y="{{true}}">
  <image
    wx:for="{{images}}"
    wx:key="index"
    lazy-load="{{true}}"
    src="{{item}}"
  />
</scroll-view>
```

#### 组件懒加载

```javascript
// 使用 wx:if 延迟渲染
<view wx:if="{{showComponent}}">
  <heavy-component />
</view>

// 滚动到可视区域时再渲染
onPageScroll(e) {
  if (e.scrollTop > 500 && !this.data.showComponent) {
    this.setData({ showComponent: true })
  }
}
```

---

## 第五部分：安全建议

### 5.1 敏感信息保护

#### 不要硬编码密钥

```javascript
// ❌ 不要这样做
const APPID = 'wx1234567890'
const APPSECRET = 'abcdefghijklmnopqrstuvwxyz'

// ✅ 使用环境变量
// 在云函数中配置环境变量
const APPID = process.env.APPID
const APPSECRET = process.env.APPSECRET
```

#### 数据脱敏

```javascript
// 手机号脱敏
function maskPhone(phone) {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}
// 13800138000 → 138****8000

// 身份证脱敏
function maskIdCard(idCard) {
  return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2')
}
// 110101199001011234 → 110101********1234
```

### 5.2 数据验证

#### 前端验证

```javascript
// 表单验证
function validateForm(data) {
  // 必填项
  if (!data.name) {
    wx.showToast({ title: '请输入姓名', icon: 'none' })
    return false
  }

  // 手机号格式
  if (!/^1[3-9]\d{9}$/.test(data.phone)) {
    wx.showToast({ title: '手机号格式错误', icon: 'none' })
    return false
  }

  // 邮箱格式
  if (data.email && !/^[\w-]+(\.[\w-]+)*@[\w-]+(\.[\w-]+)+$/.test(data.email)) {
    wx.showToast({ title: '邮箱格式错误', icon: 'none' })
    return false
  }

  return true
}
```

#### 后端验证（云函数）

```javascript
// 云函数中也要验证
exports.main = async (event) => {
  const { name, phone } = event

  // 验证必填项
  if (!name || !phone) {
    return { error: '参数不完整' }
  }

  // 验证格式
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    return { error: '手机号格式错误' }
  }

  // 继续处理...
}
```

### 5.3 权限控制

#### 数据库权限

```javascript
// 使用云函数 + 权限校验
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()

  // 查询用户角色
  const user = await db.collection('users')
    .where({ _openid: OPENID })
    .get()

  // 检查权限
  if (!user.data[0] || user.data[0].role !== 'admin') {
    return { error: '权限不足' }
  }

  // 执行操作
  return await db.collection('sensitive_data').get()
}
```

#### 页面权限

```javascript
// 页面加载时检查权限
Page({
  onLoad() {
    const user = wx.getStorageSync('user')

    if (!user || user.role !== 'admin') {
      wx.showToast({
        title: '无权限访问',
        icon: 'none'
      })
      wx.navigateBack()
    }
  }
})
```

### 5.4 防止XSS攻击

#### 转义用户输入

```javascript
// 转义 HTML 特殊字符
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, m => map[m])
}

// 使用
const userInput = '<script>alert("XSS")</script>'
const safeText = escapeHtml(userInput)
// &lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;
```

---

## 第六部分：用户体验

### 6.1 加载状态提示

```javascript
// 显示加载提示
wx.showLoading({ title: '加载中...' })

try {
  const res = await db.collection('products').get()
  // 处理数据...
} catch (err) {
  wx.showToast({ title: '加载失败', icon: 'none' })
} finally {
  wx.hideLoading()
}
```

### 6.2 错误提示

```javascript
// 友好的错误提示
try {
  await submitForm()
} catch (err) {
  // ❌ 不友好
  wx.showToast({ title: err.message, icon: 'none' })

  // ✅ 友好
  wx.showToast({
    title: '提交失败，请稍后重试',
    icon: 'none'
  })
  console.error('提交失败', err)
}
```

### 6.3 空状态设计

```xml
<!-- 列表为空时的提示 -->
<view wx:if="{{list.length === 0}}" class="empty-state">
  <image src="/images/empty.png" class="empty-image" />
  <text class="empty-text">暂无数据</text>
  <button bindtap="handleRefresh">刷新</button>
</view>

<view wx:else>
  <!-- 列表内容 -->
</view>
```

### 6.4 交互反馈

```javascript
// 操作成功提示
wx.showToast({
  title: '保存成功',
  icon: 'success'
})

// 操作失败提示
wx.showToast({
  title: '保存失败',
  icon: 'none'
})

// 确认对话框
wx.showModal({
  title: '提示',
  content: '确定要删除吗？',
  success: res => {
    if (res.confirm) {
      // 用户点击确定
    }
  }
})
```

---

## 总结

本指南总结了最佳实践：

✅ 代码规范（命名、文件组织、注释、格式化）
✅ 数据库设计（集合设计、字段命名、索引、冗余策略）
✅ 组件化开发（拆分原则、组件通信、复用、自定义组件）
✅ 性能优化（setData、图片、分页、懒加载）
✅ 安全建议（敏感信息、数据验证、权限控制、防XSS）
✅ 用户体验（加载提示、错误提示、空状态、交互反馈）

**下一步**：
- 学习 [AI辅助开发指南](./05_AI_ASSISTED_DEVELOPMENT.md)
- 了解如何用AI提高开发效率

---

**最后更新**：2026-04-27
**维护者**：开源社区
