# 网页端 vs 小程序端 差异分析

> 分析日期：2026-04-25
> 背景：v1.1.0 大量改动集中在小程序端，网页端未同步跟进，本文档记录所有需要对齐的差异点。

---

## 一、红点未读机制（高优先级）

### 小程序端（已实现）
- `leads.lastFollowUpAt`（毫秒时间戳）记录最后一次跟进时间
- 本地存储 `followup_read_${leadId}` 记录用户最后阅读时间
- 三处（客户列表卡片、客户详情 tab、工地详情按钮）统一判断，点任意一处即标记已读

### 网页端（未实现）
- `leads.page.tsx` 里有 `unread` 字段但永远是 `false`（新建时硬编码）
- 没有读取 `lastFollowUpAt`，没有本地存储对比逻辑
- 客户列表的红点永远不会亮

**需要做的事：**
1. `leads/page.tsx` 的 `fetchLeads` 里，对每条 lead 计算 `hasUnread = (lead.lastFollowUpAt || 0) > (localStorage.getItem('followup_read_' + lead._id) || 0)`
2. `leads/[id]/page.tsx` 进入跟进记录 tab 时，执行 `localStorage.setItem('followup_read_' + leadId, Date.now())`，并清除红点状态
3. Web 端的 `followUps` POST API（`/api/followUps/route.ts`）已更新 `lastFollowUp`，但**没有更新 `lastFollowUpAt`**，需要补上

---

## 二、`/api/followUps` POST 缺少 `lastFollowUpAt` 更新（高优先级）

### 当前状态
`web/src/app/api/followUps/route.ts:56` 只更新了 `lastFollowUp`（字符串），没有更新 `lastFollowUpAt`（时间戳）：
```ts
// 当前
{ lastFollowUp: "${nowStr}", updatedAt: { $date: ${Date.now()} } }

// 应该改为
{ lastFollowUp: "${nowStr}", lastFollowUpAt: ${Date.now()}, updatedAt: { $date: ${Date.now()} } }
```

**影响**：Web 端写入的跟进记录不会触发小程序端的红点，两端红点不同步。

---

## 三、签单通知缺少全员广播（高优先级）

### 小程序端（已实现）
签单时向全公司所有员工发送通知（`leads/index.js` 查 `users` 集合全员广播）。

### 网页端（未实现）
`leads/[id]/page.tsx` 的 `handleConfirmSign` 只写了跟进记录，**没有发送任何通知**，全员广播逻辑缺失。

**需要做的事：**
在 `handleConfirmSign` 成功后，调用 `/api/notifications` POST，targets 设为 `'all'` 或查全员列表。

---

## 四、状态变更通知缺失（中优先级）

### 小程序端（已实现）
`leadDetail/index.js` 的 `onStatusChange` 会通知 `sales + creatorName + 所有admin`。

### 网页端（未实现）
`leads/[id]/page.tsx` 的 `handleStatusChange` 只写跟进记录，**没有发通知**。

---

## 五、工地开工通知缺失（中优先级）

### 小程序端（已实现）
`projectDetail/index.js` 的 `confirmStartProject` 调用 `addSystemFollowUpToLead`，内部会通知 `manager + sales + designer + creatorName + 所有admin`。

### 网页端（未实现）
`projects/[id]/page.tsx` 的 `handleStartProject` 只写了跟进记录，**没有发通知**。

---

## 六、工序验收通知缺失（中优先级）

### 小程序端（已实现）
`projectDetail/index.js` 的 `submitAcceptance` 调用 `addSystemFollowUpToLead`，内部发通知。

### 网页端（未实现）
`projects/[id]/page.tsx` 的 `handleSubNodeSubmit` 只写了跟进记录，**没有发通知**。

---

## 七、开工跟进记录内容不一致（低优先级）

### 小程序端
```
工地正式开工
开工日期：2026-05-01
项目经理：张三
预计完工：2026-08-15
```

