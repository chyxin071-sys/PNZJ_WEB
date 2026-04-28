# 云开发入门指南

> 本指南详细讲解微信小程序云开发的使用，包括云数据库、云存储、云函数。

---

## 第一部分：云开发概述

### 1.1 什么是云开发

**简单来说**：
- 云开发是微信提供的**后端服务**
- 不需要自己搭建服务器
- 不需要写后端代码（大部分情况）
- 小程序可以直接操作数据库、存储文件

**技术角度**：
- 基于腾讯云的 Serverless 架构
- 提供数据库、存储、云函数三大核心能力
- 按量计费，用多少付多少
- 自动扩容，无需运维

**传统开发 vs 云开发**：

```
传统开发：
小程序 → 后端服务器 → 数据库
       ↓
   需要自己搭建和维护

云开发：
小程序 → 云开发 → 数据库
       ↓
   微信提供，自动运维
```

### 1.2 云开发的优势

**✅ 优势**：

**1. 开发效率高**
- 不需要搭建服务器
- 不需要写后端接口（大部分情况）
- 小程序直接操作数据库
- 快速上线

**2. 运维成本低**
- 自动运维，不需要自己维护
- 自动扩容，不需要担心并发
- 自动备份，数据安全
- 按量计费，成本可控

**3. 开发门槛低**
- 不需要懂后端开发
- 不需要懂服务器运维
- 只需要会 JavaScript
- 适合前端开发者

**❌ 劣势**：

**1. 功能限制**
- 数据库查询限制（单次最多100条）
- 不支持复杂的关联查询
- 不支持事务
- 云函数有超时限制

**2. 成本问题**
- 小项目便宜，大项目可能贵
- 超出套餐后按量计费
- 需要控制使用量

**3. 绑定微信生态**
- 只能在微信小程序中使用
- 不能跨平台
- 数据迁移困难

### 1.3 云开发 vs 自建后端

| 对比项 | 云开发 | 自建后端 |
|--------|--------|---------|
| **开发难度** | 简单（只需前端知识） | 复杂（需要后端知识） |
| **开发时间** | 快（几天） | 慢（几周） |
| **运维成本** | 低（自动运维） | 高（需要自己维护） |
| **费用** | 按量计费 | 服务器固定费用 |
| **扩展性** | 自动扩容 | 需要手动扩容 |
| **性能** | 一般 | 可以优化到很高 |
| **灵活性** | 有限制 | 完全自由 |
| **适用场景** | 中小型项目 | 大型复杂项目 |

**如何选择**：

**选云开发**：
- ✅ 中小型项目（用户量 < 10万）
- ✅ 快速上线，时间紧
- ✅ 团队只有前端开发者
- ✅ 预算有限
- ✅ 不需要复杂的业务逻辑

**选自建后端**：
- ✅ 大型项目（用户量 > 10万）
- ✅ 需要复杂的业务逻辑
- ✅ 需要高性能
- ✅ 需要完全控制
- ✅ 团队有后端开发者

### 1.4 套餐选择

#### 套餐对比

| 套餐 | 价格 | 数据库 | 存储 | 云函数调用 | CDN流量 | 适用场景 |
|------|------|--------|------|-----------|---------|---------|
| **免费版** | 0元 | 2GB | 5GB | 10万次/月 | 5GB/月 | 学习测试 |
| **基础版1** | 30元/月 | 3GB | 10GB | 50万次/月 | 25GB/月 | 小型项目 |
| **基础版2** | 104元/月 | 5GB | 50GB | 150万次/月 | 100GB/月 | 中型项目 |
| **专业版** | 860元/月 | 10GB | 500GB | 400万次/月 | 1TB/月 | 大型项目 |

#### 如何选择

**免费版**：
- 适合：学习、测试、个人项目
- 限制：数据量小、访问量低
- 建议：先用免费版学习，再升级

**基础版1**（30元/月）：
- 适合：小型商业项目
- 用户量：< 1000人
- 数据量：< 3GB
- 示例：小型商城、工具类应用

**基础版2**（104元/月）：
- 适合：中型商业项目
- 用户量：1000-10000人
- 数据量：3-5GB
- 示例：中型商城、企业管理系统

