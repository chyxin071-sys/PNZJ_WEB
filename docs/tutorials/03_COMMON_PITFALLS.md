# 常见坑与解决方案

> 本指南总结了微信小程序开发中最常见的坑，以及详细的解决方案。这些都是从真实项目中提取的经验。

---

## 第一部分：数据格式问题

### 1.1 时间字段格式不统一

#### 问题现象

```javascript
// 小程序端写入
db.collection('records').add({
  data: {
    createdAt: db.serverDate()  // 写入后变成时间戳
  }
})

// Web端写入
db.collection('records').add({
  data: {
    createdAt: { $date: Date.now() }  // 对象格式
  }
})

// 手动写入
db.collection('records').add({
  data: {
    createdAt: '2026-04-27'  // 字符串格式
  }
})

// 结果：数据库中有三种格式
// 1. 纯数字：1714147200000
// 2. 对象：{ "$date": 1714147200000 }
// 3. 字符串："2026-04-27"
```

#### 导致的问题

```javascript
// 排序失败
data.sort((a, b) => {
  return String(b.createdAt) - String(a.createdAt)
  // "[object Object]" - "[object Object]" = NaN
})

// 显示错误
<view>{{createdAt}}</view>
// 显示：[object Object]
```

#### 解决方案

**方案1：统一解析函数**

```javascript
// 创建统一的时间解析函数
function parseTime(time) {
  // 处理数字
  if (typeof time === 'number') {
    return time
  }

  // 处理对象 { $date: 毫秒 }
  if (time && typeof time === 'object' && time.$date) {
    return time.$date
  }

  // 处理字符串
  if (typeof time === 'string') {
    return new Date(time).getTime()
  }

  // 处理 Date 对象
  if (time instanceof Date) {
    return time.getTime()
  }

  // 默认返回当前时间
  return Date.now()
}

// 使用
const timestamp = parseTime(data.createdAt)
const date = new Date(timestamp)
console.log(date.toLocaleString())
```

**方案2：排序时使用**

```javascript
// 正确的排序方式
data.sort((a, b) => {
  return parseTime(b.createdAt) - parseTime(a.createdAt)
})
```

**方案3：显示时使用**

```javascript
// 在 js 中格式化
Page({
  data: {
    records: []
  },

  onLoad() {
    db.collection('records').get().then(res => {
      const records = res.data.map(item => ({
        ...item,
        createdAtText: this.formatTime(item.createdAt)
      }))
      this.setData({ records })
    })
  },

  formatTime(time) {
    const timestamp = parseTime(time)
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN')
  }
})
```

#### 最佳实践

```javascript
// 写入时统一格式
db.collection('records').add({
  data: {
    createdAt: { $date: Date.now() }  // 统一用对象格式
  }
})

// 或者统一用时间戳
db.collection('records').add({
  data: {
    createdAt: Date.now()  // 统一用时间戳
  }
})
```

### 1.2 换行符显示问题

#### 问题现象

```javascript
// 用户输入的内容包含换行
const content = `第一行
第二行
第三行`

// 保存到数据库
db.collection('notes').add({
  data: { content }
})

// 从数据库读取后显示
<view>{{content}}</view>
// 结果：第一行\n第二行\n第三行（换行符显示为 \n）
```

#### 原因分析

- 数据库存储时，换行符 `\n` 被转义成了 `\\n`
- 读取时需要还原

#### 解决方案

**方案1：写入前转义**

```javascript
// 写入前转义
const content = formData.content.replace(/\n/g, '\\n')

db.collection('notes').add({
  data: { content }
})
```

**方案2：读取后还原**

```javascript
// 读取后还原
db.collection('notes').get().then(res => {
  const notes = res.data.map(item => ({
    ...item,
    content: item.content.replace(/\\n/g, '\n')
  }))
  this.setData({ notes })
})
```

**方案3：显示时处理**

```xml
<!-- 使用 white-space: pre-wrap 保留换行 -->
<view style="white-space: pre-wrap;">{{content}}</view>
```

