# 微信小程序完全指南

> 本指南适合所有想要开发微信小程序的人，从零开始，手把手教你做出第一个小程序。

---

## 开发前必读：新手常见问题与铁律

> 📚 **相关章节**：
> - 如何从需求到PRD：[00_从需求到PRD](./00_从需求到PRD.md)
> - 常见坑与解决方案：[03_常见坑与解决方案](./03_COMMON_PITFALLS.md)
> - 最佳实践：[04_最佳实践指南](./04_BEST_PRACTICES.md)

### 为什么要先看这一节？

很多新手直接开始写代码，结果遇到各种问题，最后推倒重来。这一节总结了前人踩过的坑，帮你少走弯路。

### 铁律1：先设计数据库结构（最重要）

**为什么排第一？**
- 这是地基，改起来最麻烦
- 影响后面所有功能
- 一旦开始写代码，改数据库结构会很痛苦
- 数据可能丢失或需要迁移

**错误做法**：
```
边写代码边想数据库结构 ❌
→ 结果：
  - 字段名不统一（有的叫 userId，有的叫 user_id）
  - 缺少必要字段（忘记加创建时间）
  - 数据类型不对（时间存成字符串）
  - 后期改动要修改大量代码
```

**正确做法**：
```
第一步：画出数据库设计图 ✅
第二步：确定每个集合的字段 ✅
第三步：确定字段类型和格式 ✅
第四步：团队确认无误 ✅
第五步：开始写代码 ✅
```

**示例：用户表设计**
```javascript
// users 集合
{
  _id: "自动生成",
  _openid: "用户openid（云开发自动写入）",
  nickName: "用户昵称",
  avatarUrl: "头像URL",
  phone: "手机号（可选）",
  createdAt: 1234567890000,  // 统一用时间戳
  updatedAt: 1234567890000
}
```

**设计时要考虑的问题**：
- 需要哪些集合（表）？
- 每个集合有哪些字段？
- 字段用什么类型（字符串/数字/数组/对象）？
- 字段命名规范（驼峰命名 or 下划线命名）？
- 时间字段用什么格式？
- 需要哪些索引（提高查询速度）？

### 铁律2：统一时间格式（设计阶段就要定）

**为什么排第二？**
- 这是数据库设计的一部分
- 时间格式不统一是最常见的坑
- 会导致排序混乱、显示错误
- 后期修复要改所有相关代码

**常见错误**：
```javascript
// 三种格式混用 ❌
createdAt: "2026-04-27"           // 字符串
createdAt: 1714147200000          // 时间戳
createdAt: { $date: 1714147200000 } // 对象

// 排序时出问题
data.sort((a, b) => a.createdAt - b.createdAt)  // 字符串减法失败
```

**正确做法**：
```javascript
// 方案1：统一使用时间戳（推荐） ✅
createdAt: Date.now()  // 1714147200000

// 方案2：统一使用云开发的时间格式 ✅
createdAt: db.serverDate()  // { $date: 1714147200000 }

// 无论选哪种，全项目统一！

// 读取时统一解析
function parseTime(time) {
  if (typeof time === 'number') return time
  if (time?.$date) return time.$date
  if (typeof time === 'string') return new Date(time).getTime()
  return Date.now()
}

// 排序时使用
data.sort((a, b) => parseTime(b.createdAt) - parseTime(a.createdAt))
```

**建议**：
- 在项目开始前就定好时间格式
- 写到开发规范文档中
- 所有人都要遵守
- 如果用 AI 辅助开发，也要告诉 AI 这个规则

### 铁律3：先做登录功能（开发的第一步）

**为什么排第三？**
- 数据库设计好了，就该做登录
- 小程序的很多功能都需要知道"当前用户是谁"
- 数据库的权限控制依赖用户身份
- 后面的功能（如订单、收藏、评论）都需要用户信息

**错误做法**：
```
第一步：做商品列表 ❌
第二步：做商品详情 ❌
第三步：做购物车 ❌
第四步：才想起来要做登录 ❌
→ 结果：前面的代码都要改，因为不知道用户是谁
```

**正确做法**：
```
第一步：做登录功能 ✅
第二步：做商品列表（可以记录用户浏览） ✅
第三步：做商品详情（可以记录用户收藏） ✅
第四步：做购物车（知道是谁的购物车） ✅
```

**最简单的登录实现**：
```javascript
// 使用云开发，自动获取用户身份
wx.cloud.callFunction({
  name: 'login'
}).then(res => {
  console.log('用户openid：', res.result.openid)
  // 保存到本地，后续使用
  wx.setStorageSync('userInfo', res.result)
})
```

