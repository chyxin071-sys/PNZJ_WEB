const fs = require('fs');
const path = require('path');

const mpRoot = 'E:/XIN Lab/PNZJ/CM1.0/mini-program';
const indexWxmlPath = path.join(mpRoot, 'pages', 'index', 'index.wxml');
const indexWxssPath = path.join(mpRoot, 'pages', 'index', 'index.wxss');
const indexJsPath = path.join(mpRoot, 'pages', 'index', 'index.js');

// 1. 重写 WXML，增加顶部看板，改变新建按钮位置，优化打勾形式和卡片布局
const indexWxml = `<view class="page-container">

  <!-- 顶部数据看板 -->
  <view class="dashboard">
    <view class="dashboard-header">
      <text class="dashboard-title">团队协同</text>
      <view class="date-display">{{today}}</view>
    </view>
    <view class="dashboard-stats">
      <view class="stat-box" bindtap="switchTab" data-tab="pending">
        <text class="stat-num {{activeTab === 'pending' ? 'text-primary' : ''}}">{{pendingCount}}</text>
        <text class="stat-label">待处理</text>
        <view class="stat-line {{activeTab === 'pending' ? 'active-line' : ''}}"></view>
      </view>
      <view class="stat-box" bindtap="switchTab" data-tab="completed">
        <text class="stat-num {{activeTab === 'completed' ? 'text-primary' : ''}}">{{completedCount}}</text>
        <text class="stat-label">已完成</text>
        <view class="stat-line {{activeTab === 'completed' ? 'active-line' : ''}}"></view>
      </view>
    </view>
  </view>

  <!-- 新建按钮 & 搜索过滤 (固定在看板下方) -->
  <view class="action-bar">
    <view class="search-wrap">
      <icon type="search" size="16" color="#b5a49a" />
      <input placeholder="搜索待办..." placeholder-class="ph" bindinput="onSearch" />
    </view>
    <view class="btn-create-small" bindtap="createTodo">
      <view class="plus-icon"></view>
      <text>新建</text>
    </view>
  </view>

  <!-- 待办列表区 -->
  <scroll-view scroll-y class="list-container">
    <view class="todo-card {{item.status === 'completed' ? 'opacity-60' : ''}}" wx:for="{{todos}}" wx:key="id" bindtap="onTodoTap">
      
      <!-- 头部：标题、优先级与全新设计的打勾 -->
      <view class="card-header">
        <view class="checkbox {{item.status === 'completed' ? 'checked' : ''}}" catchtap="toggleTodo" data-id="{{item.id}}">
          <view wx:if="{{item.status === 'completed'}}" class="checkmark"></view>
        </view>
        <text class="title {{item.status === 'completed' ? 'line-through' : ''}}">{{item.title}}</text>
      </view>

      <!-- 主体：描述、附件 -->
      <view class="card-body">
        <!-- 优先级独立显示在描述上方，不再和人员标签混淆，采用纯色块点缀 -->
        <view class="meta-row mb-2" wx:if="{{item.status !== 'completed'}}">
          <view class="priority-dot priority-bg-{{item.priority}}"></view>
          <text class="priority-text priority-color-{{item.priority}}">{{item.priorityText}}</text>
        </view>

        <text class="desc" wx:if="{{item.description}}">{{item.description}}</text>
        
        <view class="attachments" wx:if="{{item.attachments && item.attachments.length > 0}}">
          <view class="att-pill" wx:for="{{item.attachments}}" wx:key="name" wx:for-item="att">
            <view class="icon-clip"></view>
            <text>{{att.name}}</text>
          </view>
        </view>
      </view>

      <!-- 底部：关联对象、日期、执行人 -->
      <view class="card-footer">
        <view class="related-info" catchtap="goToRelated" data-type="{{item.relatedTo.type}}" data-id="{{item.relatedTo.id}}">
          <text class="related-tag">{{item.relatedTo.type === 'lead' ? '线索' : '工地'}}</text>
          <text class="related-name">{{item.relatedTo.name}}</text>
        </view>
        
        <view class="flex items-center justify-between mt-3">
          <text class="date">{{item.dueDate}}</text>
          <!-- 人员标签：保留背景色区分角色，但去除了粗边框，更轻量 -->
          <view class="role-badge role-{{item.assignedTo.role}}">{{item.assignedTo.name}}</view>
        </view>
      </view>

    </view>
    
    <view class="empty-state" wx:if="{{todos.length === 0}}">
      <view class="empty-icon"></view>
      <text>暂无相关待办</text>
    </view>
    
    <view class="bottom-padding"></view>
  </scroll-view>

</view>`;
fs.writeFileSync(indexWxmlPath, indexWxml, 'utf8');