**专业版**（860元/月）：
- 适合：大型商业项目
- 用户量：> 10000人
- 数据量：> 5GB
- 示例：大型商城、社交应用

#### 费用估算

**示例1：小型工具类应用**
- 用户量：500人
- 数据量：1GB
- 月访问：5万次
- **推荐**：免费版或基础版1
- **费用**：0-30元/月

**示例2：中型商城**
- 用户量：5000人
- 数据量：3GB
- 月访问：50万次
- **推荐**：基础版2
- **费用**：104元/月

**示例3：企业管理系统**
- 用户量：100人（员工）
- 数据量：2GB
- 月访问：10万次
- **推荐**：基础版1
- **费用**：30元/月

---

## 第二部分：云数据库

### 2.1 数据库基本概念

#### 什么是云数据库

- 云数据库是一个 **NoSQL 文档型数据库**
- 类似 MongoDB
- 数据以 JSON 格式存储
- 不需要预定义表结构

#### 基本术语

| 传统数据库 | 云数据库 | 说明 |
|-----------|---------|------|
| 数据库 | 环境 | 一个小程序可以有多个环境 |
| 表 | 集合 | 存储数据的容器 |
| 行 | 记录/文档 | 一条数据 |
| 列 | 字段 | 数据的属性 |

#### 数据格式

```javascript
// 一条用户记录
{
  "_id": "user_001",           // 唯一ID（自动生成）
  "name": "张三",              // 字符串
  "age": 25,                   // 数字
  "isVIP": true,               // 布尔值
  "tags": ["学生", "程序员"],  // 数组
  "address": {                 // 对象
    "city": "北京",
    "district": "朝阳区"
  },
  "createdAt": {               // 时间
    "$date": 1714147200000
  }
}
```

### 2.2 创建集合

#### 在控制台创建

1. 打开微信开发者工具
2. 点击「云开发」按钮
3. 进入云开发控制台
4. 点击「数据库」
5. 点击「添加集合」
6. 输入集合名称（如 `users`）
7. 点击「确定」

#### 集合命名规范

```
✅ 好的命名：
- users（用户）
- products（商品）
- orders（订单）
- categories（分类）

❌ 不好的命名：
- user（单数，应该用复数）
- User（大写，应该用小写）
- user_list（不要用下划线）
```

### 2.3 增删改查操作

#### 初始化数据库

```javascript
// 在页面中初始化
const db = wx.cloud.database()
```

#### 新增数据（Create）

```javascript
// 添加一条记录
db.collection('users').add({
  data: {
    name: '张三',
    age: 25,
    city: '北京'
  },
  success: res => {
    console.log('添加成功', res._id)
  },
  fail: err => {
    console.error('添加失败', err)
  }
})

// 使用 Promise
db.collection('users').add({
  data: {
    name: '李四',
    age: 30
  }
}).then(res => {
  console.log('添加成功', res._id)
}).catch(err => {
  console.error('添加失败', err)
})

// 使用 async/await（推荐）
async addUser() {
  try {
    const res = await db.collection('users').add({
      data: {
        name: '王五',
        age: 28
      }
    })
    console.log('添加成功', res._id)
  } catch (err) {
    console.error('添加失败', err)
  }
}
```

#### 查询数据（Read）

```javascript
// 查询所有数据
db.collection('users').get().then(res => {
  console.log('查询结果', res.data)
})

// 查询单条数据（根据ID）
db.collection('users').doc('user_001').get().then(res => {
  console.log('查询结果', res.data)
})

// 条件查询
db.collection('users').where({
  age: 25
}).get().then(res => {
  console.log('查询结果', res.data)
})

// 复杂查询
const _ = db.command
db.collection('users').where({
  age: _.gt(20).and(_.lt(30))  // 年龄在 20-30 之间
}).get().then(res => {
  console.log('查询结果', res.data)
})

// 排序
db.collection('users')
  .orderBy('age', 'desc')  // 按年龄降序
  .get()

// 分页
db.collection('users')
  .skip(0)    // 跳过前0条
  .limit(20)  // 取20条
  .get()
```

