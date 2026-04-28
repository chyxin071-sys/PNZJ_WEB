# API 接口文档

> 本文档详细说明所有 API 接口的请求方式、参数、响应格式等。

---

## 📋 目录

1. [接口概览](#接口概览)
2. [认证接口](#认证接口)
3. [客户管理接口](#客户管理接口)
4. [工地管理接口](#工地管理接口)
5. [报价管理接口](#报价管理接口)
6. [材料与库存接口](#材料与库存接口)
7. [待办与通知接口](#待办与通知接口)
8. [员工管理接口](#员工管理接口)
9. [文件上传接口](#文件上传接口)
10. [错误码说明](#错误码说明)

---

## 1. 接口概览

### 1.1 基础信息

**Base URL**：
- 开发环境：`http://localhost:3000`
- 生产环境：`https://你的域名`

**请求格式**：
- Content-Type: `application/json`
- 编码：UTF-8

**响应格式**：
```json
{
  "success": true,
  "data": {},
  "message": "操作成功"
}
```

**错误响应**：
```json
{
  "success": false,
  "error": "错误信息",
  "code": "ERROR_CODE"
}
```

### 1.2 接口列表

| 模块 | 接口数量 | 路径前缀 |
|------|---------|---------|
| 认证 | 2 | /api/auth |
| 客户管理 | 5 | /api/leads |
| 工地管理 | 5 | /api/projects |
| 报价管理 | 5 | /api/quotes |
| 材料管理 | 5 | /api/materials |
| 库存管理 | 3 | /api/inventory |
| 待办事项 | 5 | /api/todos |
| 通知消息 | 4 | /api/notifications |
| 跟进记录 | 4 | /api/followUps |
| 员工管理 | 5 | /api/employees |
| 文件上传 | 1 | /api/upload |
| 数据导入 | 1 | /api/import |

---

## 2. 认证接口

### 2.1 登录

**接口**：`POST /api/auth/login`

**说明**：用户登录，返回 JWT token

**请求参数**：
```json
{
  "account": "admin",
  "password": "123456"
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "user_001",
      "account": "admin",
      "name": "管理员",
      "role": "admin",
      "phone": "13800138000"
    }
  }
}
```

**错误响应**：
```json
{
  "success": false,
  "error": "账号或密码错误"
}
```

---

### 2.2 修改密码

**接口**：`POST /api/auth/password`

**说明**：修改当前用户密码

**请求头**：
```
Authorization: Bearer {token}
```

**请求参数**：
```json
{
  "oldPassword": "123456",
  "newPassword": "654321"
}
```

**响应**：
```json
{
  "success": true,
  "message": "密码修改成功"
}
```

---

## 3. 客户管理接口

### 3.1 获取客户列表

**接口**：`GET /api/leads`

**说明**：获取所有客户列表

**查询参数**：
```
?status=待跟进          # 按状态筛选（可选）
&manager=user_001      # 按负责人筛选（可选）
&keyword=张三          # 搜索关键词（可选）
&page=1               # 页码（可选，默认1）
&limit=20             # 每页数量（可选，默认20）
```

**响应**：
```json
{
  "success": true,
  "data": [
    {
      "_id": "lead_001",
      "customerNo": "KH20260427001",
      "customerName": "张三",
      "phone": "13800138000",
      "status": "待跟进",
      "manager": {
        "_id": "user_001",
        "name": "李四"
      },
      "lastFollowUpAt": { "$date": 1714147200000 },
      "createdAt": { "$date": 1714147200000 }
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

---

### 3.2 获取客户详情

**接口**：`GET /api/leads/{id}`

**说明**：获取指定客户的详细信息

**响应**：
```json
{
  "success": true,
  "data": {
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
    "createdAt": { "$date": 1714147200000 }
  }
}
```

---

### 3.3 创建客户

**接口**：`POST /api/leads`

**说明**：创建新客户

**请求参数**：
```json
{
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
  "notes": "客户比较注重环保"
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "_id": "lead_001",
    "customerNo": "KH20260427001",
    ...
  }
}
```

---

### 3.4 更新客户

**接口**：`PUT /api/leads/{id}`

**说明**：更新客户信息

**请求参数**：
```json
{
  "customerName": "张三",
  "phone": "13800138000",
  "status": "已报价",
  ...
}
```

**响应**：
```json
{
  "success": true,
  "message": "更新成功"
}
```

---

### 3.5 删除客户

**接口**：`DELETE /api/leads/{id}`

**说明**：删除客户（软删除）

**响应**：
```json
{
  "success": true,
  "message": "删除成功"
}
```

---

## 4. 工地管理接口

### 4.1 获取工地列表

**接口**：`GET /api/projects`

**查询参数**：
```
?status=施工中         # 按状态筛选（可选）
&manager=user_002     # 按项目经理筛选（可选）
&keyword=朝阳         # 搜索关键词（可选）
```

**响应**：
```json
{
  "success": true,
  "data": [
    {
      "_id": "project_001",
      "projectNo": "GD20260427001",
      "projectName": "朝阳区xxx小区",
      "customer": {
        "name": "张三",
        "phone": "13800138000"
      },
      "manager": {
        "_id": "user_002",
        "name": "王五"
      },
      "status": "施工中",
      "startDate": { "$date": 1714147200000 },
      "createdAt": { "$date": 1714147200000 }
    }
  ]
}
```

---

### 4.2 获取工地详情

**接口**：`GET /api/projects/{id}`

**响应**：
```json
{
  "success": true,
  "data": {
    "_id": "project_001",
    "projectNo": "GD20260427001",
    "projectName": "朝阳区xxx小区",
    "leadId": "lead_001",
    "customer": {
      "name": "张三",
      "phone": "13800138000"
    },
    "manager": {
      "_id": "user_002",
      "name": "王五"
    },
    "status": "施工中",
    "address": "北京市朝阳区...",
    "area": 120,
    "contractAmount": 150000,
    "startDate": { "$date": 1714147200000 },
    "endDate": { "$date": 1714147200000 },
    "schedule": [
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
    ],
    "photos": ["cloud://xxx.jpg"],
    "files": [
      {
        "name": "施工图.pdf",
        "url": "https://..."
      }
    ],
    "createdAt": { "$date": 1714147200000 }
  }
}
```

---

### 4.3 创建工地

**接口**：`POST /api/projects`

**请求参数**：
```json
{
  "projectName": "朝阳区xxx小区",
  "leadId": "lead_001",
  "customer": {
    "name": "张三",
    "phone": "13800138000"
  },
  "manager": {
    "_id": "user_002",
    "name": "王五"
  },
  "address": "北京市朝阳区...",
  "area": 120,
  "contractAmount": 150000,
  "notes": "注意保护地板"
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "_id": "project_001",
    "projectNo": "GD20260427001",
    ...
  }
}
```

---

### 4.4 更新工地

**接口**：`PUT /api/projects/{id}`

**请求参数**：
```json
{
  "projectName": "朝阳区xxx小区",
  "status": "已完工",
  "schedule": [...],
  ...
}
```

**响应**：
```json
{
  "success": true,
  "message": "更新成功"
}
```

---

### 4.5 删除工地

**接口**：`DELETE /api/projects/{id}`

**响应**：
```json
{
  "success": true,
  "message": "删除成功"
}
```

---

## 5. 报价管理接口

### 5.1 获取报价列表

**接口**：`GET /api/quotes`

**查询参数**：
```
?status=已发送         # 按状态筛选（可选）
&leadId=lead_001      # 按客户筛选（可选）
```

**响应**：
```json
{
  "success": true,
  "data": [
    {
      "_id": "quote_001",
      "quoteNo": "BJ20260427001",
      "customer": {
        "name": "张三",
        "phone": "13800138000"
      },
      "totalAmount": 150000,
      "status": "已发送",
      "createdBy": {
        "_id": "user_001",
        "name": "李四"
      },
      "createdAt": { "$date": 1714147200000 }
    }
  ]
}
```

---

### 5.2 获取报价详情

**接口**：`GET /api/quotes/{id}`

**响应**：
```json
{
  "success": true,
  "data": {
    "_id": "quote_001",
    "quoteNo": "BJ20260427001",
    "leadId": "lead_001",
    "customer": {
      "name": "张三",
      "phone": "13800138000"
    },
    "items": [
      {
        "name": "水电改造",
        "unit": "项",
        "quantity": 1,
        "price": 5000,
        "amount": 5000,
        "notes": "包含材料费"
      }
    ],
    "totalAmount": 150000,
    "status": "已发送",
    "notes": "包含材料费",
    "attachments": [
      {
        "name": "报价明细.xlsx",
        "url": "https://..."
      }
    ],
    "createdBy": {
      "_id": "user_001",
      "name": "李四"
    },
    "createdAt": { "$date": 1714147200000 }
  }
}
```

---

### 5.3 创建报价

**接口**：`POST /api/quotes`

**请求参数**：
```json
{
  "leadId": "lead_001",
  "customer": {
    "name": "张三",
    "phone": "13800138000"
  },
  "items": [
    {
      "name": "水电改造",
      "unit": "项",
      "quantity": 1,
      "price": 5000,
      "amount": 5000,
      "notes": "包含材料费"
    }
  ],
  "totalAmount": 150000,
  "status": "草稿",
  "notes": "包含材料费"
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "_id": "quote_001",
    "quoteNo": "BJ20260427001",
    ...
  }
}
```

---

### 5.4 更新报价

**接口**：`PUT /api/quotes/{id}`

**请求参数**：同创建报价

**响应**：
```json
{
  "success": true,
  "message": "更新成功"
}
```

---

### 5.5 删除报价

**接口**：`DELETE /api/quotes/{id}`

**响应**：
```json
{
  "success": true,
  "message": "删除成功"
}
```

---

## 6. 材料与库存接口

### 6.1 获取材料列表

**接口**：`GET /api/materials`

**查询参数**：
```
?category=地面材料     # 按分类筛选（可选）
&status=上架          # 按状态筛选（可选）
&keyword=瓷砖         # 搜索关键词（可选）
```

**响应**：
```json
{
  "success": true,
  "data": [
    {
      "_id": "material_001",
      "name": "瓷砖",
      "category": "地面材料",
      "brand": "马可波罗",
      "model": "CH8295AS",
      "spec": "800x800mm",
      "unit": "片",
      "price": 50,
      "status": "上架",
      "description": "防滑耐磨",
      "images": ["cloud://xxx.jpg"],
      "createdAt": { "$date": 1714147200000 }
    }
  ]
}
```

---

### 6.2 创建材料

**接口**：`POST /api/materials`

**请求参数**：
```json
{
  "name": "瓷砖",
  "category": "地面材料",
  "brand": "马可波罗",
  "model": "CH8295AS",
  "spec": "800x800mm",
  "unit": "片",
  "price": 50,
  "status": "上架",
  "description": "防滑耐磨"
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "_id": "material_001",
    ...
  }
}
```

---

### 6.3 更新材料

**接口**：`PUT /api/materials/{id}`

**请求参数**：同创建材料

**响应**：
```json
{
  "success": true,
  "message": "更新成功"
}
```

---

### 6.4 删除材料

**接口**：`DELETE /api/materials/{id}`

**响应**：
```json
{
  "success": true,
  "message": "删除成功"
}
```

---

### 6.5 获取库存列表

**接口**：`GET /api/inventory`

**查询参数**：
```
?materialId=material_001  # 按材料筛选（可选）
&projectId=project_001    # 按工地筛选（可选）
```

**响应**：
```json
{
  "success": true,
  "data": [
    {
      "_id": "inventory_001",
      "materialId": "material_001",
      "material": {
        "name": "瓷砖",
        "unit": "片"
      },
      "type": "入库",
      "quantity": 100,
      "currentStock": 500,
      "notes": "采购入库",
      "operator": {
        "_id": "user_001",
        "name": "李四"
      },
      "createdAt": { "$date": 1714147200000 }
    }
  ]
}
```

---

### 6.6 创建库存记录（出入库）

**接口**：`POST /api/inventory`

**请求参数**：
```json
{
  "materialId": "material_001",
  "type": "入库",
  "quantity": 100,
  "projectId": "project_001",  // 出库时必填
  "notes": "采购入库"
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "_id": "inventory_001",
    "currentStock": 500,
    ...
  }
}
```

---

## 7. 待办与通知接口

### 7.1 获取待办列表

**接口**：`GET /api/todos`

**查询参数**：
```
?status=pending       # 按状态筛选（可选）
&assignee=user_001   # 按执行人筛选（可选）
```

**响应**：
```json
{
  "success": true,
  "data": [
    {
      "_id": "todo_001",
      "title": "回访客户",
      "content": "了解客户最新需求",
      "dueDate": { "$date": 1714147200000 },
      "status": "pending",
      "assignee": {
        "_id": "user_001",
        "name": "李四"
      },
      "relatedType": "lead",
      "relatedId": "lead_001",
      "createdBy": {
        "_id": "user_002",
        "name": "王五"
      },
      "createdAt": { "$date": 1714147200000 }
    }
  ]
}
```

---

### 7.2 创建待办

**接口**：`POST /api/todos`

**请求参数**：
```json
{
  "title": "回访客户",
  "content": "了解客户最新需求",
  "dueDate": { "$date": 1714147200000 },
  "assignee": {
    "_id": "user_001",
    "name": "李四"
  },
  "relatedType": "lead",
  "relatedId": "lead_001"
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "_id": "todo_001",
    ...
  }
}
```

---

### 7.3 更新待办

**接口**：`PUT /api/todos/{id}`

**请求参数**：
```json
{
  "status": "completed",
  "completedAt": { "$date": 1714147200000 }
}
```

**响应**：
```json
{
  "success": true,
  "message": "更新成功"
}
```

---

### 7.4 获取通知列表

**接口**：`GET /api/notifications`

**查询参数**：
```
?userId=user_001     # 按用户筛选（必填）
&isRead=false        # 按已读状态筛选（可选）
```

**响应**：
```json
{
  "success": true,
  "data": [
    {
      "_id": "notification_001",
      "userId": "user_001",
      "title": "新待办",
      "content": "李四给你分配了一个待办",
      "type": "todo",
      "relatedId": "todo_001",
      "isRead": false,
      "createdAt": { "$date": 1714147200000 }
    }
  ]
}
```

---

### 7.5 标记通知已读

**接口**：`PUT /api/notifications/{id}`

**请求参数**：
```json
{
  "isRead": true
}
```

**响应**：
```json
{
  "success": true,
  "message": "标记成功"
}
```

---

## 8. 员工管理接口

### 8.1 获取员工列表

**接口**：`GET /api/employees`

**查询参数**：
```
?role=sales          # 按角色筛选（可选）
&status=active       # 按状态筛选（可选）
```

**响应**：
```json
{
  "success": true,
  "data": [
    {
      "_id": "user_001",
      "account": "zhangsan",
      "name": "张三",
      "role": "sales",
      "phone": "13800138000",
      "department": "销售部",
      "status": "active",
      "joinDate": { "$date": 1714147200000 },
      "createdAt": { "$date": 1714147200000 }
    }
  ]
}
```

---

### 8.2 创建员工

**接口**：`POST /api/employees`

**权限**：仅 admin

**请求参数**：
```json
{
  "account": "zhangsan",
  "password": "123456",
  "name": "张三",
  "role": "sales",
  "phone": "13800138000",
  "department": "销售部"
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "_id": "user_001",
    ...
  }
}
```

---

### 8.3 更新员工

**接口**：`PUT /api/employees/{id}`

**权限**：仅 admin

**请求参数**：
```json
{
  "name": "张三",
  "role": "manager",
  "phone": "13800138000",
  "department": "项目部",
  "status": "active"
}
```

**响应**：
```json
{
  "success": true,
  "message": "更新成功"
}
```

---

### 8.4 重置密码

**接口**：`POST /api/employees/{id}/reset-password`

**权限**：仅 admin

**请求参数**：
```json
{
  "newPassword": "123456"
}
```

**响应**：
```json
{
  "success": true,
  "message": "密码重置成功"
}
```

---

### 8.5 删除员工

**接口**：`DELETE /api/employees/{id}`

**权限**：仅 admin

**响应**：
```json
{
  "success": true,
  "message": "删除成功"
}
```

---

## 9. 文件上传接口

### 9.1 上传文件

**接口**：`POST /api/upload`

**请求格式**：`multipart/form-data`

**请求参数**：
```
file: 文件对象
type: 文件类型（project/quote/design/avatar）
relatedId: 关联ID（可选）
```

**响应**：
```json
{
  "success": true,
  "data": {
    "url": "https://...",
    "fileId": "cloud://xxx.jpg",
    "fileName": "photo.jpg",
    "fileSize": 102400
  }
}
```

---

## 10. 错误码说明

### 10.1 HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 401 | 未登录或 token 无效 |
| 403 | 无权限访问 |
| 404 | 资源不存在 |
| 500 | 服务器错误 |

### 10.2 业务错误码

| 错误码 | 说明 |
|--------|------|
| AUTH_FAILED | 认证失败 |
| INVALID_TOKEN | Token 无效 |
| PERMISSION_DENIED | 权限不足 |
| RESOURCE_NOT_FOUND | 资源不存在 |
| DUPLICATE_ACCOUNT | 账号已存在 |
| INVALID_PARAMS | 参数错误 |
| DATABASE_ERROR | 数据库错误 |
| UPLOAD_FAILED | 文件上传失败 |

### 10.3 错误响应示例

```json
{
  "success": false,
  "error": "账号或密码错误",
  "code": "AUTH_FAILED"
}
```

---

## 11. 调用示例

### 11.1 JavaScript (Fetch)

```javascript
// 登录
const res = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    account: 'admin',
    password: '123456'
  })
})
const data = await res.json()

// 获取客户列表（带 token）
const token = localStorage.getItem('pnzj_token')
const res = await fetch('/api/leads', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
const data = await res.json()
```

### 11.2 cURL

```bash
# 登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"account":"admin","password":"123456"}'

# 获取客户列表
curl -X GET http://localhost:3000/api/leads \
  -H "Authorization: Bearer {token}"

# 创建客户
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{"customerName":"张三","phone":"13800138000",...}'
```

---

**最后更新**：2026-04-27
**维护者**：XIN