### 网页端
```
工地正式开工，预计完工日期：2026-08-15
```

缺少开工日期和项目经理信息，建议对齐。

---

## 八、设计工作流通知对象不一致（低优先级）

### 小程序端
开启设计工作流通知：`designer + 所有admin`

### 网页端（`leads/[id]/page.tsx:653`）
```ts
targets: ['admin', lead.designer].filter(Boolean)
```
只通知了一个 admin 字符串，没有查全部 admin 用户，实际上只有名字叫 "admin" 的人才能收到。应改为查 `users` 集合中 `role === 'admin'` 的所有人。

---

## 九、localStorage key 不统一（低优先级）

### 小程序端
统一用 `wx.getStorageSync('userInfo')`

### 网页端
`leads/[id]/page.tsx:61` 同时兼容三个 key：
```ts
localStorage.getItem("pnzj_user") || localStorage.getItem("userInfo") || localStorage.getItem("user")
```
`leads/page.tsx:51` 只读两个：
```ts
localStorage.getItem("userInfo") || localStorage.getItem("pnzj_user")
```
顺序还不一样。应统一为只读 `pnzj_user`，其他 key 是历史遗留，可以清理。

---

## 十、Web 端跟进记录无分页（低优先级）

### 小程序端
`leadDetail/index.js` 已改为三次并发查询，每次 20 条，共 60 条。

### 网页端
`/api/followUps/route.ts` 支持分页参数，但 `leads/[id]/page.tsx` 调用时没有传分页参数，仍然是默认 100 条。

---

## 十一、Web 端签单后无跳转动画触发（低优先级）

### 小程序端
签单后返回列表会有庆祝动画。

### 网页端
`leads/[id]/page.tsx` 签单后设置了 `sessionStorage.setItem('justSignedLead', 'true')`，`leads/page.tsx` 也有读取逻辑，这个是对齐的。✅

---

## 修复优先级汇总

| 编号 | 问题 | 优先级 | 影响 |
|------|------|--------|------|
| 1 | `/api/followUps` POST 缺少 `lastFollowUpAt` 更新 | 🔴 高 | Web 端写入的跟进不触发小程序红点 |
| 2 | Web 端客户列表红点逻辑未实现 | 🔴 高 | 红点功能在 Web 端完全失效 |
| 3 | Web 端客户详情点开跟进 tab 未标记已读 | 🔴 高 | 红点无法消除 |
| 4 | 签单缺少全员通知 | 🟡 中 | 签单后其他人不知道 |
| 5 | 状态变更缺少通知 | 🟡 中 | 相关人员不知道状态变化 |
| 6 | 工地开工缺少通知 | 🟡 中 | 相关人员不知道开工 |
| 7 | 工序验收缺少通知 | 🟡 中 | 相关人员不知道验收进度 |
| 8 | 开工跟进记录内容不一致 | 🟢 低 | 信息不完整 |
| 9 | 设计工作流通知对象不完整 | 🟢 低 | 部分 admin 收不到通知 |
| 10 | localStorage key 不统一 | 🟢 低 | 代码维护问题 |
| 11 | Web 端跟进记录无分页 | 🟢 低 | 超 100 条后数据丢失 |

---

## 建议修复顺序

**第一批（红点功能对齐）：**
1. `web/src/app/api/followUps/route.ts` — 补 `lastFollowUpAt`
2. `web/src/app/leads/page.tsx` — 实现红点判断逻辑
3. `web/src/app/leads/[id]/page.tsx` — 点开跟进 tab 时标记已读

**第二批（通知对齐）：**
4. `leads/[id]/page.tsx` — 签单全员通知
5. `leads/[id]/page.tsx` — 状态变更通知
6. `projects/[id]/page.tsx` — 开工通知
7. `projects/[id]/page.tsx` — 验收通知

**第三批（细节对齐）：**
8-11 按需处理