// 2. 重写 WXSS，修复宽度被裁切 (box-sizing)，优化卡片内间距，美化新的 Dashboard 和 Checkbox
const wxssContent = `
.page-container { height: 100vh; display: flex; flex-direction: column; overflow: hidden; background: var(--primary-50); box-sizing: border-box; }

/* 顶部数据看板 */
.dashboard { background: #fff; padding: 40rpx 40rpx 20rpx; border-bottom-left-radius: 40rpx; border-bottom-right-radius: 40rpx; box-shadow: 0 10rpx 30rpx rgba(74, 64, 58, 0.04); z-index: 10; flex-shrink: 0; }
.dashboard-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 40rpx; }
.dashboard-title { font-size: 44rpx; font-weight: 800; color: var(--primary-900); letter-spacing: 2rpx; }
.date-display { font-size: 26rpx; color: var(--primary-400); font-weight: 500; }

.dashboard-stats { display: flex; gap: 60rpx; }
.stat-box { display: flex; flex-direction: column; align-items: flex-start; position: relative; padding-bottom: 16rpx; }
.stat-num { font-size: 48rpx; font-weight: bold; color: var(--primary-400); transition: color 0.3s; }
.stat-label { font-size: 24rpx; color: var(--primary-600); margin-top: 4rpx; }
.text-primary { color: var(--primary-900); }
.stat-line { position: absolute; bottom: 0; left: 0; width: 40rpx; height: 6rpx; border-radius: 6rpx; background: transparent; transition: background 0.3s; }
.active-line { background: var(--primary-900); }

/* 操作栏 (搜索+新建) */
.action-bar { display: flex; gap: 20rpx; padding: 32rpx 32rpx 10rpx; flex-shrink: 0; }
.search-wrap { flex: 1; background: #fff; border-radius: 20rpx; display: flex; align-items: center; padding: 0 24rpx; height: 80rpx; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.02); border: 1rpx solid transparent; transition: border-color 0.2s; }
.search-wrap:focus-within { border-color: var(--primary-200); }
.search-wrap input { flex: 1; margin-left: 16rpx; font-size: 28rpx; color: var(--primary-900); }
.ph { color: var(--primary-400); }

.btn-create-small { background: var(--primary-900); color: #fff; border-radius: 20rpx; height: 80rpx; padding: 0 32rpx; display: flex; align-items: center; justify-content: center; font-size: 28rpx; font-weight: bold; box-shadow: 0 6rpx 16rpx rgba(74, 64, 58, 0.2); transition: transform 0.1s; flex-shrink: 0; }
.btn-create-small:active { transform: scale(0.95); }
.plus-icon { position: relative; width: 20rpx; height: 20rpx; margin-right: 12rpx; }
.plus-icon::before, .plus-icon::after { content: ''; position: absolute; background: #fff; border-radius: 2rpx; }
.plus-icon::before { top: 8rpx; left: 0; width: 20rpx; height: 4rpx; }
.plus-icon::after { top: 0; left: 8rpx; width: 4rpx; height: 20rpx; }

/* 列表区 */
.list-container { flex: 1; padding: 20rpx 32rpx; width: 100%; box-sizing: border-box; }
.bottom-padding { height: 60rpx; }

/* 卡片 */
/* 修复被裁切问题：增加 box-sizing: border-box 并控制 width */
.todo-card { background: #fff; border-radius: 24rpx; padding: 36rpx; margin-bottom: 24rpx; box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.03); transition: opacity 0.3s; width: 100%; box-sizing: border-box; border: 1rpx solid rgba(0,0,0,0.02); }
.opacity-60 { opacity: 0.5; }

/* 头部与新 Checkbox */
.card-header { display: flex; align-items: flex-start; margin-bottom: 16rpx; gap: 20rpx; }
/* 方形带微圆角的复选框，更具现代感 */
.checkbox { width: 44rpx; height: 44rpx; border-radius: 12rpx; border: 3rpx solid #cbd5e1; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.2s; background: #f8fafc; margin-top: 4rpx; }
.checkbox.checked { background: var(--primary-900); border-color: var(--primary-900); }
/* 纯 CSS 绘制的优雅对号 */
.checkmark { width: 12rpx; height: 22rpx; border: 4rpx solid #fff; border-top: none; border-left: none; transform: rotate(45deg); margin-top: -4rpx; }

.title { font-size: 34rpx; font-weight: bold; line-height: 1.4; color: var(--primary-900); flex: 1; word-break: break-all; }
.line-through { text-decoration: line-through; color: var(--primary-400); }

/* 主体内容 */
.card-body { padding-left: 64rpx; margin-bottom: 24rpx; }

/* 独立的优先级显示，不再像人员标签 */
.meta-row { display: flex; align-items: center; gap: 12rpx; }
.mb-2 { margin-bottom: 16rpx; }
.priority-dot { width: 12rpx; height: 12rpx; border-radius: 50%; }
.priority-text { font-size: 24rpx; font-weight: 600; }
.priority-bg-high { background: #ef4444; } .priority-color-high { color: #ef4444; }
.priority-bg-medium { background: #f59e0b; } .priority-color-medium { color: #f59e0b; }
.priority-bg-low { background: #10b981; } .priority-color-low { color: #10b981; }

.desc { font-size: 28rpx; color: var(--primary-600); line-height: 1.6; display: block; margin-bottom: 20rpx; }

/* 附件小标签 */
.attachments { display: flex; flex-wrap: wrap; gap: 16rpx; }
.att-pill { display: flex; align-items: center; background: #f1f5f9; padding: 8rpx 20rpx; border-radius: 12rpx; font-size: 24rpx; color: #475569; max-width: 100%; }
.icon-clip { width: 8rpx; height: 16rpx; border: 3rpx solid #94a3b8; border-top: none; border-radius: 0 0 6rpx 6rpx; margin-right: 12rpx; position: relative; }
.icon-clip::before { content: ''; position: absolute; top: -6rpx; left: 1rpx; width: 6rpx; height: 10rpx; border: 3rpx solid #94a3b8; border-bottom: none; border-radius: 4rpx 4rpx 0 0; }

/* 底部区域 */
.card-footer { padding-left: 64rpx; border-top: 1rpx solid #f1f5f9; padding-top: 24rpx; }
.related-info { display: flex; align-items: center; font-size: 26rpx; color: var(--primary-600); width: 100%; }
.related-tag { font-weight: bold; color: var(--primary-900); margin-right: 12rpx; }
.related-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }

.mt-3 { margin-top: 20rpx; }
.flex { display: flex; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }

.date { font-size: 24rpx; color: var(--primary-400); font-weight: 500; }

/* 角色标签：去除了边框，背景更柔和，文字颜色更深，与优先级明显区分 */
.role-badge { padding: 6rpx 20rpx; border-radius: 10rpx; font-size: 22rpx; font-weight: bold; }
.role-sales { background: #e0f2fe; color: #1e40af; }
.role-designer { background: #fce7f3; color: #9d174d; }
.role-manager { background: #d1fae5; color: #065f46; }
.role-admin { background: #f3e8ff; color: #6b21a8; }
.role-undefined { background: #f3f4f6; color: #4b5563; }

/* 空状态 */
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 160rpx 0; color: var(--primary-400); font-size: 28rpx; }
.empty-icon { width: 100rpx; height: 100rpx; background: #f1f5f9; border-radius: 30rpx; margin-bottom: 32rpx; position: relative; }
.empty-icon::after { content: ''; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 40rpx; height: 6rpx; background: #cbd5e1; border-radius: 6rpx; }
`;
fs.writeFileSync(indexWxssPath, wxssContent, 'utf8');