```css
/* 或者在 wxss 中定义 */
.content {
  white-space: pre-wrap;
  word-break: break-all;
}
```

#### 最佳实践

```javascript
// 封装成工具函数
// utils/format.js
export function escapeNewline(text) {
  return text.replace(/\n/g, '\\n')
}

export function unescapeNewline(text) {
  return text.replace(/\\n/g, '\n')
}

// 使用
import { escapeNewline, unescapeNewline } from '../../utils/format'

// 写入
db.collection('notes').add({
  data: {
    content: escapeNewline(formData.content)
  }
})

// 读取
db.collection('notes').get().then(res => {
  const notes = res.data.map(item => ({
    ...item,
    content: unescapeNewline(item.content)
  }))
})
```

### 1.3 对象转字符串问题

#### 问题现象

```javascript
// 数据中有对象
const user = {
  _id: 'user_001',
  name: '张三'
}

// 直接转字符串
const text = String(user)
console.log(text)  // "[object Object]"

// 在页面中显示
<view>{{user}}</view>
// 显示：[object Object]
```

#### 解决方案

**方案1：使用 JSON.stringify**

```javascript
const text = JSON.stringify(user)
console.log(text)  // '{"_id":"user_001","name":"张三"}'
```

**方案2：只取需要的字段**

```javascript
const text = user.name
console.log(text)  // "张三"
```

**方案3：在页面中直接取字段**

```xml
<view>{{user.name}}</view>
<!-- 显示：张三 -->
```

### 1.4 数字精度问题

#### 问题现象

```javascript
// JavaScript 浮点数精度问题
0.1 + 0.2  // 0.30000000000000004

// 金额计算错误
const price = 19.9
const quantity = 3
const total = price * quantity  // 59.699999999999996
```

#### 解决方案

**方案1：转换为整数计算**

```javascript
// 金额以分为单位存储
const price = 1990  // 19.90元 = 1990分
const quantity = 3
const total = price * quantity  // 5970分 = 59.70元

// 显示时转换
const displayTotal = (total / 100).toFixed(2)  // "59.70"
```

**方案2：使用 toFixed**

```javascript
const total = (price * quantity).toFixed(2)  // "59.70"
```

**方案3：使用第三方库**

```javascript
// 使用 decimal.js
const Decimal = require('decimal.js')

const price = new Decimal(19.9)
const quantity = new Decimal(3)
const total = price.times(quantity)  // 59.7
```

---

## 第二部分：权限配置问题

### 2.1 数据库权限设置

#### 问题现象

```javascript
// 小程序端操作数据库
db.collection('users').add({
  data: { name: '张三' }
})
// 提示：权限不足
```

#### 原因分析

- 数据库默认权限是「仅创建者可读写」
- 小程序端无法操作

#### 解决方案

**方案1：修改权限设置**

1. 云开发控制台 → 数据库
2. 选择集合 → 权限设置
3. 改为「所有用户可读写」
4. 保存

**方案2：使用云函数**

```javascript
// cloudfunctions/addUser/index.js
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()

exports.main = async (event) => {
  const { name } = event

  return await db.collection('users').add({
    data: { name }
  })
}
```

```javascript
// 小程序端调用
wx.cloud.callFunction({
  name: 'addUser',
  data: { name: '张三' }
})
```

#### 安全建议

```javascript
// ❌ 不安全：所有用户可读写
// 任何人都可以删除数据

// ✅ 安全：使用云函数 + 权限校验
exports.main = async (event, context) {
  const { OPENID } = cloud.getWXContext()

  // 检查用户权限
  const user = await db.collection('users')
    .where({ _openid: OPENID })
    .get()

  if (!user.data[0] || user.data[0].role !== 'admin') {
    return { error: '权限不足' }
  }

  // 执行操作
  return await db.collection('users').add({
    data: event.data
  })
}
```

### 2.2 云存储权限设置