### 铁律4：列表必须分页（做列表时必须考虑）

**为什么？**
- 云数据库单次查询最多返回 100 条
- 超过 100 条的数据查不到
- 一次性加载太多数据会卡顿
- 用户体验差

**错误做法**：
```javascript
// 直接查询所有数据 ❌
db.collection('products').get()
// 如果有 500 条数据，只能查到前 100 条
```

**正确做法**：
```javascript
// 方法1：分页查询 ✅
Page({
  data: {
    products: [],
    page: 0,
    pageSize: 20
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

  // 在 onReachBottom 中调用
  onReachBottom() {
    this.loadMore()
  }
})

// 方法2：使用云函数查询所有数据 ✅
// 云函数没有 100 条限制
```

### 铁律5：图片必须压缩（做图片上传时必须注意）

**为什么？**
- 原图太大（可能 5MB）
- 上传慢、加载慢
- 浪费云存储空间
- 浪费用户流量

**错误做法**：
```javascript
// 直接上传原图 ❌
wx.chooseImage({
  success: (res) => {
    wx.cloud.uploadFile({
      cloudPath: 'images/photo.jpg',
      filePath: res.tempFilePaths[0]  // 可能 5MB
    })
  }
})
```

**正确做法**：
```javascript
// 选择压缩后的图片 ✅
wx.chooseImage({
  count: 1,
  sizeType: ['compressed'],  // 压缩图，通常 < 500KB
  sourceType: ['album', 'camera'],
  success: (res) => {
    wx.cloud.uploadFile({
      cloudPath: `images/${Date.now()}.jpg`,
      filePath: res.tempFilePaths[0]
    })
  }
})
```

### 铁律6：频繁操作要防抖（优化阶段）

**为什么？**
- 用户可能快速点击多次
- 导致重复提交、重复请求
- 浪费资源，可能出错
- 可能产生重复数据

**错误做法**：
```javascript
// 没有防抖 ❌
handleSubmit() {
  // 用户快速点击 3 次，会提交 3 次
  wx.cloud.callFunction({
    name: 'createOrder',
    data: { ... }
  })
}
```

**正确做法**：
```javascript
// 方法1：禁用按钮 ✅
Page({
  data: {
    submitting: false
  },

  async handleSubmit() {
    if (this.data.submitting) return  // 防止重复提交

    this.setData({ submitting: true })
    try {
      await wx.cloud.callFunction({
        name: 'createOrder',
        data: { ... }
      })
      wx.showToast({ title: '提交成功' })
    } catch (err) {
      wx.showToast({ title: '提交失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  }
})

// 在 wxml 中
<button disabled="{{submitting}}" bindtap="handleSubmit">
  {{submitting ? '提交中...' : '提交'}}
</button>
```

---

### 铁律总结

**按重要性和顺序排列**：

**🔴 设计阶段（最重要，改不得）**
1. 先设计数据库结构
2. 统一时间格式

**🟡 开发顺序（影响开发效率）**
3. 先做登录功能

**🟢 开发规范（做功能时要遵守）**
4. 列表必须分页
5. 图片必须压缩
6. 频繁操作要防抖

**记住**：前面的铁律比后面的更重要，违反前面的铁律代价更大！

---

### 常见问题速查

#### Q1：为什么我的数据显示不出来？

**可能原因**：
1. 数据库权限配置错误（最常见）
2. 字段名写错了
3. 数据格式不对
4. 没有调用 `setData`

**排查步骤**：
```javascript
// 1. 先打印数据
console.log('查询结果：', res.data)

// 2. 检查数据库权限
// 云开发控制台 → 数据库 → 集合 → 权限设置
// 建议：开发时设置为"所有用户可读写"

// 3. 检查字段名
console.log('第一条数据：', res.data[0])

// 4. 确保调用 setData
this.setData({
  products: res.data
})
```

#### Q2：为什么我的图片显示不出来？

**可能原因**：
1. 图片路径错误
2. 云存储权限配置错误
3. 图片还在上传中
4. 图片格式不支持

**解决方案**：
```javascript
// 1. 检查图片路径
console.log('图片路径：', imageUrl)

// 2. 确保是 cloud:// 开头的 fileID
// 正确：cloud://xxx.jpg
// 错误：/images/xxx.jpg

// 3. 上传后等待成功回调
wx.cloud.uploadFile({
  cloudPath: 'images/photo.jpg',
  filePath: tempFilePath,
  success: (res) => {
    console.log('上传成功，fileID：', res.fileID)
    this.setData({ imageUrl: res.fileID })
  }
})
```

