# 数据库设计文档

> 本文档详细说明所有数据库集合（表）的字段定义、数据类型、关联关系等。

---

## 📋 目录

1. [数据库概览](#数据库概览)
2. [核心业务集合](#核心业务集合)
3. [辅助功能集合](#辅助功能集合)
4. [字段命名规范](#字段命名规范)
5. [索引设计](#索引设计)
6. [数据迁移](#数据迁移)

---

## 1. 数据库概览

### 1.1 集合列表

| 集合名 | 说明 | 记录数（预估） | 重要程度 |
|--------|------|---------------|---------|
| users | 员工账号 | < 50 | ⭐⭐⭐ |
| leads | 客户线索 | 1000+ | ⭐⭐⭐ |
| projects | 工地项目 | 500+ | ⭐⭐⭐ |
| quotes | 报价单 | 500+ | ⭐⭐⭐ |
| contracts | 合同（暂未使用） | 0 | ⭐ |
| materials | 材料大厅 | 200+ | ⭐⭐ |
| inventory | 库存记录 | 1000+ | ⭐⭐ |
| followUps | 跟进记录 | 5000+ | ⭐⭐⭐ |
| todos | 待办事项 | 1000+ | ⭐⭐ |
| notifications | 通知消息 | 5000+ | ⭐⭐ |
| shareAccess | 分享查看权限申请 | 100+ | ⭐ |

### 1.2 关联关系图

```
users (员工)
  ↓ manager (负责人)
leads (客户) ←─────────┐
  ↓ leadId              │
projects (工地)         │ relatedId
  ↓ projectId           │
quotes (报价)           │
  ↓ quoteId             │
contracts (合同)        │
                        │
followUps (跟进) ───────┘
todos (待办) ───────────┘
notifications (通知) ───┘
```

---

## 2. 核心业务集合

### 2.1 users（员工账号）

**用途**：存储员工账号信息，用于登录和权限控制

**字段定义**：

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| _id | string | ✅ | 数据库自动生成的唯一ID | "user_001" |
| account | string | ✅ | 登录账号（唯一） | "zhangsan" |
| password | string | ✅ | 登录密码（明文） | "123456" |
| name | string | ✅ | 员工姓名 | "张三" |
| role | string | ✅ | 角色：admin/sales/designer/manager | "sales" |
| phone | string | ✅ | 手机号 | "13800138000" |
| department | string | ❌ | 部门 | "销售部" |
| status | string | ✅ | 状态：active/inactive | "active" |
| joinDate | object/number | ❌ | 入职时间 | { "$date": 1714147200000 } |
| createdAt | object/number | ✅ | 创建时间 | { "$date": 1714147200000 } |
| updatedAt | object/number | ❌ | 更新时间 | { "$date": 1714147200000 } |

**索引建议**：
- `account`（唯一索引，用于登录查询）
- `status`（用于筛选在职员工）

**示例数据**：
```json
{
  "_id": "user_001",
  "account": "admin",
  "password": "123456",
  "name": "管理员",
  "role": "admin",
  "phone": "13800138000",
  "department": "管理层",
  "status": "active",
  "joinDate": { "$date": 1714147200000 },
  "createdAt": { "$date": 1714147200000 }
}
```

---

### 2.2 leads（客户线索）

**用途**：存储客户信息和状态

**字段定义**：

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| _id | string | ✅ | 数据库自动生成的唯一ID | "lead_001" |
| customerNo | string | ❌ | 客户编号（业务编号） | "KH20260427001" |
| customerName | string | ✅ | 客户姓名 | "张三" |
| phone | string | ✅ | 客户电话 | "13800138000" |
| address | string | ❌ | 客户地址 | "北京市朝阳区..." |
| source | string | ❌ | 客户来源 | "朋友介绍" |
| status | string | ✅ | 状态：待跟进/已报价/已签单/已流失 | "待跟进" |
| manager | object | ✅ | 负责人信息 | { "_id": "user_001", "name": "李四" } |
| budget | number | ❌ | 预算（元） | 100000 |
| area | number | ❌ | 面积（平米） | 120 |
| style | string | ❌ | 装修风格 | "现代简约" |
| notes | string | ❌ | 备注 | "客户比较注重环保" |
| lastFollowUpAt | object/number | ❌ | 最后跟进时间（用于红点提示） | { "$date": 1714147200000 } |
| createdAt | object/number | ✅ | 创建时间 | { "$date": 1714147200000 } |
| updatedAt | object/number | ❌ | 更新时间 | { "$date": 1714147200000 } |

**索引建议**：
- `customerNo`（唯一索引）
- `status`（用于筛选）
- `manager._id`（用于筛选负责人）
- `lastFollowUpAt`（用于排序）

**示例数据**：
```json
{
  "_id": "lead_001",
  "customerNo": "KH20260427001",
  "customerName": "张三",
  "phone": "13800138000",
  "address": "北京市朝阳区xxx小区",
  "source": "朋友介绍",
  "status": "待跟进",
  "manager": {
    "_id": "user_001",
    "name": "李四"
  },
  "budget": 100000,
  "area": 120,
  "style": "现代简约",
  "notes": "客户比较注重环保",
  "lastFollowUpAt": { "$date": 1714147200000 },
  "createdAt": { "$date": 1714147200000 }
}
```

---

### 2.3 projects（工地项目）

**用途**：存储工地信息和施工进度

**字段定义**：

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| _id | string | ✅ | 数据库自动生成的唯一ID | "project_001" |
| projectNo | string | ❌ | 工地编号 | "GD20260427001" |
| projectName | string | ✅ | 工地名称 | "朝阳区xxx小区" |
| leadId | string | ✅ | 关联的客户ID | "lead_001" |
| customer | object | ✅ | 客户信息（冗余） | { "name": "张三", "phone": "138..." } |
| manager | object | ✅ | 项目经理 | { "_id": "user_002", "name": "王五" } |
| status | string | ✅ | 状态：未开工/施工中/已完工/已验收 | "施工中" |
| address | string | ✅ | 工地地址 | "北京市朝阳区..." |
| area | number | ❌ | 面积 | 120 |
| contractAmount | number | ❌ | 合同金额 | 150000 |
| startDate | object/number | ❌ | 开工日期 | { "$date": 1714147200000 } |
| endDate | object/number | ❌ | 完工日期 | { "$date": 1714147200000 } |
| schedule | array | ❌ | 施工排期（8大节点） | [{ "name": "拆除", "status": "completed", ... }] |
| photos | array | ❌ | 工地照片（fileID数组） | ["cloud://xxx.jpg"] |
| files | array | ❌ | 工地文件 | [{ "name": "施工图.pdf", "url": "..." }] |
| notes | string | ❌ | 备注 | "注意保护地板" |
| createdAt | object/number | ✅ | 创建时间 | { "$date": 1714147200000 } |
| updatedAt | object/number | ❌ | 更新时间 | { "$date": 1714147200000 } |

**schedule 数组结构**：
```json
[
  {
    "name": "拆除",
    "status": "completed",
    "planStartDate": { "$date": 1714147200000 },
    "planEndDate": { "$date": 1714233600000 },
    "actualStartDate": { "$date": 1714147200000 },
    "actualEndDate": { "$date": 1714233600000 },
    "procedures": [
      {
        "name": "墙体拆除",
        "status": "completed",
        "acceptancePhotos": ["cloud://xxx.jpg"],
        "acceptanceNotes": "验收通过",
        "acceptedAt": { "$date": 1714233600000 }
      }
    ]
  }
]
```

**索引建议**：
- `projectNo`（唯一索引）
- `leadId`（用于关联查询）
- `status`（用于筛选）
- `manager._id`（用于筛选项目经理）

---

### 2.4 quotes（报价单）

**用途**：存储报价单信息

**字段定义**：

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| _id | string | ✅ | 数据库自动生成的唯一ID | "quote_001" |
| quoteNo | string | ❌ | 报价单编号 | "BJ20260427001" |
| leadId | string | ✅ | 关联的客户ID | "lead_001" |
| customer | object | ✅ | 客户信息（冗余） | { "name": "张三", "phone": "138..." } |
| items | array | ✅ | 报价项目列表 | [{ "name": "水电改造", "price": 5000, ... }] |
| totalAmount | number | ✅ | 总金额 | 150000 |
| status | string | ✅ | 状态：草稿/已发送/已接受/已拒绝 | "已发送" |
| notes | string | ❌ | 备注 | "包含材料费" |
| attachments | array | ❌ | 附件 | [{ "name": "报价明细.xlsx", "url": "..." }] |
| createdBy | object | ✅ | 创建人 | { "_id": "user_001", "name": "李四" } |
| createdAt | object/number | ✅ | 创建时间 | { "$date": 1714147200000 } |
| updatedAt | object/number | ❌ | 更新时间 | { "$date": 1714147200000 } |

**items 数组结构**：
```json
[
  {
    "name": "水电改造",
    "unit": "项",
    "quantity": 1,
    "price": 5000,
    "amount": 5000,
    "notes": "包含材料费"
  }
]
```

**索引建议**：
- `quoteNo`（唯一索引）
- `leadId`（用于关联查询）
- `status`（用于筛选）

---

### 2.5 materials（材料大厅）

**用途**：存储材料产品目录

**字段定义**：

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| _id | string | ✅ | 数据库自动生成的唯一ID | "material_001" |
| name | string | ✅ | 材料名称 | "瓷砖" |
| category | string | ✅ | 分类 | "地面材料" |
| brand | string | ❌ | 品牌 | "马可波罗" |
| model | string | ❌ | 型号 | "CH8295AS" |
| spec | string | ❌ | 规格 | "800x800mm" |
| unit | string | ✅ | 单位 | "片" |
| price | number | ✅ | 单价（元） | 50 |
| status | string | ✅ | 状态：上架/下架 | "上架" |
| description | string | ❌ | 描述 | "防滑耐磨" |
| images | array | ❌ | 图片 | ["cloud://xxx.jpg"] |
| createdAt | object/number | ✅ | 创建时间 | { "$date": 1714147200000 } |
| updatedAt | object/number | ❌ | 更新时间 | { "$date": 1714147200000 } |

**注意**：材料大厅不存储库存数量，库存在 inventory 集合中管理

**索引建议**：
- `category`（用于筛选）
- `status`（用于筛选）

---

### 2.6 inventory（库存记录）

**用途**：存储材料出入库流水和当前库存

**字段定义**：

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| _id | string | ✅ | 数据库自动生成的唯一ID | "inventory_001" |
| materialId | string | ✅ | 关联的材料ID | "material_001" |
| material | object | ✅ | 材料信息（冗余） | { "name": "瓷砖", "unit": "片" } |
| type | string | ✅ | 类型：入库/出库 | "入库" |
| quantity | number | ✅ | 数量 | 100 |
| currentStock | number | ✅ | 当前库存 | 500 |
| projectId | string | ❌ | 关联的工地ID（出库时） | "project_001" |
| notes | string | ❌ | 备注 | "采购入库" |
| operator | object | ✅ | 操作人 | { "_id": "user_001", "name": "李四" } |
| createdAt | object/number | ✅ | 创建时间 | { "$date": 1714147200000 } |

**索引建议**：
- `materialId`（用于查询某材料的出入库记录）
- `projectId`（用于查询某工地的材料使用）

---

## 3. 辅助功能集合

### 3.1 followUps（跟进记录）

**用途**：存储客户跟进记录

**字段定义**：

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| _id | string | ✅ | 数据库自动生成的唯一ID | "followup_001" |
| relatedType | string | ✅ | 关联类型：lead/project | "lead" |
| relatedId | string | ✅ | 关联的ID | "lead_001" |
| content | string | ✅ | 跟进内容 | "电话沟通，客户有意向" |
| type | string | ✅ | 类型：manual/system | "manual" |
| createdBy | object | ✅ | 创建人 | { "_id": "user_001", "name": "李四" } |
| createdAt | object/number/string | ✅ | 创建时间（三种格式） | { "$date": 1714147200000 } |

**注意**：
- `createdAt` 字段存在三种格式：对象、数字、字符串
- 需要统一解析函数处理

**索引建议**：
- `relatedId`（用于查询某客户/工地的跟进记录）
- `createdAt`（用于排序）

---

### 3.2 todos（待办事项）

**用途**：存储待办任务

**字段定义**：

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| _id | string | ✅ | 数据库自动生成的唯一ID | "todo_001" |
| title | string | ✅ | 待办标题 | "回访客户" |
| content | string | ❌ | 待办内容 | "了解客户最新需求" |
| dueDate | object/number | ✅ | 截止时间 | { "$date": 1714147200000 } |
| status | string | ✅ | 状态：pending/completed | "pending" |
| assignee | object | ❌ | 执行人 | { "_id": "user_001", "name": "李四" } |
| relatedType | string | ❌ | 关联类型：lead | "lead" |
| relatedId | string | ❌ | 关联的ID | "lead_001" |
| createdBy | object | ✅ | 创建人 | { "_id": "user_002", "name": "王五" } |
| createdAt | object/number | ✅ | 创建时间 | { "$date": 1714147200000 } |
| completedAt | object/number | ❌ | 完成时间 | { "$date": 1714147200000 } |

**注意**：待办只关联客户（lead），不关联工地（project）

**索引建议**：
- `assignee._id`（用于查询我的待办）
- `status`（用于筛选）
- `dueDate`（用于排序）

---

### 3.3 notifications（通知消息）

**用途**：存储站内通知

**字段定义**：

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| _id | string | ✅ | 数据库自动生成的唯一ID | "notification_001" |
| userId | string | ✅ | 接收人ID | "user_001" |
| title | string | ✅ | 通知标题 | "新待办" |
| content | string | ✅ | 通知内容 | "李四给你分配了一个待办" |
| type | string | ✅ | 类型：todo/lead/project/system | "todo" |
| relatedId | string | ❌ | 关联的ID | "todo_001" |
| isRead | boolean | ✅ | 是否已读 | false |
| createdAt | object/number | ✅ | 创建时间 | { "$date": 1714147200000 } |

**索引建议**：
- `userId`（用于查询某用户的通知）
- `isRead`（用于筛选未读）
- `createdAt`（用于排序）

---

### 3.4 shareAccess（分享查看权限申请）

**用途**：存储业主申请查看工地进度的记录

**字段定义**：

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| _id | string | ✅ | 数据库自动生成的唯一ID | "access_001" |
| projectId | string | ✅ | 关联的工地ID | "project_001" |
| openid | string | ✅ | 申请人openid | "oXXXX..." |
| phone | string | ✅ | 申请人手机号 | "13800138000" |
| status | string | ✅ | 状态：pending/approved/rejected | "pending" |
| reason | string | ❌ | 申请理由 | "我是业主" |
| rejectReason | string | ❌ | 拒绝理由 | "身份验证失败" |
| approvedBy | object | ❌ | 审批人 | { "_id": "user_001", "name": "李四" } |
| createdAt | object/number | ✅ | 申请时间 | { "$date": 1714147200000 } |
| approvedAt | object/number | ❌ | 审批时间 | { "$date": 1714147200000 } |

**索引建议**：
- `projectId`（用于查询某工地的申请记录）
- `openid`（用于查询某用户的申请记录）
- `status`（用于筛选待审批）

---

## 4. 字段命名规范

### 4.1 命名约定

**驼峰命名**：
- 字段名使用小驼峰：`customerName`, `createdAt`
- 不使用下划线：~~`customer_name`~~

**布尔值**：
- 使用 `is` 开头：`isRead`, `isActive`, `isDeleted`

**时间字段**：
- 使用 `At` 结尾：`createdAt`, `updatedAt`, `completedAt`
- 日期字段使用 `Date` 结尾：`startDate`, `endDate`, `dueDate`

**关联字段**：
- 使用 `Id` 结尾：`leadId`, `projectId`, `userId`
- 冗余对象不加 `Id`：`manager`, `customer`, `createdBy`

### 4.2 数据类型约定

**字符串（string）**：
- 姓名、地址、备注等文本
- 状态、类型等枚举值

**数字（number）**：
- 金额、数量、面积等数值

**布尔值（boolean）**：
- 是否已读、是否删除等

**对象（object）**：
- 时间：`{ "$date": 毫秒时间戳 }`
- 关联对象：`{ "_id": "xxx", "name": "xxx" }`

**数组（array）**：
- 图片列表、文件列表、报价项目等

### 4.3 时间字段格式

**三种格式**（需要兼容）：
```javascript
// 格式1：对象（Web端写入）
{ "$date": 1714147200000 }

// 格式2：数字（小程序端 db.serverDate() 写入后读出）
1714147200000

// 格式3：字符串（手动写入或导入）
"2026-04-27T00:00:00.000Z"
```

**统一解析函数**：
```javascript
function parseTime(time) {
  if (typeof time === 'number') return time
  if (time?.$date) return time.$date
  if (typeof time === 'string') return new Date(time).getTime()
  if (time instanceof Date) return time.getTime()
  return Date.now()
}
```

---

## 5. 索引设计

### 5.1 当前索引

**默认索引**：
- 所有集合都有 `_id` 索引（自动创建）

**建议添加的索引**：
```javascript
// users 集合
db.collection('users').createIndex({ account: 1 }, { unique: true })
db.collection('users').createIndex({ status: 1 })

// leads 集合
db.collection('leads').createIndex({ customerNo: 1 }, { unique: true })
db.collection('leads').createIndex({ status: 1 })
db.collection('leads').createIndex({ 'manager._id': 1 })
db.collection('leads').createIndex({ lastFollowUpAt: -1 })

// projects 集合
db.collection('projects').createIndex({ projectNo: 1 }, { unique: true })
db.collection('projects').createIndex({ leadId: 1 })
db.collection('projects').createIndex({ status: 1 })
db.collection('projects').createIndex({ 'manager._id': 1 })

// followUps 集合
db.collection('followUps').createIndex({ relatedId: 1 })
db.collection('followUps').createIndex({ createdAt: -1 })

// todos 集合
db.collection('todos').createIndex({ 'assignee._id': 1 })
db.collection('todos').createIndex({ status: 1 })
db.collection('todos').createIndex({ dueDate: 1 })

// notifications 集合
db.collection('notifications').createIndex({ userId: 1 })
db.collection('notifications').createIndex({ isRead: 1 })
db.collection('notifications').createIndex({ createdAt: -1 })
```

### 5.2 索引优化建议

**何时需要索引**：
- 经常用于查询条件的字段
- 经常用于排序的字段
- 经常用于关联查询的字段

**何时不需要索引**：
- 数据量很小的集合（< 1000 条）
- 很少查询的字段
- 字段值重复率很高的字段

---

## 6. 数据迁移

### 6.1 字段变更记录

**【TODO：记录每次字段变更】**

示例：
```
2026-04-24：
- leads 集合新增 lastFollowUpAt 字段（用于红点提示）
- 需要批量更新现有数据

2026-04-25：
- shareAccess 集合新增（分享查看权限功能）
```

### 6.2 数据迁移脚本

**示例：批量更新 lastFollowUpAt**
```javascript
// 在云开发控制台执行
const db = wx.cloud.database()
const _ = db.command

// 获取所有客户
const leads = await db.collection('leads').get()

// 遍历更新
for (const lead of leads.data) {
  // 查询最后一条跟进记录
  const followUps = await db.collection('followUps')
    .where({ relatedId: lead._id })
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get()

  if (followUps.data.length > 0) {
    const lastFollowUp = followUps.data[0]
    await db.collection('leads').doc(lead._id).update({
      data: {
        lastFollowUpAt: lastFollowUp.createdAt
      }
    })
  }
}
```

---

**最后更新**：2026-04-27
**维护者**：XIN