#### 更新数据（Update）

```javascript
// 更新单条数据
db.collection('users').doc('user_001').update({
  data: {
    age: 26
  }
}).then(res => {
  console.log('更新成功', res.stats.updated)
})

// 更新多条数据
db.collection('users').where({
  city: '北京'
}).update({
  data: {
    isVIP: true
  }
}).then(res => {
  console.log('更新成功', res.stats.updated)
})

// 更新对象属性
db.collection('users').doc('user_001').update({
  data: {
    'address.city': '上海'
  }
})

// 更新数组
const _ = db.command
db.collection('users').doc('user_001').update({
  data: {
    tags: _.push(['新标签'])  // 添加元素
  }
})
```

#### 删除数据（Delete）

```javascript
// 删除单条数据
db.collection('users').doc('user_001').remove().then(res => {
  console.log('删除成功', res.stats.removed)
})

// 删除多条数据
db.collection('users').where({
  age: _.lt(18)
}).remove().then(res => {
  console.log('删除成功', res.stats.removed)
})
```

### 2.4 查询条件

#### 比较运算符

```javascript
const _ = db.command

// 等于
db.collection('users').where({
  age: 25
})

// 不等于
db.collection('users').where({
  age: _.neq(25)
})

// 大于
db.collection('users').where({
  age: _.gt(25)
})

// 大于等于
db.collection('users').where({
  age: _.gte(25)
})

// 小于
db.collection('users').where({
  age: _.lt(25)
})

// 小于等于
db.collection('users').where({
  age: _.lte(25)
})

// 在数组中
db.collection('users').where({
  age: _.in([20, 25, 30])
})

// 不在数组中
db.collection('users').where({
  age: _.nin([20, 25, 30])
})
```

#### 逻辑运算符

```javascript
const _ = db.command

// 与（and）
db.collection('users').where({
  age: _.gt(20).and(_.lt(30))
})

// 或（or）
db.collection('users').where(
  _.or([
    { age: _.lt(20) },
    { age: _.gt(30) }
  ])
)

// 非（not）
db.collection('users').where({
  age: _.not(_.eq(25))
})
```

#### 字符串查询

```javascript
const _ = db.command

// 正则匹配
db.collection('users').where({
  name: db.RegExp({
    regexp: '张',
    options: 'i'  // 不区分大小写
  })
})
```

#### 数组查询

```javascript
const _ = db.command

// 数组包含某个元素
db.collection('users').where({
  tags: '学生'
})

// 数组包含所有元素
db.collection('users').where({
  tags: _.all(['学生', '程序员'])
})

// 数组大小
db.collection('users').where({
  tags: _.size(2)
})
```

### 2.5 权限配置

#### 权限类型

| 权限 | 说明 | 适用场景 |
|------|------|---------|
| **仅创建者可读写** | 只有创建者可以读写 | 个人数据（如用户设置） |
| **所有用户可读，仅创建者可写** | 所有人可读，只有创建者可写 | 公开内容（如文章） |
| **仅管理端可读写** | 只有管理员可以读写 | 敏感数据（如订单） |
| **所有用户可读写** | 所有人都可以读写 | 公共数据（如评论） |

#### 设置权限

1. 云开发控制台 → 数据库
2. 选择集合 → 权限设置
3. 选择权限类型
4. 保存

#### 权限示例

```javascript
// 示例1：用户只能读写自己的数据
// 权限设置：仅创建者可读写
db.collection('user_settings').add({
  data: {
    theme: 'dark',
    language: 'zh-CN'
  }
})
// 其他用户无法读取或修改

// 示例2：所有人可以读，只有创建者可以写
// 权限设置：所有用户可读，仅创建者可写
db.collection('articles').add({
  data: {
    title: '文章标题',
    content: '文章内容'
  }
})
// 其他用户可以读取，但不能修改

// 示例3：所有人都可以读写
// 权限设置：所有用户可读写
db.collection('comments').add({
  data: {
    content: '评论内容'
  }
})
// 任何用户都可以读取和修改
```

### 2.6 常见问题

#### Q1：查询结果为空