#### Q3：为什么我的列表排序是乱的？

**原因**：时间格式不统一（见铁律3）

**解决方案**：
```javascript
// 使用统一的时间解析函数
function parseTime(time) {
  if (typeof time === 'number') return time
  if (time?.$date) return time.$date
  if (typeof time === 'string') return new Date(time).getTime()
  return Date.now()
}

// 排序时使用
data.sort((a, b) => parseTime(b.createdAt) - parseTime(a.createdAt))
```

#### Q4：为什么我的小程序很卡？

**可能原因**：
1. 频繁调用 `setData`
2. 一次性加载太多数据
3. 图片太大
4. 列表渲染没有设置 `wx:key`

**优化方案**：
```javascript
// 1. 批量更新 setData
// ❌ 不好
for (let i = 0; i < 100; i++) {
  this.setData({ count: i })
}

// ✅ 好
let count = 0
for (let i = 0; i < 100; i++) {
  count = i
}
this.setData({ count })

// 2. 分页加载（见铁律4）

// 3. 压缩图片（见铁律5）

// 4. 设置 wx:key
<view wx:for="{{items}}" wx:key="id">
  {{item.name}}
</view>
```

### 开发顺序建议

**推荐的开发顺序**：

```
第一阶段：基础搭建
1. 注册小程序账号
2. 开通云开发
3. 设计数据库结构
4. 做登录功能

第二阶段：核心功能
5. 做主要的列表页（如商品列表）
6. 做详情页（如商品详情）
7. 做创建/编辑功能

第三阶段：辅助功能
8. 做搜索功能
9. 做筛选功能
10. 做个人中心

第四阶段：优化完善
11. 优化性能（分页、图片压缩）
12. 优化用户体验（加载状态、空状态）
13. 测试和修复 Bug

第五阶段：上线
14. 提交审核
15. 发布上线
16. 收集反馈
```

**不要一开始就做的事情**：
- ❌ 不要一开始就做复杂的动画
- ❌ 不要一开始就做分享功能
- ❌ 不要一开始就做支付功能
- ❌ 不要一开始就优化性能

**先把核心功能做出来，再考虑这些！**

---

## 第一部分：认识微信小程序

### 1.1 什么是微信小程序

**简单来说**：
- 微信小程序是一种**不需要下载安装**的应用
- 在微信里直接打开使用
- 用完就走，不占手机空间
- 体验接近原生 App

**技术角度**：
- 基于微信提供的框架开发
- 使用类似 HTML/CSS/JavaScript 的语法
- 运行在微信的环境中
- 可以调用微信的各种能力（支付、定位、扫码等）

**举例说明**：
```
传统 App：
1. 去应用商店搜索
2. 下载（可能几十MB）
3. 安装
4. 打开使用
5. 占用手机存储空间

微信小程序：
1. 微信里搜索或扫码
2. 直接打开使用
3. 不占手机存储空间
```

### 1.2 小程序 vs App vs H5

| 对比项 | 小程序 | 原生App | H5网页 |
|--------|--------|---------|--------|
| **下载安装** | 不需要 | 需要 | 不需要 |
| **占用空间** | 很小（缓存） | 大（几十MB） | 不占用 |
| **开发成本** | 中等 | 高 | 低 |
| **性能** | 接近原生 | 最好 | 较差 |
| **用户体验** | 好 | 最好 | 一般 |
| **推广难度** | 容易（微信生态） | 难（需要下载） | 容易（分享链接） |
| **功能限制** | 有限制 | 无限制 | 限制多 |

**什么时候选小程序**：
- ✅ 想快速上线，开发成本有限
- ✅ 目标用户都在用微信
- ✅ 不需要特别复杂的功能
- ✅ 希望用户使用方便（不用下载）

**什么时候不选小程序**：
- ❌ 需要后台常驻（如音乐播放）
- ❌ 需要复杂的计算或渲染
- ❌ 需要访问系统底层功能
- ❌ 目标用户不用微信

### 1.3 适合做什么项目

**✅ 非常适合**：

**1. 工具类**
- 计算器、查询工具
- 天气、日历
- 翻译、词典
- 示例：「腾讯文档」小程序

**2. 电商类**
- 商城、外卖
- 团购、拼团
- 预约、订票
- 示例：「拼多多」小程序

**3. 内容类**
- 新闻、资讯
- 视频、音频
- 文章、博客
- 示例：「知乎」小程序

**4. 企业内部管理**
- CRM、ERP
- 考勤、审批
- 项目管理
- 示例：装修公司管理系统

