# 小程序施工节点功能分析

> 分析日期：2026-05-03
> 目的：为网页端实现提供准确的参考

---

## 一、核心功能概述

小程序的施工节点管理包含以下核心功能：

1. **编辑模式**：可以添加/删除大节点和子工序、修改名称、拖拽排序
2. **子工序排期编辑**：点击子工序 → 打开详情浮窗 → 点击"编辑排期" → 修改开工/完工日期
3. **实际时间记录**：通过"添加记录"（验收）功能自动记录 `actualStartDate` 和 `actualEndDate`
4. **验收照片上传**：在验收弹窗中上传现场照片和填写说明
5. **延期记录**：大节点级别的延期记录功能（本次暂不实现）

---

## 二、数据结构

### 2.1 大节点（Major Node）

```typescript
interface MajorNode {
  name: string;
  duration: number;  // 计划工期（天数）
  status: 'pending' | 'current' | 'completed';
  startDate: string;  // 预计开工日期 YYYY-MM-DD
  endDate: string;    // 预计完工日期 YYYY-MM-DD
  actualStartDate?: string;  // 实际开工日期
  actualEndDate?: string;    // 实际完工日期
  expanded: boolean;  // UI 状态：是否展开
  records: any[];     // 施工记录（照片+说明）
  delayRecords: any[];  // 延期记录
  subNodes: SubNode[];
}
```

### 2.2 子工序（Sub Node）

```typescript
interface SubNode {
  name: string;
  duration: number;  // 计划工期（天数）
  status: 'pending' | 'current' | 'completed' | 'awaiting_signature';
  startDate: string;  // 预计开工日期
  endDate: string;    // 预计完工日期
  actualStartDate?: string;  // 实际开工日期
  actualEndDate?: string;    // 实际完工日期
  records: any[];  // 施工记录
  acceptanceRecord?: {  // 验收记录
    remark: string;
    delayReason: string;  // 逾期原因
    photos: Array<{url: string, type: 'image' | 'video'}>;
    inspector: string;  // 验收人
    createdAt: string;  // 创建时间
    editedAt?: string;  // 编辑时间
    editedBy?: string;  // 编辑人
  };
  signature?: {  // 客户签字（仅首尾节点）
    url: string;
    time: string;
    feedback: string;
  };
  draft?: {  // 草稿（临时存储，不保存到数据库）
    remark: string;
    delayReason: string;
    photos: any[];
  };
}
```

---

## 三、关键业务逻辑

### 3.1 编辑排期流程

**触发入口**：子工序详情浮窗 → "编辑排期"按钮

**UI 交互**：
1. 弹出编辑排期模态框
2. 显示当前工序名称
3. 两个日期选择器：
   - 预计开工日期（`editSubStartDate`）
   - 预计完工日期（`editSubEndDate`）
4. 日期联动逻辑：
   - 如果开工日期 > 完工日期，则完工日期自动同步为开工日期
   - 如果完工日期 < 开工日期，则开工日期自动同步为完工日期
5. 提示文字："确认后，此工序之后的所有工序将自动顺延"

**保存逻辑**（`confirmSubNodeEdit` 函数）：
```javascript
// 1. 自动计算工期
const start = new Date(editSubStartDate.replace(/-/g, '/')).getTime();
const end = new Date(editSubEndDate.replace(/-/g, '/')).getTime();
const duration = Math.max(1, Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1);

// 2. 更新当前子工序
sub.startDate = editSubStartDate;
sub.duration = duration;
sub.endDate = editSubEndDate;

// 3. 调用 _recalculateFromSubNode 重算后续所有工序
nodes = this._recalculateFromSubNode(nodes, popupMajorIdx, popupSubIdx);

// 4. 如果修改的是第一个大节点的第一个子工序，同步更新工地的整体开工日期
if (popupMajorIdx === 0 && popupSubIdx === 0) {
  updateData.startDate = editSubStartDate;
}

// 5. 保存到数据库
db.collection('projects').doc(this.data.id).update({ data: updateData });

// 6. 写入系统跟进记录
this.addSystemFollowUpToLead(`调整了施工排期\n【${majorNode.name} - ${subNode.name}】\n开工：${editSubStartDate}\n完工：${editSubEndDate}\n工期：${duration}天\n预计总完工：${expectedEndDate}`);
```

### 3.2 实际时间记录流程

**触发入口**：子工序详情浮窗 → "添加记录"按钮

**UI 交互**：
1. 弹出验收弹窗（`showAcceptanceModal`）
2. 可以填写：
   - 现场说明（`acceptanceRemark`）
   - 上传照片/视频（`acceptancePhotos`）
   - 逾期原因（`delayReason`，仅当实际完工日期 > 预计完工日期时需要填写）
3. 提交后自动记录实际时间