**现象**：
```javascript
db.collection('users').get().then(res => {
  console.log(res.data)  // []
})
```

**可能原因**：
1. 集合中没有数据
2. 权限设置不正确
3. 查询条件错误

**解决方案**：
1. 在控制台检查数据是否存在
2. 检查权限设置
3. 检查查询条件

#### Q2：查询限制100条

**现象**：
- 数据库有200条数据
- 查询只返回100条

**原因**：
- 云数据库单次查询限制100条

**解决方案**：
```javascript
// 分页查询
async function getAllData() {
  const PAGE_SIZE = 100
  let page = 0
  let allData = []

  while (true) {
    const res = await db.collection('users')
      .skip(page * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .get()

    allData = allData.concat(res.data)

    if (res.data.length < PAGE_SIZE) break
    page++
  }

  return allData
}
```

#### Q3：更新失败（updated: 0）

**现象**：
```javascript
db.collection('users').doc('user_001').update({
  data: { age: 26 }
}).then(res => {
  console.log(res.stats.updated)  // 0
})
```

**可能原因**：
1. 记录不存在
2. 权限不足
3. 字段名错误

**解决方案**：
1. 检查记录是否存在
2. 检查权限设置
3. 检查字段名拼写

---

## 第三部分：云存储

### 3.1 上传文件

#### 基本用法

```javascript
// 选择图片并上传
wx.chooseImage({
  count: 1,
  success: async (res) => {
    const filePath = res.tempFilePaths[0]

    // 上传到云存储
    const cloudPath = `images/${Date.now()}.jpg`
    const uploadRes = await wx.cloud.uploadFile({
      cloudPath,
      filePath
    })

    console.log('上传成功', uploadRes.fileID)
  }
})
```

#### 完整示例

```javascript
Page({
  data: {
    imageUrl: ''
  },

  // 选择并上传图片
  async chooseAndUpload() {
    wx.showLoading({ title: '上传中...' })

    try {
      // 1. 选择图片
      const chooseRes = await wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],  // 压缩图片
        sourceType: ['album', 'camera']
      })

      const filePath = chooseRes.tempFilePaths[0]

      // 2. 上传到云存储
      const cloudPath = `images/${Date.now()}.jpg`
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath,
        filePath
      })

      // 3. 保存 fileID
      this.setData({
        imageUrl: uploadRes.fileID
      })

      // 4. 保存到数据库
      await db.collection('photos').add({
        data: {
          fileID: uploadRes.fileID,
          createdAt: db.serverDate()
        }
      })

      wx.showToast({ title: '上传成功' })
    } catch (err) {
      console.error('上传失败', err)
      wx.showToast({ title: '上传失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  }
})
```

#### 文件命名规范

```javascript
// ✅ 好的命名
`images/${Date.now()}.jpg`              // 时间戳
`images/${userId}/${Date.now()}.jpg`    // 用户ID + 时间戳
`avatars/${userId}.jpg`                 // 固定名称（会覆盖）

// ❌ 不好的命名
`image.jpg`                             // 会被覆盖
`我的图片.jpg`                          // 中文，可能有问题
`images/photo 1.jpg`                    // 空格，可能有问题
```

### 3.2 下载文件

#### 获取临时链接

```javascript
// 获取临时下载链接（2小时有效）
wx.cloud.getTempFileURL({
  fileList: ['cloud://xxx.jpg'],
  success: res => {
    const tempFileURL = res.fileList[0].tempFileURL
    console.log('临时链接', tempFileURL)
  }
})
```

#### 下载文件

```javascript
// 下载文件到本地
wx.cloud.downloadFile({
  fileID: 'cloud://xxx.jpg',
  success: res => {
    const tempFilePath = res.tempFilePath
    console.log('下载成功', tempFilePath)

    // 保存到相册
    wx.saveImageToPhotosAlbum({
      filePath: tempFilePath
    })
  }
})
```

### 3.3 删除文件

```javascript
// 删除单个文件
wx.cloud.deleteFile({
  fileList: ['cloud://xxx.jpg'],
  success: res => {
    console.log('删除成功', res.fileList)
  }
})

// 删除多个文件
wx.cloud.deleteFile({
  fileList: [
    'cloud://xxx1.jpg',
    'cloud://xxx2.jpg'
  ]
})
```

