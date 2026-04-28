# 常见问题与解决方案

> 本文档汇总开发和使用过程中的常见问题及解决方案。

---

## 📋 目录

1. [开发环境问题](#开发环境问题)
2. [登录认证问题](#登录认证问题)
3. [数据显示问题](#数据显示问题)
4. [排序问题](#排序问题)
5. [通知问题](#通知问题)
6. [文件上传问题](#文件上传问题)
7. [权限问题](#权限问题)
8. [性能问题](#性能问题)
9. [部署问题](#部署问题)
10. [经验教训](#经验教训)

---

## 1. 开发环境问题

### Q1：微信开发者工具无法打开项目

**现象**：
- 提示"项目配置文件错误"
- 提示"AppID 不存在"

**解决方案**：
1. 检查 `project.config.json` 文件是否存在
2. 检查 AppID 是否正确
3. 检查是否已添加为开发者
4. 重新导入项目

---

### Q2：云开发初始化失败

**现象**：
- 提示"云开发环境不存在"
- 提示"初始化失败"

**解决方案**：
1. 检查环境 ID 是否正确
2. 检查云开发是否已开通
3. 检查网络连接
4. 重启开发者工具

---

### Q3：npm install 失败

**现象**：
- 提示"网络错误"
- 提示"依赖安装失败"

**解决方案**：
```bash
# 切换淘宝镜像
npm config set registry https://registry.npmmirror.com

# 清除缓存
npm cache clean --force

# 重新安装
npm install
```

---

## 2. 登录认证问题

### Q1：无法登录

**现象**：
- 输入正确的账号密码，提示"账号或密码错误"

**排查步骤**：
1. 检查数据库 users 集合是否有该用户
2. 检查用户状态是否为 'active'
3. 检查密码是否正确（注意大小写）
4. 检查网络请求是否成功
5. 查看 Console 错误日志

**解决方案**：
```javascript
// 在云开发控制台查询用户
db.collection('users').where({
  account: 'admin'
}).get()

// 如果用户不存在，手动创建
db.collection('users').add({
  data: {
    account: 'admin',
    password: '123456',
    name: '管理员',
    role: 'admin',
    phone: '13800138000',
    status: 'active',
    createdAt: db.serverDate()
  }
})
```

---

### Q2：登录后自动退出

**现象**：
- 登录成功，但刷新页面后又回到登录页

**排查步骤**：
1. 检查 token 是否保存到 localStorage
2. 检查 token 是否过期
3. 检查 MainLayout 权限拦截逻辑

**解决方案**：
```javascript
// 检查 localStorage
console.log(localStorage.getItem('pnzj_token'))
console.log(localStorage.getItem('pnzj_user'))

// 如果没有，检查登录逻辑是否保存了
```

---

### Q3：Token 无效

**现象**：
- 提示"Token 无效"或"未登录"

**解决方案**：
1. 重新登录获取新 token
2. 检查 JWT_SECRET 是否一致
3. 检查 token 是否在请求头中正确传递

---

## 3. 数据显示问题

### Q1：列表数据不显示

**现象**：
- 页面空白，没有数据

**排查步骤**：
1. 检查数据库是否有数据
2. 检查 API 请求是否成功（Network 面板）
3. 检查数据格式是否正确
4. 检查前端渲染逻辑
5. 查看 Console 错误日志

**解决方案**：
```javascript
// 在 Console 中打印数据
console.log('API 返回数据：', data)

// 检查数据结构
console.log('数据类型：', typeof data)
console.log('数据长度：', data.length)
```

---

### Q2：数据显示不完整

**现象**：
- 只显示部分数据，不是全部

**原因**：
- 云数据库单次查询限制 100 条

**解决方案**：
```javascript
// 分页查询
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

---

### Q3：时间显示错误

**现象**：
- 时间显示为 "[object Object]"
- 时间格式不正确

**原因**：
- `createdAt` 字段有多种格式（对象/数字/字符串）

**解决方案**：
```javascript
// 统一时间解析函数
function parseTime(time) {
  if (typeof time === 'number') return time
  if (time?.$date) return time.$date
  if (typeof time === 'string') return new Date(time).getTime()
  if (time instanceof Date) return time.getTime()
  return Date.now()
}

// 使用
const timestamp = parseTime(data.createdAt)
const date = new Date(timestamp)
```

---

### Q4：换行符不显示

**现象**：
- 跟进记录中的换行显示为 `\n`

**原因**：
- 写入数据库时转义了换行符

**解决方案**：
```javascript
// 读取后还原
const content = data.content.replace(/\\n/g, '\n')

// 在 HTML 中显示
<div style="white-space: pre-wrap">{content}</div>
```

---

## 4. 排序问题

### Q1：列表排序混乱

**现象**：
- 跟进记录、待办列表排序不按时间倒序

**原因**：
- `createdAt` 字段格式不统一，用字符串比较导致排序失效

**解决方案**：
```javascript
// 统一时间解析
function parseCreatedAtTime(time) {
  if (typeof time === 'number') return time
  if (time?.$date) return time.$date
  if (typeof time === 'string') return new Date(time).getTime()
  if (time instanceof Date) return time.getTime()
  return Date.now()
}

// 排序时使用时间戳数值比较
data.sort((a, b) => {
  return parseCreatedAtTime(b.createdAt) - parseCreatedAtTime(a.createdAt)
})
```

**详细文档**：`docs/FIX_FOLLOWUP_SORTING.md`

---

## 5. 通知问题

### Q1：订阅消息发送失败

**现象**：
- 用户没有收到订阅消息

**排查步骤**：
1. 检查模板 ID 是否正确
2. 检查云函数是否部署
3. 检查用户是否授权订阅
4. 检查 `miniprogramState` 是否为 'formal'
5. 查看云函数日志

**解决方案**：
```javascript
// 检查模板 ID
// utils/subscribe.js
export const TEMPLATE_IDS = {
  PROJECT_UPDATE: 'xxx',  // 确认是否正确
  TODO_REMINDER: 'xxx',
  ...
}

// 检查云函数配置
// cloudfunctions/sendSubscribeMessage/index.js
miniprogramState: 'formal'  // 不是 'developer'

// 检查用户是否授权
wx.requestSubscribeMessage({
  tmplIds: [TEMPLATE_IDS.PROJECT_UPDATE],
  success: (res) => {
    console.log('授权结果：', res)
  }
})
```

---

### Q2：站内通知不显示

**现象**：
- 通知中心没有通知

**排查步骤**：
1. 检查 notifications 集合是否有数据
2. 检查 API 请求是否成功
3. 检查前端渲染逻辑
4. 检查 userId 是否正确

**解决方案**：
```javascript
// 在云开发控制台查询
db.collection('notifications').where({
  userId: 'user_001'
}).get()

// 如果没有数据，检查通知创建逻辑
```

---

### Q3：订阅消息授权失败

**现象**：
- 用户点击"允许"后仍然发送失败

**原因**：
- 用户可能点击了"总是保持以上选择，不再询问"并选择了"拒绝"

**解决方案**：
- 引导用户在小程序设置中重新开启订阅消息权限
- 路径：小程序右上角 → 设置 → 通知管理

---

## 6. 文件上传问题

### Q1：图片上传失败

**现象**：
- 提示"上传失败"

**排查步骤**：
1. 检查文件大小是否超限（默认 10MB）
2. 检查云存储权限
3. 检查网络连接
4. 查看错误日志

**解决方案**：
```javascript
// 小程序端
wx.chooseImage({
  count: 1,
  sizeType: ['compressed'],  // 压缩图片
  success: async (res) => {
    const filePath = res.tempFilePaths[0]

    // 检查文件大小
    wx.getFileInfo({
      filePath,
      success: (info) => {
        if (info.size > 10 * 1024 * 1024) {
          wx.showToast({
            title: '图片过大，请选择小于10MB的图片',
            icon: 'none'
          })
          return
        }

        // 上传
        wx.cloud.uploadFile({...})
      }
    })
  }
})
```

---

### Q2：图片显示不出来

**现象**：
- 图片 URL 正确，但显示不出来

**排查步骤**：
1. 检查 fileID 是否正确
2. 检查云存储权限（是否可读）
3. 检查图片 URL 是否有效
4. 检查网络连接

**解决方案**：
```javascript
// 检查云存储权限
// 云开发控制台 → 存储 → 权限设置
// 设置为"所有用户可读"

// 或者获取临时 URL
wx.cloud.getTempFileURL({
  fileList: [fileID],
  success: (res) => {
    console.log('临时 URL：', res.fileList[0].tempFileURL)
  }
})
```

---

## 7. 权限问题

### Q1：非 admin 可以访问 admin 页面

**现象**：
- 普通员工可以访问数据分析页面

**原因**：
- MainLayout 权限拦截逻辑有问题

**解决方案**：
```typescript
// MainLayout.tsx
useEffect(() => {
  const user = localStorage.getItem('pnzj_user')
  if (!user) {
    router.push('/login')
    return
  }

  const userInfo = JSON.parse(user)

  // 检查 admin 专属页面
  if (pathname === '/analytics' && userInfo.role !== 'admin') {
    router.push('/')
    return
  }

  // 检查 admin/manager 专属页面
  if (pathname === '/inventory' && !['admin', 'manager'].includes(userInfo.role)) {
    router.push('/')
    return
  }
}, [pathname])
```

---

### Q2：数据库操作失败（权限不足）

**现象**：
- 提示"权限不足"或"操作失败"

**原因**：
- 数据库集合权限设置不正确

**解决方案**：
1. 云开发控制台 → 数据库
2. 选择集合 → 权限设置
3. 设置为"所有用户可读写"
4. 保存

---

## 8. 性能问题

### Q1：页面加载很慢

**现象**：
- 打开页面需要 5 秒以上

**排查步骤**：
1. 检查数据量是否过大
2. 检查是否有不必要的请求
3. 检查图片是否过大
4. 使用浏览器开发者工具分析

**解决方案**：
```javascript
// 1. 分页加载
const PAGE_SIZE = 20
db.collection('leads').limit(PAGE_SIZE).get()

// 2. 图片懒加载
<image lazy-load="{{true}}" src="{{url}}" />

// 3. 减少 setData 调用
// ❌ 不好
this.setData({ name: '张三' })
this.setData({ phone: '138...' })

// ✅ 好
this.setData({
  name: '张三',
  phone: '138...'
})
```

---

### Q2：数据库查询很慢

**现象**：
- 查询需要 2 秒以上

**原因**：
- 没有建立索引
- 查询条件不合理

**解决方案**：
```javascript
// 建立索引
// 云开发控制台 → 数据库 → 索引管理
// 为常用查询字段建立索引

// 优化查询条件
// ❌ 不好（全表扫描）
db.collection('leads').where({
  customerName: db.RegExp({
    regexp: '张',
    options: 'i'
  })
}).get()

// ✅ 好（使用索引）
db.collection('leads').where({
  status: '待跟进'
}).get()
```

---

## 9. 部署问题

### Q1：小程序审核被拒

**常见原因**：
- 功能不完整
- 测试账号无法登录
- 有违规内容
- 类目选择错误

**解决方案**：
1. 仔细阅读拒绝原因
2. 根据原因修改代码
3. 确保测试账号可用
4. 重新提交审核

---

### Q2：Web端部署后无法访问

**现象**：
- 提示"502 Bad Gateway"或"无法访问"

**排查步骤**：
1. 检查服务器是否运行（`pm2 list`）
2. 检查端口是否正确
3. 检查 Nginx 配置
4. 查看服务器日志

**解决方案**：
```bash
# 检查服务状态
pm2 list

# 重启服务
pm2 restart cm1-web

# 查看日志
pm2 logs cm1-web

# 检查 Nginx 配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

---

### Q3：云函数调用失败

**现象**：
- 提示"云函数不存在"或"调用失败"

**排查步骤**：
1. 检查云函数是否部署
2. 检查函数名称是否正确
3. 检查环境变量配置
4. 查看云函数日志

**解决方案**：
```javascript
// 检查云函数列表
// 云开发控制台 → 云函数

// 重新部署云函数
// 开发者工具 → 右键云函数 → 上传并部署

// 查看云函数日志
// 云开发控制台 → 云函数 → 日志
```

---

## 10. 经验教训

### 教训1：换行符转义正则写错

**问题**：
- 所有 API 的换行符转义正则写错：`/\n/g` 应该是 `/\\n/g`
- 导致换行符没有正确转义

**影响**：
- 6 个文件需要修改
- 已有数据需要迁移

**教训**：
- 正则表达式要仔细测试
- 公共逻辑应该封装成函数，避免重复代码

---

### 教训2：localStorage key 不统一

**问题**：
- 小程序端用 `'user'`
- Web端用 `'pnzj_user'`
- 导致混乱

**教训**：
- 项目开始时就要统一命名规范
- 写在文档中，所有人遵守

---

### 教训3：时间字段格式不统一

**问题**：
- `createdAt` 有三种格式：对象/数字/字符串
- 导致排序、显示都有问题

**教训**：
- 数据格式要统一
- 写入时统一格式
- 读取时统一解析

---

### 教训4：API 修改后忘记两端同步

**问题**：
- 修改了 Web端 API，忘记修改小程序端
- 导致小程序端功能异常

**教训**：
- 修改 API 后要检查两端是否都需要修改
- 建立检查清单

---

### 教训5：云函数 miniprogramState 配置错误

**问题**：
- 设置为 `'developer'` 导致生产环境订阅消息发送失败

**教训**：
- 部署前要检查所有配置
- 开发环境和生产环境要区分

---

### 教训6：数据库权限设置过于宽松

**问题**：
- 所有集合设置为"所有用户可读写"
- 安全性较低

**教训**：
- 小项目可以接受，但要知道风险
- 大项目应该用云函数 + 权限校验

---

### 教训7：没有及时记录文档

**问题**：
- 开发过程中遇到的问题没有及时记录
- 后来忘记了当时的解决方案

**教训**：
- 遇到问题立即记录到文档
- 定期更新 CHANGELOG.md 和 ISSUES_AND_RISKS.md

---

### 教训8：测试不充分就上线

**问题**：
- 没有测试所有角色的权限
- 上线后发现非 admin 可以访问 admin 页面

**教训**：
- 上线前要完整测试
- 使用测试清单（docs/TESTING_GUIDE.md）

---

## 11. 最佳实践

### 实践1：统一数据格式

**时间字段**：
```javascript
// 写入时统一格式
createdAt: { $date: Date.now() }

// 读取时统一解析
function parseTime(time) {
  if (typeof time === 'number') return time
  if (time?.$date) return time.$date
  if (typeof time === 'string') return new Date(time).getTime()
  return Date.now()
}
```

**换行符**：
```javascript
// 写入前转义
content: content.replace(/\n/g, '\\n')

// 读取后还原
content: content.replace(/\\n/g, '\n')
```

---

### 实践2：封装公共逻辑

**时间解析**：
```javascript
// lib/date.ts
export function parseTime(time: any): number {
  // 统一解析逻辑
}

// 使用
import { parseTime } from '@/lib/date'
const timestamp = parseTime(data.createdAt)
```

**数据脱敏**：
```javascript
// utils/format.js
export function maskPhone(phone) {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

// 使用
const maskedPhone = maskPhone('13800138000')  // 138****8000
```

---

### 实践3：使用统一组件

**日期选择器**：
```typescript
// components/DatePicker.tsx
// 所有日期输入都用这个组件，不用原生 input type="date"

// 使用
<DatePicker
  value={startDate}
  onChange={setStartDate}
/>
```

**客户信息展示**：
```typescript
// components/CustomerInfo.tsx
// 统一显示：姓名 + NO.编号 + 电话

// 使用
<CustomerInfo customer={customer} />
```

---

### 实践4：建立检查清单

**上线前检查**：
- 详见 `docs/TESTING_GUIDE.md`

**API 修改检查**：
- [ ] Web端 API 已修改
- [ ] 小程序端调用已修改
- [ ] 数据格式已统一
- [ ] 两端都已测试

---

### 实践5：及时记录文档

**遇到问题时**：
1. 记录问题现象
2. 记录排查过程
3. 记录解决方案
4. 更新到文档

**完成功能时**：
1. 更新 CHANGELOG.md
2. 更新功能文档
3. 更新 API 文档（如果有新接口）

---

**最后更新**：2026-04-27
**维护者**：XIN
