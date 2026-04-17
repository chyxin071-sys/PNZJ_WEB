# 数据埋点方案

> 版本：1.0 | 更新日期：2026-04-17

---

## 什么是数据埋点？

**用一句话解释**：埋点就是在用户做某个操作的时候，悄悄记录一条日志，告诉你"谁、在什么时候、做了什么、结果怎样"。

**举个例子**：
- 销售小王今天打开了线索列表 3 次
- 他点击了 5 个客户详情
- 他给 2 个客户添加了跟进记录
- 他新建了 1 条线索

有了这些数据，你就能知道：哪些功能被频繁使用、哪些功能没人用、哪个员工最活跃、哪个环节用户容易卡住。

---

## 为什么要做埋点？

对你的业务来说，埋点能回答这些问题：

1. **销售效率**：哪个销售跟进最勤快？哪个销售的线索转化率最高？
2. **功能使用率**：报价单功能有没有人用？材料库有没有人维护？
3. **系统健康**：哪个页面加载慢？哪个操作经常失败？
4. **业务漏斗**：线索 → 量房 → 方案 → 签单，每个阶段流失了多少？

---

## 推荐方案：轻量级自建埋点

你的系统已经有微信云开发（TCB），最简单的方案是直接在 TCB 里建一个 `events` 集合，记录用户行为。

### 数据结构

每条埋点记录长这样：

```json
{
  "_id": "自动生成",
  "eventName": "lead_followup_added",
  "userId": "用户ID",
  "userName": "张三",
  "userRole": "sales",
  "platform": "web",
  "timestamp": { "$date": 1713340800000 },
  "properties": {
    "leadId": "xxx",
    "leadName": "李四",
    "method": "电话"
  }
}
```

### 需要埋的关键事件

#### CRM 线索模块
| 事件名 | 触发时机 | 重要程度 |
|--------|---------|---------|
| `lead_created` | 新建线索 | ⭐⭐⭐ |
| `lead_followup_added` | 添加跟进记录 | ⭐⭐⭐ |
| `lead_status_changed` | 线索状态变更 | ⭐⭐⭐ |
| `lead_signed` | 线索签单 | ⭐⭐⭐ |
| `lead_lost` | 线索流失 | ⭐⭐⭐ |
| `lead_assigned` | 分配销售/设计师 | ⭐⭐ |
| `lead_viewed` | 查看线索详情 | ⭐ |

#### ERP 项目模块
| 事件名 | 触发时机 | 重要程度 |
|--------|---------|---------|
| `project_created` | 新建项目 | ⭐⭐⭐ |
| `project_started` | 正式开工 | ⭐⭐⭐ |
| `node_completed` | 节点验收完成 | ⭐⭐⭐ |
| `node_delayed` | 节点延期 | ⭐⭐⭐ |
| `project_completed` | 项目竣工 | ⭐⭐⭐ |

#### 其他
| 事件名 | 触发时机 | 重要程度 |
|--------|---------|---------|
| `user_login` | 用户登录 | ⭐⭐ |
| `quote_created` | 新建报价单 | ⭐⭐ |
| `todo_completed` | 待办完成 | ⭐⭐ |
| `file_uploaded` | 上传文件 | ⭐ |

---

## 如何实现（代码层面）

### 网页端：封装一个 track 函数

在 `web/src/lib/analytics.ts` 里写：

```typescript
export async function track(eventName: string, properties: Record<string, any> = {}) {
  try {
    const user = JSON.parse(localStorage.getItem('pnzj_user') || '{}');
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventName,
        userId: user._id || user.id,
        userName: user.name,
        userRole: user.role,
        platform: 'web',
        properties
      })
    });
  } catch (e) {
    // 埋点失败不影响主流程，静默处理
  }
}
```

然后在业务代码里调用：

```typescript
// 添加跟进记录成功后
await track('lead_followup_added', { leadId, method });

// 线索签单后
await track('lead_signed', { leadId, leadName: lead.name, amount: lead.budget });
```

### 小程序端：同样封装一个 track 函数

在 `mini-program/utils/analytics.js` 里写：

```javascript
export function track(eventName, properties = {}) {
  try {
    const userInfo = wx.getStorageSync('userInfo') || {};
    const db = wx.cloud.database();
    db.collection('events').add({
      data: {
        eventName,
        userId: userInfo.id,
        userName: userInfo.name,
        userRole: userInfo.role,
        platform: 'miniprogram',
        timestamp: db.serverDate(),
        properties
      }
    });
    // 不 await，不影响主流程
  } catch (e) {}
}
```

---

## 如何查看埋点数据？

1. **微信云开发控制台**：直接在 TCB 控制台查看 `events` 集合，可以筛选、导出 Excel
2. **在 Dashboard 页面展示**：把埋点数据聚合后展示在首页图表里（这是 1.x 版本可以做的事）
3. **导出分析**：定期导出 CSV，用 Excel 做透视表分析

---

## 注意事项

- 埋点是"只写"操作，不要在埋点失败时影响主业务流程（用 try/catch 包裹，失败静默处理）
- 不要埋太细，先从最重要的 10 个事件开始
- 埋点数据会增长很快，建议 TCB 里设置 `events` 集合的数据保留策略（比如只保留最近 1 年）
- 不要在埋点里存敏感信息（手机号、密码等）