### 3.4 权限配置

#### 权限类型

| 权限 | 说明 | 适用场景 |
|------|------|---------|
| **仅创建者可读写** | 只有上传者可以访问 | 私密文件 |
| **所有用户可读，仅创建者可写** | 所有人可以查看，只有上传者可以删除 | 公开图片 |
| **所有用户可读写** | 所有人都可以访问和删除 | 公共资源 |

#### 设置权限

1. 云开发控制台 → 存储
2. 权限设置
3. 选择权限类型
4. 保存

### 3.5 常见问题

#### Q1：上传失败

**现象**：
- 提示"上传失败"
- 提示"权限不足"

**可能原因**：
1. 文件过大（超过10MB）
2. 云存储空间不足
3. 网络问题

**解决方案**：
```javascript
// 1. 压缩图片
wx.compressImage({
  src: filePath,
  quality: 80,
  success: res => {
    // 上传压缩后的图片
    wx.cloud.uploadFile({
      cloudPath: `images/${Date.now()}.jpg`,
      filePath: res.tempFilePath
    })
  }
})

// 2. 检查文件大小
wx.getFileInfo({
  filePath,
  success: info => {
    if (info.size > 10 * 1024 * 1024) {
      wx.showToast({
        title: '文件过大，请选择小于10MB的文件',
        icon: 'none'
      })
      return
    }
    // 上传
  }
})
```

#### Q2：图片显示不出来

**现象**：
- 图片 URL 正确，但显示不出来
- 提示"403 Forbidden"

**可能原因**：
1. 权限设置不正确
2. fileID 过期
3. 文件已被删除

**解决方案**：
```javascript
// 1. 检查权限设置（改为"所有用户可读"）

// 2. 获取临时链接
wx.cloud.getTempFileURL({
  fileList: [fileID],
  success: res => {
    this.setData({
      imageUrl: res.fileList[0].tempFileURL
    })
  }
})
```

---

## 第四部分：云函数

### 4.1 什么是云函数

**简单来说**：
- 云函数是运行在云端的 JavaScript 代码
- 可以执行一些小程序端无法执行的操作
- 比如：发送订阅消息、获取用户手机号、调用第三方API

**使用场景**：
1. 发送订阅消息（只能在服务端调用）
2. 获取用户手机号（需要服务端解密）
3. 调用第三方API（避免暴露密钥）
4. 复杂的数据处理
5. 定时任务

### 4.2 创建云函数

#### 步骤1：创建云函数目录

1. 在项目根目录创建 `cloudfunctions` 文件夹
2. 在 `project.config.json` 中配置：
   ```json
   {
     "cloudfunctionRoot": "cloudfunctions/"
   }
   ```

#### 步骤2：创建云函数

1. 右键 `cloudfunctions` 文件夹
2. 选择「新建 Node.js 云函数」
3. 输入函数名（如 `hello`）
4. 创建成功后会生成以下文件：
   ```
   cloudfunctions/
   └── hello/
       ├── index.js       # 云函数代码
       ├── package.json   # 依赖配置
       └── config.json    # 函数配置
   ```

#### 步骤3：编写云函数代码

```javascript
// cloudfunctions/hello/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  // event：小程序端传来的参数
  // context：云函数的上下文信息

  const { name } = event

  return {
    message: `Hello, ${name}!`,
    timestamp: Date.now()
  }
}
```

### 4.3 部署云函数

#### 方法1：在开发者工具中部署

1. 右键云函数文件夹（如 `hello`）
2. 选择「上传并部署：云端安装依赖」
3. 等待部署完成

#### 方法2：在控制台部署

1. 云开发控制台 → 云函数
2. 点击「新建云函数」
3. 上传代码包（zip）
4. 配置运行环境
5. 保存并部署

#### 部署注意事项

- 云函数修改后必须重新部署
- 选择「云端安装依赖」会自动安装 npm 包
- 部署后在控制台可以看到函数列表

### 4.4 调用云函数

#### 基本用法

