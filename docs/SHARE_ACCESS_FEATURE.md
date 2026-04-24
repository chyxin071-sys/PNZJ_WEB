# 客户查看权限申请功能说明

## 功能概述

这个功能允许外部用户（客户及其家属/朋友）查看工地进度时需要先申请权限，由工地相关员工审批后才能查看。业主本人可以通过手机号验证自动通过。

## 功能流程

### 1. 外部用户访问工地分享链接

当外部用户打开工地分享链接（`/pages/projectShare/index?id=xxx`）时：

1. **员工身份检查**：如果是内部员工（有 userInfo 且 role 是 admin/manager/sales/designer/finance），直接放行
2. **访问权限检查**：
   - 查询 `shareAccess` 集合，看该用户（openid）是否已有 `approved` 状态的记录
   - 如果有，直接放行查看
   - 如果没有，进入下一步

### 2. 手机号验证（业主本人）

- 显示"微信一键验证手机号"按钮
- 用户授权后，调用 `getPhoneNumber` 云函数获取手机号
- 查询该工地关联的 lead（客户），比对手机号
- **如果匹配**：自动写入 `approved` 状态记录，标记 `autoApproved: true`，直接放行
- **如果不匹配**：进入申请流程

### 3. 申请查看权限

用户填写申请表单：
- 姓名（必填）
- 与业主关系（必填）
- 联系电话（选填）

提交后：
- 写入 `shareAccess` 集合，状态为 `pending`
- 通知工地相关员工（销售、设计师、项目经理）+ 所有管理员
- 显示"申请已提交，等待审核"页面

### 4. 员工审批

工地相关员工或管理员：
1. 在工地详情页点击"查看申请"按钮
2. 进入 `/pages/shareAccessManage/index` 页面
3. 看到所有申请记录（待审核/已通过/已拒绝）
4. 点击"通过"或"拒绝"按钮
5. 审批后，申请人会收到订阅消息通知（如果有订阅）

### 5. 申请结果

- **已通过**：用户再次打开分享链接时，自动放行查看
- **已拒绝**：显示"申请未通过"页面
- **待审核**：显示"申请已提交，等待审核"页面

## 数据库设计

### shareAccess 集合

```javascript
{
  _id: "自动生成",
  projectId: "工地ID",
  openid: "用户openid",
  name: "申请人姓名",
  relation: "与业主关系",
  phone: "联系电话（可选）",
  status: "pending | approved | rejected",
  autoApproved: true/false, // 是否自动通过（业主本人）
  createdAt: serverDate(),
  displayTime: "2026-04-24 14:30" // 格式化时间字符串
}
```

### 建议索引

```javascript
// 复合索引：projectId + openid + status
db.collection('shareAccess').createIndex({
  projectId: 1,
  openid: 1,
  status: 1
});

// 单字段索引：projectId（用于查询某工地的所有申请）
db.collection('shareAccess').createIndex({
  projectId: 1
});
```

## 云函数

### getPhoneNumber

- 路径：`mini-program/cloudfunctions/getPhoneNumber/`
- 功能：调用微信开放接口 `phonenumber.getPhoneNumber` 解密手机号
- 权限配置：需要在 `config.json` 中声明 `openapi` 权限

**部署步骤**：
1. 在微信开发者工具中，右键点击 `getPhoneNumber` 文件夹
2. 选择"上传并部署：云端安装依赖"
3. 等待部署完成

## 订阅消息模板

### SHARE_ACCESS_REQUEST

- 模板ID：`uf4dv38Z7XlV9K3tA_b75xQaJ46M7gnGbh9e7om18gw`
- 用途：通知员工有新的查看申请 / 通知申请人审批结果
- 字段：
  - `time1`：时间
  - `thing2`：申请信息（20字以内）

## 页面入口

### 工地详情页（projectDetail）

在"快捷操作区"新增"查看申请"按钮，点击跳转到 `/pages/shareAccessManage/index?projectId=xxx`

### 分享链接

- 完整时间轴：`/pages/projectShare/index?id=xxx`
- 单节点报告：`/pages/projectShare/index?id=xxx&majorIdx=0&subIdx=1`

## 注意事项

1. **外部用户无 users 记录**：外部用户（客户家属/朋友）没有 `users` 集合记录，只有 openid，所以审批结果通知可能无法送达（除非他们也注册了小程序账号）
2. **业主本人自动通过**：只要手机号匹配，就会自动通过，不需要审批
3. **员工直接放行**：内部员工（有 role 字段）直接跳过所有权限检查
4. **状态刷新**：用户从待审核页面返回后，会自动重新检查权限状态（`onShow` 生命周期）

## 测试建议

1. **业主本人测试**：用业主的手机号注册微信，打开分享链接，验证手机号，应该自动通过
2. **非业主测试**：用其他手机号，填写申请表单，提交后应该显示待审核
3. **员工审批测试**：用员工账号登录，进入工地详情页，点击"查看申请"，审批通过/拒绝
4. **状态刷新测试**：审批后，让申请人重新打开分享链接，验证状态是否更新

## 部署清单

### 已完成的文件

- ✅ `mini-program/pages/shareAccessManage/` — 查看申请管理页面
- ✅ `mini-program/cloudfunctions/getPhoneNumber/` — 获取手机号云函数（含 `config.json` openapi 权限配置）
- ✅ `mini-program/utils/subscribe.js` — 新增 `SHARE_ACCESS_REQUEST` 模板ID
- ✅ `mini-program/pages/projectDetail/index.wxml` — 快捷操作区改为 2x2 网格，新增"查看申请"按钮
- ✅ `mini-program/pages/projectDetail/index.js` — 新增 `goToAccessManage()` 方法
- ✅ `mini-program/pages/projectShare/index.js` — 完整访问控制逻辑
- ✅ `mini-program/app.json` — 已注册 `shareAccessManage` 页面

### 部署步骤

**第一步：部署云函数**
1. 微信开发者工具 → 右键 `cloudfunctions/getPhoneNumber/` → "上传并部署：云端安装依赖"
2. 在云开发控制台 > 云函数 中确认 `getPhoneNumber` 已部署

**第二步：确认订阅消息模板**
- 模板ID：`uf4dv38Z7XlV9K3tA_b75xQaJ46M7gnGbh9e7om18gw`
- 字段：`time1`（时间）、`thing2`（申请信息，20字以内）

**第三步：创建数据库集合**
- 集合名：`shareAccess`
- 权限：所有用户可读写（后续可改为云函数控制）
- 建议索引：
  ```json
  { "projectId": 1, "openid": 1, "status": 1 }
  { "projectId": 1, "createdAt": -1 }
  ```

**第四步：上传代码**
- 版本号：v1.1.0
- 备注："新增客户查看权限申请功能"

### 已知问题

1. **外部用户无法收到审批通知** — 外部用户没有 `users` 集合记录，订阅消息无法送达
2. **申请记录无分页** — 当前限制 50 条

### 后续优化建议

1. 申请撤回功能
2. 批量审批功能
3. 申请理由字段
4. 权限有效期设置
5. 短信通知（外部用户）