**5. O2O服务**
- 预约、上门服务
- 外卖、跑腿
- 家政、维修
- 示例：「美团」小程序

**❌ 不太适合**：

**1. 游戏**
- 有专门的「小游戏」
- 普通小程序不适合做游戏

**2. 社交应用**
- 微信本身就是社交工具
- 做社交小程序意义不大

**3. 需要复杂计算**
- 视频编辑、图片处理
- 3D渲染
- 性能不够

**4. 需要后台常驻**
- 音乐播放器（切到后台会暂停）
- 计步器（需要一直运行）

### 1.4 成功案例分析

**案例1：拼多多**
- 类型：电商
- 特点：社交电商，拼团购买
- 成功原因：利用微信社交关系链，传播快

**案例2：腾讯文档**
- 类型：工具
- 特点：在线文档编辑
- 成功原因：轻量级，随时随地编辑

**案例3：美团外卖**
- 类型：O2O
- 特点：点外卖、预约服务
- 成功原因：使用方便，不用下载App

---

## 第二部分：账号注册与认证

### 2.1 个人认证 vs 企业认证对比

| 对比项 | 个人认证 | 企业认证 |
|--------|---------|---------|
| **认证费用** | 免费 | 300元/年 |
| **认证周期** | 即时 | 3-7个工作日 |
| **所需材料** | 身份证 | 营业执照、对公账户、法人信息 |
| **支付功能** | ❌ 不支持 | ✅ 支持 |
| **获取手机号** | ❌ 不支持 | ✅ 支持 |
| **卡券功能** | ❌ 不支持 | ✅ 支持 |
| **客服功能** | ✅ 支持 | ✅ 支持 |
| **数据分析** | ✅ 支持 | ✅ 支持 |
| **用户信任度** | 较低 | 较高 |
| **适用场景** | 个人项目、学习测试 | 商业项目、企业应用 |

**如何选择**：

**选个人认证**：
- 只是学习、测试
- 不需要支付功能
- 不需要获取用户手机号
- 预算有限

**选企业认证**：
- 商业项目
- 需要支付功能
- 需要获取用户手机号
- 需要企业背书

### 2.2 企业认证完整流程

#### 步骤1：注册小程序账号