```javascript
// 调用云函数
wx.cloud.callFunction({
  name: 'hello',
  data: {
    name: '张三'
  },
  success: res => {
    console.log('调用成功', res.result)
    // { message: 'Hello, 张三!', timestamp: 1714147200000 }
  },
  fail: err => {
    console.error('调用失败', err)
  }
})

// 使用 Promise
wx.cloud.callFunction({
  name: 'hello',
  data: { name: '李四' }
}).then(res => {
  console.log(res.result)
})

// 使用 async/await（推荐）
async callHello() {
  try {
    const res = await wx.cloud.callFunction({
      name: 'hello',
      data: { name: '王五' }
    })
    console.log(res.result)
  } catch (err) {
    console.error(err)
  }
}
```

### 4.5 常见使用场景

#### 场景1：发送订阅消息

```javascript
// cloudfunctions/sendMessage/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const { openid, templateId, data } = event

  try {
    const result = await cloud.openapi.subscribeMessage.send({
      touser: openid,
      page: 'pages/index/index',
      data: data,
      templateId: templateId,
      miniprogramState: 'formal'
    })
    return { success: true, result }
  } catch (err) {
    return { success: false, error: err }
  }
}
```

```javascript
// 小程序端调用
wx.cloud.callFunction({
  name: 'sendMessage',
  data: {
    openid: 'oXXXX...',
    templateId: 'xxx',
    data: {
      thing1: { value: '订单已发货' },
      time2: { value: '2026-04-27 10:00' }
    }
  }
})
```

#### 场景2：获取用户手机号

```javascript
// cloudfunctions/getPhoneNumber/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const { code } = event

  try {
    const result = await cloud.openapi.phonenumber.getPhoneNumber({
      code: code
    })
    return {
      success: true,
      phoneNumber: result.phoneInfo.phoneNumber
    }
  } catch (err) {
    return { success: false, error: err }
  }
}
```

```javascript
// 小程序端调用
<button open-type="getPhoneNumber" bindgetphonenumber="getPhoneNumber">
  获取手机号
</button>

getPhoneNumber(e) {
  const code = e.detail.code
  wx.cloud.callFunction({
    name: 'getPhoneNumber',
    data: { code }
  }).then(res => {
    console.log('手机号：', res.result.phoneNumber)
  })
}
```

#### 场景3：调用第三方API

```javascript
// cloudfunctions/callThirdPartyAPI/index.js
const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  try {
    const response = await axios.get('https://api.example.com/data', {
      headers: {
        'Authorization': 'Bearer YOUR_SECRET_KEY'
      }
    })
    return { success: true, data: response.data }
  } catch (err) {
    return { success: false, error: err.message }
  }
}
```

### 4.6 常见问题

#### Q1：云函数调用失败

**现象**：
- 提示"云函数不存在"
- 提示"调用失败"

**可能原因**：
1. 云函数未部署
2. 函数名称错误
3. 环境ID不正确

**解决方案**：
1. 检查云函数是否已部署
2. 检查函数名称拼写
3. 检查环境ID配置

#### Q2：云函数超时

**现象**：
- 提示"云函数执行超时"

**原因**：
- 云函数默认超时时间是3秒
- 如果执行时间超过3秒会超时

**解决方案**：
```javascript
// 在 config.json 中配置超时时间
{
  "timeout": 20  // 最长20秒
}
```

#### Q3：云函数日志查看

**步骤**：
1. 云开发控制台 → 云函数
2. 选择函数 → 日志
3. 查看调用日志和错误日志

---

## 总结

恭喜你！现在你已经学会了：

✅ 云开发的基本概念和优势
✅ 如何选择合适的套餐
✅ 云数据库的增删改查操作
✅ 云存储的文件上传下载
✅ 云函数的创建和调用

**下一步**：
- 学习 [常见坑与解决方案](./03_COMMON_PITFALLS.md)
- 了解开发过程中容易踩的坑
- 提前避免常见问题

**推荐资源**：
- 云开发文档：https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html
- 云开发示例：https://github.com/TencentCloudBase/tcb-demo-basic

---

**最后更新**：2026-04-27
**维护者**：开源社区
