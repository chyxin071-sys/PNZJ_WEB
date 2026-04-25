# 修复计划 (Fix Plan)

## 1. 修复设计节点“计划天数”未显示问题
**问题原因**：`leadDetail/index.wxml` 中原先使用了 `{{item.duration}}`，但实际数据中可能未定义该字段，历史代码中使用的是 `ganttUtil.getPlanDays(item.startDate, item.endDate)`。
**解决思路**：将 `{{item.duration}}` 替换为 `{{ganttUtil.getPlanDays(item.startDate, item.endDate)}}`，使其能够动态计算并正确显示计划天数。

## 2. 修复项目资料中“移动”按钮不显示并改为黄色
**问题原因**：`projectFiles/index.wxml` 中移动按钮原本使用了 `var(--blue-500)`，可能由于全局样式中未定义该颜色变量导致背景变为白色。
**解决思路**：按照用户要求，将移动按钮的背景颜色修改为黄色（使用 `var(--amber-500)`），确保按钮正常显示且视觉上清晰可见。

## 3. 统一左滑菜单“仅内部”和“公开”按钮颜色
**问题原因**：项目资料 (`projectFiles/index.wxml`) 和设计节点 (`leadDetail/index.wxml`) 中的按钮颜色目前存在不一致。
**解决思路**：统一将这两个页面中的左滑可见性按钮颜色修改为：
- “仅内部”状态下按钮显示为“公开”，使用绿色 `var(--emerald-500)` 或 `var(--emerald-600)`。
- “公开”状态下按钮显示为“仅内部”，使用灰色 `#94a3b8`。

## 4. 同步项目资料和设计工作流中的文件可见性状态
**问题原因**：两个模块的文件可见性切换逻辑（`toggleVisibility` 和 `toggleDesignFileVisibility`）只更新了自身集合的数据，未同步至另一方。
**解决思路**：修改相关的云数据库更新逻辑，当修改其中一处的文件可见性时，同时更新 `leads` 集合中的 `files` 和 `designNodes[x].files` 中对应 `fileID` 的可见性。

## 5. 统一使用微信原生进度条显示上传进度
**问题原因**：目前各处使用了自定义的文本/弹窗进度条。
**解决思路**：去除现有的自定义 `isUploading` 弹窗进度，使用微信原生的 `wx.showLoading` 配合 `wx.hideLoading`，或者使用原生进度条组件/提示。

---
我们将按照以上步骤逐一进行修复和验证。