1. 访问 [微信公众平台](https://mp.weixin.qq.com/)
2. 点击「立即注册」
3. 选择「小程序」
4. 填写邮箱（**注意**：一个邮箱只能注册一个小程序）
5. 激活邮箱
6. 设置密码
7. 选择主体类型：**企业**

#### 步骤2：填写企业信息

**需要准备的材料**：
- 营业执照（扫描件或照片）
- 营业执照注册号
- 企业对公账户
- 管理员身份证信息
- 管理员手机号（接收验证码）

**填写内容**：
1. 企业名称（必须与营业执照一致）
2. 营业执照注册号
3. 企业类型（有限公司、个体工商户等）
4. 管理员姓名
5. 管理员身份证号
6. 管理员手机号

#### 步骤3：企业认证

1. 登录小程序后台
2. 设置 → 微信认证
3. 点击「开通」
4. 支付 300 元认证费（微信支付）
5. 填写认证资料：
   - 上传营业执照扫描件
   - 填写企业基本信息
   - 填写运营者信息
   - 填写发票信息（可选）
6. 选择验证方式：
   - **方式1**：对公账户打款验证（推荐）
   - **方式2**：法人扫脸验证
7. 提交审核
8. 等待审核（通常3-5个工作日）
9. 审核通过后会收到通知

#### 步骤4：完善小程序信息

1. 设置 → 基本设置
2. 填写小程序名称（**注意**：名称一年只能改2次）
3. 填写小程序简介
4. 上传小程序头像
5. 选择服务类目（根据业务选择）
6. 获取 AppID（开发 → 开发管理 → 开发设置）

### 2.3 常见问题与解决方案

**Q1：对公账户打款验证失败？**

**现象**：
- 提示"打款金额错误"
- 提示"账户名称不一致"

**解决方案**：
1. 确认账户名称与营业执照**完全一致**（包括括号、空格）
2. 打款金额通常在 1 元以内，注意查收
3. 打款备注中有验证码，需要在后台填写
4. 如果多次失败，联系银行确认账户状态

**Q2：法人扫脸验证失败？**

**现象**：
- 提示"人脸识别失败"
- 提示"请在光线充足的环境下操作"

**解决方案**：
1. 确保光线充足
2. 按提示做动作（眨眼、转头等）
3. 确保摄像头清晰
4. 如果多次失败，可以选择"对公账户打款验证"

**Q3：营业执照被占用？**

**现象**：
- 提示"该营业执照已注册过小程序"

**解决方案**：
1. 一个营业执照可以注册 **50 个**小程序
2. 如果提示被占用，检查是否之前注册过
3. 可以在"账号复用"中关联已有账号
4. 如果确实注册满了，需要注销一些不用的小程序

**Q4：认证审核被驳回？**

**常见原因**：
- 资料不清晰（营业执照照片模糊）
- 信息不一致（名称、注册号不匹配）
- 类目选择错误（与实际业务不符）
- 简介违规（包含违禁词）

**解决方案**：
1. 仔细阅读驳回原因
2. 根据原因修改资料
3. 重新提交审核
4. 如果不清楚，联系客服（400-882-9911）

### 2.4 费用说明

**一次性费用**：
- 认证费：300元/年（企业认证必须）
- 域名注册：50-100元/年（如果需要Web端）
- SSL证书：0-1000元/年（免费证书或付费证书）

**月度费用**：
- 云开发套餐：0-860元/月（根据使用量）
- 服务器：0元（使用云开发无需独立服务器）

**总成本估算**：
- **最低成本**：300元/年（只用免费云开发）
- **一般成本**：300 + 30×12 = 660元/年（基础云开发套餐）
- **较高成本**：300 + 104×12 = 1548元/年（中等云开发套餐）

---

## 第三部分：开发环境搭建

### 3.1 下载安装开发者工具

#### 下载

1. 访问 [微信开发者工具下载页](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 选择对应系统的版本：
   - Windows 64位
   - Windows 32位
   - macOS
3. 选择「稳定版」（Stable Build）
4. 下载安装包

#### 安装

**Windows**：
1. 双击运行 `.exe` 文件
2. 选择安装路径
3. 点击「安装」
4. 等待安装完成

**macOS**：
1. 打开 `.dmg` 文件
2. 拖动到 Applications 文件夹
3. 打开 Applications
4. 双击运行

#### 登录

1. 打开微信开发者工具
2. 使用微信扫码登录
3. 确认登录

### 3.2 创建第一个项目

#### 步骤1：新建项目

1. 点击「+」号（新建项目）
2. 填写项目信息：
   - **项目名称**：随便起，比如「我的第一个小程序」
   - **目录**：选择一个空文件夹
   - **AppID**：填写你的小程序 AppID
   - **开发模式**：选择「小程序」
   - **后端服务**：选择「不使用云服务」（后面再开通）
3. 点击「新建」

#### 步骤2：选择模板

- 选择「不使用模板」（我们从零开始）
- 或者选择「JavaScript 基础模板」（有一些示例代码）

#### 步骤3：项目创建成功

创建成功后，你会看到：
- 左侧：文件目录
- 中间：代码编辑器
- 右侧：模拟器（显示小程序界面）

### 3.3 开发者工具界面介绍

#### 顶部工具栏

- **编译**：重新编译小程序
- **预览**：生成二维码，手机扫码体验
- **真机调试**：在手机上调试并查看日志
- **清缓存**：清除编译缓存
- **上传**：上传代码到微信后台
- **版本管理**：Git版本管理

#### 左侧面板

- **模拟器**：显示小程序界面
- **编辑器**：编辑代码
- **调试器**：查看日志、网络请求等
- **云开发**：管理云开发资源

#### 调试器面板

- **Console**：查看日志输出
- **Sources**：查看源代码
- **Network**：查看网络请求
- **Storage**：查看本地存储
- **AppData**：查看页面数据
- **Wxml**：查看页面结构
- **Sensor**：模拟传感器（位置、重力等）

### 3.4 基本配置说明

#### app.json（全局配置）

```json
{
  "pages": [
    "pages/index/index",
    "pages/logs/logs"
  ],
  "window": {
    "navigationBarTitleText": "我的小程序",
    "navigationBarBackgroundColor": "#ffffff",
    "navigationBarTextStyle": "black",
    "backgroundColor": "#f8f8f8"
  },
  "tabBar": {
    "list": [
      {
        "pagePath": "pages/index/index",
        "text": "首页",
        "iconPath": "images/home.png",
        "selectedIconPath": "images/home-active.png"
      }
    ]
  }
}
```

**字段说明**：
- `pages`：页面路径列表（第一个是首页）
- `window`：窗口配置（导航栏样式）
- `tabBar`：底部标签栏配置

#### project.config.json（项目配置）

```json
{
  "appid": "你的AppID",
  "projectname": "我的小程序",
  "setting": {
    "es6": true,
    "enhance": true,
    "minified": true
  }
}
```

---

## 第四部分：小程序基础语法

### 4.1 WXML（页面结构）

WXML 类似 HTML，用于描述页面结构。

#### 基本标签

```xml
<!-- 视图容器 -->
<view class="container">
  <text>这是文本</text>
</view>

<!-- 图片 -->
<image src="/images/logo.png" mode="aspectFit"></image>

<!-- 按钮 -->
<button type="primary" bindtap="handleClick">点击我</button>

<!-- 输入框 -->
<input placeholder="请输入内容" bindinput="handleInput" />

<!-- 滚动视图 -->
<scroll-view scroll-y="true">
  <view>内容1</view>
  <view>内容2</view>
</scroll-view>
```

#### 数据绑定

```xml
<!-- 在 js 中定义 -->
Page({
  data: {
    message: 'Hello World',
    count: 0
  }
})

<!-- 在 wxml 中使用 -->
<view>{{message}}</view>
<view>数量：{{count}}</view>
```

#### 列表渲染

```xml
<!-- 在 js 中定义 -->
Page({
  data: {
    items: [
      { id: 1, name: '苹果' },
      { id: 2, name: '香蕉' },
      { id: 3, name: '橙子' }
    ]
  }
})

<!-- 在 wxml 中渲染 -->
<view wx:for="{{items}}" wx:key="id">
  {{index + 1}}. {{item.name}}
</view>
```

#### 条件渲染

```xml
<view wx:if="{{condition}}">条件为真时显示</view>
<view wx:else>条件为假时显示</view>

<!-- 多条件 -->
<view wx:if="{{score >= 90}}">优秀</view>
<view wx:elif="{{score >= 60}}">及格</view>
<view wx:else>不及格</view>
```

### 4.2 WXSS（样式）

WXSS 类似 CSS，用于描述页面样式。

#### 基本语法

```css
/* 类选择器 */
.container {
  padding: 20rpx;
  background-color: #f8f8f8;
}

/* 标签选择器 */
view {
  box-sizing: border-box;
}

/* ID选择器 */
#header {
  height: 100rpx;
}
```

#### 尺寸单位

```css
/* rpx：响应式像素，会根据屏幕宽度自动缩放 */
.box {
  width: 750rpx;  /* 750rpx = 屏幕宽度 */
  height: 200rpx;
}

/* px：固定像素 */
.text {
  font-size: 14px;
}
```

#### Flex布局

```css
/* 水平居中 */
.container {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 垂直排列 */
.list {
  display: flex;
  flex-direction: column;
}
```

### 4.3 JavaScript（逻辑）

#### 页面生命周期

```javascript
Page({
  // 页面数据
  data: {
    message: 'Hello'
  },

  // 页面加载
  onLoad(options) {
    console.log('页面加载', options)
  },

  // 页面显示
  onShow() {
    console.log('页面显示')
  },

  // 页面隐藏
  onHide() {
    console.log('页面隐藏')
  },

  // 页面卸载
  onUnload() {
    console.log('页面卸载')
  },

  // 下拉刷新
  onPullDownRefresh() {
    console.log('下拉刷新')
  },

  // 上拉加载
  onReachBottom() {
    console.log('上拉加载')
  }
})
```

#### 事件处理

```javascript
Page({
  data: {
    count: 0
  },

  // 点击事件
  handleClick() {
    this.setData({
      count: this.data.count + 1
    })
  },

  // 输入事件
  handleInput(e) {
    console.log('输入内容：', e.detail.value)
  },

  // 带参数的事件
  handleDelete(e) {
    const id = e.currentTarget.dataset.id
    console.log('删除ID：', id)
  }
})
```

```xml
<!-- 在 wxml 中绑定 -->
<button bindtap="handleClick">点击</button>
<input bindinput="handleInput" />
<button bindtap="handleDelete" data-id="123">删除</button>
```

#### 数据更新

```javascript
// ❌ 错误：直接修改 data
this.data.count = 1  // 不会更新页面

// ✅ 正确：使用 setData
this.setData({
  count: 1
})

// 更新对象属性
this.setData({
  'user.name': '张三',
  'user.age': 20
})

// 更新数组
this.setData({
  'items[0].name': '新名称'
})
```

### 4.4 JSON（配置）

#### 页面配置（page.json）

```json
{
  "navigationBarTitleText": "页面标题",
  "navigationBarBackgroundColor": "#ffffff",
  "enablePullDownRefresh": true,
  "onReachBottomDistance": 50
}
```

#### 全局配置（app.json）

```json
{
  "pages": [
    "pages/index/index",
    "pages/detail/detail"
  ],
  "window": {
    "navigationBarTitleText": "我的小程序",
    "navigationBarBackgroundColor": "#ffffff"
  }
}
```

### 4.5 生命周期

#### 应用生命周期

```javascript
// app.js
App({
  onLaunch() {
    console.log('小程序启动')
  },

  onShow() {
    console.log('小程序显示')
  },

  onHide() {
    console.log('小程序隐藏')
  }
})
```

#### 页面生命周期

```
用户打开小程序
  ↓
App.onLaunch（小程序启动）
  ↓
App.onShow（小程序显示）
  ↓
Page.onLoad（页面加载）
  ↓
Page.onShow（页面显示）
  ↓
Page.onReady（页面渲染完成）
  ↓
用户操作...
  ↓
Page.onHide（切换到其他页面）
  ↓
Page.onUnload（页面卸载）
```

---

## 第五部分：常用功能实现

### 5.1 页面跳转

#### 导航到新页面

```javascript
// 保留当前页面，跳转到新页面（可以返回）
wx.navigateTo({
  url: '/pages/detail/detail?id=123'
})
```

#### 重定向

```javascript
// 关闭当前页面，跳转到新页面（不能返回）
wx.redirectTo({
  url: '/pages/login/login'
})
```

#### 返回上一页

```javascript
// 返回上一页
wx.navigateBack({
  delta: 1  // 返回的页面数
})
```

#### 切换 Tab

```javascript
// 跳转到 tabBar 页面
wx.switchTab({
  url: '/pages/index/index'
})
```

#### 接收参数

```javascript
// detail/detail.js
Page({
  onLoad(options) {
    const id = options.id
    console.log('接收到的ID：', id)
  }
})
```

### 5.2 数据绑定

#### 单向绑定

```xml
<!-- 显示数据 -->
<view>{{message}}</view>
<image src="{{imageUrl}}" />
<view class="{{className}}"></view>
```

#### 双向绑定

```xml
<!-- 输入框双向绑定 -->
<input model:value="{{inputValue}}" />
```

```javascript
Page({
  data: {
    inputValue: ''
  }
})
```

### 5.3 列表渲染

#### 基本用法

```xml
<view wx:for="{{items}}" wx:key="id">
  {{index}}. {{item.name}}
</view>
```

#### 自定义变量名

```xml
<view wx:for="{{items}}" wx:for-item="product" wx:for-index="idx" wx:key="id">
  {{idx}}. {{product.name}}
</view>
```

#### 嵌套循环

```xml
<view wx:for="{{categories}}" wx:key="id">
  <view>{{item.name}}</view>
  <view wx:for="{{item.products}}" wx:for-item="product" wx:key="id">
    - {{product.name}}
  </view>
</view>
```

### 5.4 条件渲染

#### wx:if vs hidden

```xml
<!-- wx:if：条件为假时不渲染 -->
<view wx:if="{{show}}">内容</view>

<!-- hidden：条件为假时隐藏（仍然渲染） -->
<view hidden="{{!show}}">内容</view>
```

**使用建议**：
- 频繁切换：用 `hidden`（性能更好）
- 不常切换：用 `wx:if`（节省渲染）

### 5.5 事件处理

#### 事件类型

```xml
<!-- 点击事件 -->
<button bindtap="handleTap">点击</button>

<!-- 长按事件 -->
<view bindlongpress="handleLongPress">长按</view>

<!-- 输入事件 -->
<input bindinput="handleInput" />

<!-- 表单提交 -->
<form bindsubmit="handleSubmit">
  <button form-type="submit">提交</button>
</form>
```

#### 事件冒泡

```xml
<!-- bind：事件会冒泡 -->
<view bindtap="handleOuter">
  <button bindtap="handleInner">点击</button>
</view>

<!-- catch：阻止事件冒泡 -->
<view bindtap="handleOuter">
  <button catchtap="handleInner">点击</button>
</view>
```

#### 传递参数

```xml
<button bindtap="handleClick" data-id="123" data-name="张三">
  点击
</button>
```

```javascript
handleClick(e) {
  const id = e.currentTarget.dataset.id      // 123
  const name = e.currentTarget.dataset.name  // 张三
}
```

### 5.6 表单处理

#### 完整示例

```xml
<form bindsubmit="handleSubmit">
  <view class="form-item">
    <text>姓名：</text>
    <input name="name" placeholder="请输入姓名" />
  </view>

  <view class="form-item">
    <text>性别：</text>
    <radio-group name="gender">
      <radio value="male">男</radio>
      <radio value="female">女</radio>
    </radio-group>
  </view>

  <view class="form-item">
    <text>爱好：</text>
    <checkbox-group name="hobbies">
      <checkbox value="reading">阅读</checkbox>
      <checkbox value="sports">运动</checkbox>
    </checkbox-group>
  </view>

  <button form-type="submit">提交</button>
  <button form-type="reset">重置</button>
</form>
```

```javascript
Page({
  handleSubmit(e) {
    const formData = e.detail.value
    console.log('表单数据：', formData)
    // {
    //   name: '张三',
    //   gender: 'male',
    //   hobbies: ['reading', 'sports']
    // }
  }
})
```

---

## 第六部分：发布上线

### 6.1 上传代码

#### 步骤

1. 在开发者工具中点击「上传」
2. 填写版本号（如 v1.0.0）
3. 填写版本说明：
   ```
   v1.0.0
   - 新增用户登录功能
   - 新增商品列表页
   - 修复已知问题
   ```
4. 点击「上传」
5. 等待上传完成

#### 注意事项

- 上传前确保代码无错误
- 版本号建议使用语义化版本（如 1.0.0）
- 版本说明要清晰，方便审核

### 6.2 提交审核

#### 步骤

1. 登录小程序后台
2. 版本管理 → 开发版本
3. 找到刚上传的版本
4. 点击「提交审核」
5. 填写审核信息

#### 审核信息填写

**1. 配置功能页面**
- 选择小程序的主要功能页面
- 至少选择一个页面
- 示例：首页、商品列表、个人中心

**2. 测试账号**
- 提供测试账号和密码
- 确保账号可以正常登录
- 示例：
  ```
  账号：test001
  密码：123456
  ```

**3. 补充说明**
- 说明小程序的主要功能
- 说明使用场景
- 示例：
  ```
  本小程序是一个商城应用，用户可以浏览商品、下单购买。
  测试账号可以正常登录和浏览商品。
  ```

### 6.3 审核注意事项

#### 常见驳回原因

**1. 功能不完整**
- 页面空白或显示"开发中"
- 功能无法正常使用
- 缺少必要的功能

**解决方案**：
- 确保所有功能都能正常使用
- 移除"开发中"的提示
- 补充完整功能

**2. 测试账号问题**
- 测试账号无法登录
- 测试账号权限不足
- 没有提供测试账号

**解决方案**：
- 提供可用的测试账号
- 确保测试账号有足够权限
- 在补充说明中写清楚

**3. 类目选择错误**
- 实际功能与类目不符
- 类目选择不准确

**解决方案**：
- 重新选择正确的类目
- 确保类目与功能一致

**4. 内容违规**
- 包含违禁词
- 涉及敏感内容
- 侵犯版权

**解决方案**：
- 检查文案，移除违禁词
- 避免敏感内容
- 确保内容合法合规

#### 审核时间

- 通常：1-3 个工作日
- 节假日：可能延长
- 加急审核：需要特殊申请

### 6.4 发布流程

#### 审核通过后

1. 会收到审核通过的通知
2. 登录小程序后台
3. 版本管理 → 审核版本
4. 点击「发布」
5. 确认发布

#### 发布后

- 用户会在 24 小时内收到更新
- 可以在「线上版本」中看到当前版本
- 可以查看版本数据（访问量、用户数等）

#### 版本回退

**场景**：发布后发现严重 Bug

**步骤**：
1. 版本管理 → 线上版本
2. 点击「版本回退」
3. 选择要回退到的版本
4. 确认回退

**注意**：
- 只能回退到上一个版本
- 回退后需要重新修复 Bug 并提审

---

## 总结

恭喜你！现在你已经学会了：

✅ 微信小程序的基本概念
✅ 如何注册和认证小程序账号
✅ 如何搭建开发环境
✅ 小程序的基础语法（WXML、WXSS、JS、JSON）
✅ 常用功能的实现方法
✅ 如何发布上线

**下一步**：
- 学习 [云开发入门指南](./02_CLOUD_DEVELOPMENT_GUIDE.md)
- 了解如何使用云数据库、云存储、云函数
- 开始开发你的第一个真实项目

**推荐资源**：
- 微信官方文档：https://developers.weixin.qq.com/miniprogram/dev/framework/
- 微信开放社区：https://developers.weixin.qq.com/community/
- 示例代码：https://github.com/wechat-miniprogram

---

**最后更新**：2026-04-27
**维护者**：开源社区