#### 问题现象

```xml
<!-- 图片显示不出来 -->
<image src="{{fileID}}" />
<!-- 提示：403 Forbidden -->
```

#### 原因分析

- 云存储默认权限是「仅创建者可读」
- 其他用户无法访问

#### 解决方案

**方案1：修改权限**

1. 云开发控制台 → 存储
2. 权限设置
3. 改为「所有用户可读」
4. 保存

**方案2：获取临时链接**

```javascript
wx.cloud.getTempFileURL({
  fileList: [fileID],
  success: res => {
    const tempURL = res.fileList[0].tempFileURL
    this.setData({ imageUrl: tempURL })
  }
})
```

### 2.3 云函数权限问题

#### 问题现象

```javascript
// 云函数中更新数据
const db = cloud.database()
await db.collection('users').doc('user_001').update({
  data: { age: 26 }
})
// 返回：updated: 0
```

#### 原因分析

- 云函数也受权限限制
- 如果记录是其他人创建的，无法更新

#### 解决方案

**方案1：使用管理员权限**

```javascript
// 初始化时指定管理员权限
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database({
  throwOnNotFound: false
})

// 这样就有管理员权限了
await db.collection('users').doc('user_001').update({
  data: { age: 26 }
})
```

---

## 第三部分：订阅消息问题

### 3.1 订阅消息发送失败

#### 问题现象

```javascript
// 调用云函数发送订阅消息
wx.cloud.callFunction({
  name: 'sendMessage',
  data: { ... }
})
// 用户没有收到消息
```

#### 常见原因

**原因1：模板ID错误**

```javascript
// ❌ 错误
templateId: 'xxx'  // 随便写的ID

// ✅ 正确
templateId: 'xxxxxxxxxxxxx'  // 在小程序后台申请的模板ID
```

**原因2：用户未授权**

```javascript
// 需要先请求授权
wx.requestSubscribeMessage({
  tmplIds: ['模板ID'],
  success: res => {
    if (res['模板ID'] === 'accept') {
      // 用户同意，可以发送
    } else {
      // 用户拒绝
    }
  }
})
```

**原因3：环境配置错误**

```javascript
// ❌ 错误：测试版收不到消息
miniprogramState: 'developer'

// ✅ 正确：正式版
miniprogramState: 'formal'

// ✅ 正确：体验版
miniprogramState: 'trial'
```

#### 完整示例

```javascript
// 小程序端：请求授权
wx.requestSubscribeMessage({
  tmplIds: ['模板ID'],
  success: res => {
    if (res['模板ID'] === 'accept') {
      // 调用云函数发送
      wx.cloud.callFunction({
        name: 'sendMessage',
        data: {
          openid: 'xxx',
          templateId: '模板ID',
          data: {
            thing1: { value: '订单已发货' },
            time2: { value: '2026-04-27 10:00' }
          }
        }
      })
    }
  }
})
```

```javascript
// 云函数
const cloud = require('wx-server-sdk')
cloud.init()

exports.main = async (event) => {
  const { openid, templateId, data } = event

  try {
    const result = await cloud.openapi.subscribeMessage.send({
      touser: openid,
      page: 'pages/index/index',
      data: data,
      templateId: templateId,
      miniprogramState: 'formal'  // 重要！
    })
    return { success: true }
  } catch (err) {
    console.error(err)
    return { success: false, error: err }
  }
}
```

### 3.2 测试版收不到消息

#### 问题现象

- 开发者工具中发送成功
- 手机体验版收不到消息

#### 原因

```javascript
// 云函数中配置错误
miniprogramState: 'developer'  // 只发给开发版
```

#### 解决方案

```javascript
// 根据环境动态配置
const env = process.env.ENV || 'formal'

await cloud.openapi.subscribeMessage.send({
  ...
  miniprogramState: env  // 'developer' | 'trial' | 'formal'
})
```

### 3.3 授权失败问题

#### 问题现象