**保存逻辑**（`submitAcceptance` 函数）：
```javascript
// 1. 上传照片到云存储
const uploadTasks = acceptancePhotos.map((item, index) => {
  const cloudPath = `acceptance/${projectId}/${majorIdx}_${subIdx}_${Date.now()}_${index}.${ext}`;
  return wx.cloud.uploadFile({ cloudPath, filePath: path });
});

// 2. 创建验收记录
const record = {
  remark: acceptanceRemark,
  delayReason: delayReason || '',
  photos: fileIDs,
  inspector: userName,
  createdAt: nowFull,
  editedAt: acceptanceMode === 'edit' ? nowFull : undefined,
  editedBy: acceptanceMode === 'edit' ? userName : undefined
};
sub.acceptanceRecord = record;

// 3. 记录实际时间
if (acceptanceMode === 'new' || acceptanceMode === 'draft') {
  // 判断是否是首尾节点（交底/验收），如果是，则状态变更为待确认，否则直接已完成
  const isFirstOrLast = popupSubIdx === 0 || popupSubIdx === nodes[popupMajorIdx].subNodes.length - 1;
  sub.status = isFirstOrLast ? 'awaiting_signature' : 'completed';

  if (!sub.actualStartDate) sub.actualStartDate = nowStr;
  sub.actualEndDate = nowStr;

  // 激活下一个工序
  if (sub.status === 'completed' && popupSubIdx + 1 < nodes[popupMajorIdx].subNodes.length) {
    nodes[popupMajorIdx].subNodes[popupSubIdx + 1].status = 'current';
  }

  // 重算排期
  nodes = this.recalculateGantt(nodes, this.data.project.startDate);
}

// 4. 检查大节点是否全部完成
const allCompleted = nodes[popupMajorIdx].subNodes.every(s => s.status === 'completed');
if (allCompleted) {
  nodes[popupMajorIdx].status = 'completed';
  nodes[popupMajorIdx].endDate = nowStr;
  nodes[popupMajorIdx].actualEndDate = nowStr;
  // 激活下一个大节点
  if (popupMajorIdx + 1 < nodes.length) {
    nodes[popupMajorIdx + 1].status = 'current';
    nodes[popupMajorIdx + 1].actualStartDate = nowStr;
    nodes[popupMajorIdx + 1].subNodes[0].status = 'current';
  }
}

// 5. 保存到数据库
db.collection('projects').doc(this.data.id).update({ data: { nodesData: nodes, ... } });

// 6. 触发通知和跟进记录
this.addSystemFollowUpToLead(content);
```

### 3.3 排期重算逻辑

**函数**：`_recalculateFromSubNode(nodes, majorIdx, subIdx)`

**逻辑**：
1. 从修改的子工序开始，顺延同大节点内的后续子工序
2. 更新大节点的 `startDate` 和 `endDate`
3. 顺延后续所有大节点及其子工序
4. 跳过已完成的工序（使用实际完工日期）

---

## 四、UI 展示逻辑

### 4.1 子工序详情浮窗

**显示内容**：
1. 顶部：工序名称 + 状态标签
2. 时间与工期信息卡片（3列布局）：
   - 左列：预计开工、实际开工
   - 中列：预计工期、实际用时（仅已完成时显示）
   - 右列：预计完工、实际完工
3. 验收人信息（仅已完成时显示）
4. 逾期原因（仅逾期时显示）
5. 施工现场记录（照片网格 + 文字说明）
6. 客户签字确认（仅首尾节点且已签字时显示）

**底部操作按钮**：
- 未完成且未待确认：`[编辑排期]` `[添加记录]`
- 已完成或待确认：`[修改记录]` `[分享确认单/验收单]`

### 4.2 时间显示格式

**日期范围显示**（`ganttUtil.formatDateRange`）：
- 同年：`2026-05-01 ~ 05-05`
- 跨年：`2025-12-28 ~ 2026-01-05`

**实际用时计算**（`ganttUtil.getActualDays`）：
```javascript
Math.max(1, Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1)
```

**逾期天数计算**（`ganttUtil.getDelayDays`）：
```javascript
if (actual <= expected) return 0;
return Math.floor((actual - expected) / (1000 * 60 * 60 * 24));
```

---

## 五、网页端实现要点

### 5.1 必须实现的功能

1. ✅ 编辑模式（已有）
2. ✅ 子工序详情浮窗（需增强）
3. ✅ 编辑排期功能（新增）
4. ✅ 验收记录功能（新增）
5. ✅ 实际时间记录（新增）
6. ✅ 照片上传（复用 FolderSelectModal 或新建验收专用组件）

### 5.2 暂不实现的功能

1. ❌ 延期记录功能（大节点级别）
2. ❌ 客户签字确认（小程序专属功能）
3. ❌ 分享卡片生成（小程序专属功能）
4. ❌ 节点拖拽排序（编辑模式已有，但不是本次重点）

### 5.3 关键差异点

| 功能 | 小程序 | 网页端 |
|------|--------|--------|
| 照片上传 | 直接上传到云存储 | 通过 `/api/upload` 上传 |
| 照片显示 | 使用 `cloud://` 链接 | 通过 `/api/download` 获取临时 URL |
| 日期选择器 | 微信原生 `<picker mode="date">` | 自定义 `DatePicker` 组件 |
| 文件夹选择 | 无（验收照片不分文件夹） | 可选：是否复用 `FolderSelectModal` |

### 5.4 实现顺序建议

1. **阶段 1**：子工序详情浮窗增强（显示完整信息）
2. **阶段 2**：编辑排期功能（模态框 + 日期选择 + 保存逻辑）
3. **阶段 3**：验收记录功能（模态框 + 照片上传 + 保存逻辑）
4. **阶段 4**：实际时间记录和排期重算（后端逻辑）
5. **阶段 5**：测试和调试

---

## 六、API 需求

### 6.1 现有 API（需确认）

- `GET /api/projects/[id]` - 获取工地详情（包含 `nodesData`）
- `PUT /api/projects/[id]` - 更新工地信息（包含 `nodesData`）
- `POST /api/upload` - 上传文件
- `POST /api/download` - 获取文件临时 URL

### 6.2 可能需要新增的 API

- `POST /api/projects/[id]/nodes/[majorIdx]/subnodes/[subIdx]/acceptance` - 提交验收记录（可选，也可以直接用 PUT /api/projects/[id]）
- `PUT /api/projects/[id]/nodes/[majorIdx]/subnodes/[subIdx]/schedule` - 更新子工序排期（可选）

**建议**：直接使用 `PUT /api/projects/[id]` 更新整个 `nodesData` 数组，保持与小程序一致的数据结构。

---

**文档结束**