// 3. 更新 JS 逻辑，支持顶部看板的数据统计和日期显示
const jsContent = `const todosData = require('../../mock/todos.js');

Page({
  data: {
    todos: [],
    allTodos: [],
    activeTab: 'pending',
    pendingCount: 0,
    completedCount: 0,
    today: '',
    searchQuery: ''
  },
  onLoad() {
    this.initDate();
    // 模拟从接口获取全部数据
    this.setData({ allTodos: todosData }, () => {
      this.updateDashboard();
      this.filterTodos();
    });
  },
  initDate() {
    const d = new Date();
    this.setData({ today: \`\${d.getFullYear()}年\${d.getMonth()+1}月\${d.getDate()}日\` });
  },
  updateDashboard() {
    const pending = this.data.allTodos.filter(t => t.status === 'pending').length;
    const completed = this.data.allTodos.filter(t => t.status === 'completed').length;
    this.setData({ pendingCount: pending, completedCount: completed });
  },
  filterTodos() {
    let filtered = this.data.allTodos.filter(t => t.status === this.data.activeTab);
    
    if (this.data.searchQuery) {
      const q = this.data.searchQuery.toLowerCase();
      filtered = filtered.filter(t => t.title.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q)));
    }

    // 映射优先级和角色
    filtered = filtered.map(t => {
      const priorityMap = { high: '紧急任务', medium: '重要任务', low: '普通任务' };
      const role = t.assignedTo && t.assignedTo.role ? t.assignedTo.role : 'undefined';
      return {
        ...t,
        priorityText: priorityMap[t.priority] || '普通任务',
        assignedTo: { ...t.assignedTo, role }
      };
    });
    
    this.setData({ todos: filtered });
  },
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (this.data.activeTab === tab) return;
    this.setData({ activeTab: tab }, () => {
      this.filterTodos();
    });
  },
  onSearch(e) {
    this.setData({ searchQuery: e.detail.value }, () => {
      this.filterTodos();
    });
  },
  toggleTodo(e) {
    const id = e.currentTarget.dataset.id;
    const newAllTodos = this.data.allTodos.map(t => {
      if (t.id === id) {
        return { ...t, status: t.status === 'completed' ? 'pending' : 'completed' };
      }
      return t;
    });
    
    // 先更新全部数据和本地列表产生即时反馈
    this.setData({ allTodos: newAllTodos });
    this.filterTodos();
    this.updateDashboard();
    
    // 延迟 400ms 后再次过滤（让完成的卡片有时间播完动画后消失）
    setTimeout(() => {
      this.filterTodos();
      wx.showToast({ title: '已更新', icon: 'success', duration: 800 });
    }, 400);
  },
  goToRelated(e) {
    wx.showToast({ title: '打开详情', icon: 'none' });
  },
  createTodo() {
    wx.showToast({ title: '新建待办', icon: 'none' });
  }
})`;
fs.writeFileSync(indexJsPath, jsContent, 'utf8');

console.log('UI fundamentally redesigned with Dashboard and fixed card cutting.');