- 用户点击「允许」后仍然发送失败

#### 原因

- 用户可能之前选择了「总是拒绝」

#### 解决方案

```javascript
// 引导用户重新开启
wx.showModal({
  title: '提示',
  content: '您已拒绝接收通知，请在小程序设置中重新开启',
  confirmText: '去设置',
  success: res => {
    if (res.confirm) {
      wx.openSetting()
    }
  }
})
```

---

## 第四部分：性能问题

### 4.1 页面加载慢

#### 问题现象

- 打开页面需要5秒以上
- 页面卡顿

#### 常见原因

**原因1：数据量过大**

```javascript
// ❌ 一次性加载所有数据
db.collection('products').get().then(res => {
  this.setData({ products: res.data })  // 1000条数据
})
```

**解决方案：分页加载**

```javascript
// ✅ 分页加载
Page({
  data: {
    products: [],
    page: 0,
    pageSize: 20
  },

  onLoad() {
    this.loadMore()
  },

  async loadMore() {
    const { page, pageSize } = this.data

    const res = await db.collection('products')
      .skip(page * pageSize)
      .limit(pageSize)
      .get()

    this.setData({
      products: [...this.data.products, ...res.data],
      page: page + 1
    })
  },

  onReachBottom() {
    this.loadMore()
  }
})
```

**原因2：图片过大**

```xml
<!-- ❌ 原图太大 -->
<image src="{{bigImage}}" />  <!-- 5MB -->
```

**解决方案：压缩图片**

```javascript
// 上传前压缩
wx.compressImage({
  src: filePath,
  quality: 80,
  success: res => {
    // 上传压缩后的图片
  }
})

// 或使用云存储的图片处理
const imageUrl = `${fileID}?imageMogr2/thumbnail/!50p`  // 缩小到50%
```

**原因3：频繁 setData**

```javascript
// ❌ 频繁调用
for (let i = 0; i < 100; i++) {
  this.setData({ count: i })
}
```

**解决方案：批量更新**

```javascript
// ✅ 批量更新
let count = 0
for (let i = 0; i < 100; i++) {
  count = i
}
this.setData({ count })
```

### 4.2 图片加载慢

#### 解决方案

**方案1：懒加载**

```xml
<image lazy-load="{{true}}" src="{{url}}" />
```

**方案2：使用缩略图**

```javascript
// 列表页用缩略图
const thumbnailUrl = `${fileID}?imageMogr2/thumbnail/200x200`

// 详情页用原图
const originalUrl = fileID
```

**方案3：预加载**

```javascript
// 预加载下一页的图片
wx.preloadImage({
  urls: nextPageImages
})
```

### 4.3 数据库查询慢

#### 问题现象

- 查询需要2秒以上

#### 解决方案

**方案1：建立索引**

1. 云开发控制台 → 数据库
2. 选择集合 → 索引管理
3. 为常用查询字段建立索引

**方案2：优化查询条件**

```javascript
// ❌ 全表扫描
db.collection('products').where({
  name: db.RegExp({ regexp: '手机' })
}).get()

// ✅ 使用索引
db.collection('products').where({
  category: '手机'  // category 字段有索引
}).get()
```

---

## 第五部分：UI问题

### 5.1 WXML标签未闭合

#### 问题现象

- 页面白屏
- 控制台报错：`end tag missing`

#### 原因

```xml
<!-- ❌ 标签未闭合 -->
<view class="container">
  <text>内容</text>
<!-- 缺少 </view> -->
```

#### 解决方案

```xml
<!-- ✅ 正确闭合 -->
<view class="container">
  <text>内容</text>
</view>
```

#### 排查技巧

1. 使用代码编辑器的括号匹配功能
2. 格式化代码（Shift + Alt + F）
3. 逐个检查标签

### 5.2 弹窗层级问题

#### 问题现象

- 弹窗被其他元素遮挡
- TabBar 显示在弹窗上方

#### 解决方案

**方案1：使用 root-portal**

```xml
<root-portal>
  <view class="modal">
    <!-- 弹窗内容 -->
  </view>
</root-portal>
```

**方案2：调整 z-index**

```css
.modal {
  position: fixed;
  z-index: 9999;
}
```

### 5.3 样式不生效

#### 常见原因

**原因1：选择器优先级**

```css
/* 优先级低 */
.button {
  color: red;
}

/* 优先级高 */
view .button {
  color: blue;  /* 生效 */
}
```

**原因2：样式隔离**

```javascript
// 组件中的样式默认隔离
Component({
  options: {
    styleIsolation: 'isolated'  // 默认值
  }
})
```

**解决方案**：

```javascript
Component({
  options: {
    styleIsolation: 'shared'  // 共享样式
  }
})
```

### 5.4 白屏问题

#### 常见原因

1. WXML 标签未闭合
2. JavaScript 报错
3. 数据格式错误
4. 图片加载失败

#### 排查步骤

1. 查看 Console 错误日志
2. 检查 WXML 标签
3. 检查数据格式
4. 逐步注释代码定位问题

---

## 第六部分：真实案例分析

### 6.1 Mock数据遗留导致的问题

#### 案例背景

开发时使用 Mock 数据测试，上线后忘记替换成真实 API。

#### 问题现象

```javascript
// 开发时的 Mock 代码
uploadImage() {
  // Mock：直接返回本地路径
  this.setData({
    imageUrl: '/images/mock.jpg'
  })
}
```

- 开发时图片显示正常
- 分享给用户后图片显示不出来

#### 解决方案

```javascript
// 替换成真实上传
async uploadImage() {
  const res = await wx.cloud.uploadFile({
    cloudPath: `images/${Date.now()}.jpg`,
    filePath: tempFilePath
  })

  this.setData({
    imageUrl: res.fileID
  })
}
```

#### 经验教训

- Mock 代码要及时删除
- 上线前全面测试
- 使用真实数据测试

### 6.2 排序混乱问题

#### 案例背景

跟进记录排序混乱，不按时间倒序显示。

#### 问题代码

```javascript
// ❌ 错误：用字符串比较
data.sort((a, b) => {
  return String(b.createdAt) - String(a.createdAt)
})
// 对象会变成 "[object Object]"，比较失败
```

#### 解决方案

```javascript
// ✅ 正确：用时间戳比较
function parseTime(time) {
  if (typeof time === 'number') return time
  if (time?.$date) return time.$date
  if (typeof time === 'string') return new Date(time).getTime()
  return Date.now()
}

data.sort((a, b) => {
  return parseTime(b.createdAt) - parseTime(a.createdAt)
})
```

### 6.3 缓存不一致问题

#### 案例背景

Web端修改了用户信息，小程序端重新登录后还是旧数据。

#### 原因

```javascript
// 登录时直接用本地缓存
const user = wx.getStorageSync('user')
this.setData({ user })
```

#### 解决方案

```javascript
// 登录时强制从数据库拉取最新数据
async login() {
  // 验证账号密码...

  // 从数据库拉取最新用户信息
  const res = await db.collection('users')
    .doc(userId)
    .get()

  // 更新本地缓存
  wx.setStorageSync('user', res.data)

  this.setData({ user: res.data })
}
```

---

## 总结

本指南总结了最常见的坑：

✅ 数据格式问题（时间、换行符、对象转字符串）
✅ 权限配置问题（数据库、云存储、云函数）
✅ 订阅消息问题（发送失败、测试版、授权）
✅ 性能问题（加载慢、图片慢、查询慢）
✅ UI问题（标签未闭合、弹窗层级、样式、白屏）
✅ 真实案例（Mock数据、排序、缓存）

**下一步**：

- 学习 [最佳实践指南](./04_BEST_PRACTICES.md)
- 了解如何写出高质量的代码
- 避免重复踩坑

---

**最后更新**：2026-04-27
**维护者**：开源社区
