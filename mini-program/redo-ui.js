const fs = require('fs');
const path = require('path');

const mpRoot = 'E:/XIN Lab/PNZJ/CM1.0/mini-program';

// 1. 重写全局样式，对齐 Web 端的 Tailwind CSS 色系
const appWxssPath = path.join(mpRoot, 'app.wxss');
const appWxss = `page {
  --primary-50: #faf9f8;
  --primary-100: #f5f4f2;
  --primary-200: #eaddd7;
  --primary-400: #b5a49a;
  --primary-600: #8c7a6e;
  --primary-900: #4a403a;
  
  background-color: var(--primary-50);
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Segoe UI, Arial, Roboto, 'PingFang SC', sans-serif;
  color: var(--primary-900);
  font-size: 28rpx;
  box-sizing: border-box;
}

/* 基础通用类，类似 Tailwind */
.flex { display: flex; }
.flex-col { flex-direction: column; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.justify-center { justify-content: center; }
.gap-2 { gap: 16rpx; }
.gap-3 { gap: 24rpx; }
.w-full { width: 100%; }
.h-full { height: 100%; }

.text-xs { font-size: 24rpx; }
.text-sm { font-size: 28rpx; }
.text-base { font-size: 32rpx; }
.font-bold { font-weight: bold; }
.font-medium { font-weight: 500; }
.text-primary-400 { color: var(--primary-400); }
.text-primary-600 { color: var(--primary-600); }
.text-primary-900 { color: var(--primary-900); }
`;
fs.writeFileSync(appWxssPath, appWxss, 'utf8');

// 2. 彻底重写 index.wxml (完全对齐 Web 端布局，杂志留白、优雅卡片、精简过滤器)
const indexWxmlPath = path.join(mpRoot, 'pages', 'index', 'index.wxml');
const indexWxml = `<view class="page-container">
  
  <!-- 顶部工具栏 -->
  <view class="toolbar">
    <view class="search-wrap">
      <icon type="search" size="16" color="#b5a49a" />
      <input placeholder="搜索待办..." placeholder-class="ph" />
    </view>
    <view class="filter-wrap">
      <picker range="{{['待处理', '已完成']}}" bindchange="onStatusChange">
        <view class="picker-btn">
          <text>{{activeTab === 'pending' ? '待处理' : '已完成'}}</text>
          <view class="arrow-down"></view>
        </view>
      </picker>
    </view>
  </view>

  <!-- 待办列表区 -->
  <scroll-view scroll-y class="list-container">
    <view class="todo-card {{item.status === 'completed' ? 'opacity-60' : ''}}" wx:for="{{todos}}" wx:key="id" bindtap="onTodoTap">
      
      <!-- 头部：打勾、标题、优先级 -->
      <view class="card-header">
        <view class="flex items-center gap-3 w-full">
          <view class="checkbox {{item.status === 'completed' ? 'checked' : ''}}" catchtap="toggleTodo" data-id="{{item.id}}">
            <icon wx:if="{{item.status === 'completed'}}" type="success_no_circle" size="12" color="#fff" />
          </view>
          <text class="title {{item.status === 'completed' ? 'line-through' : ''}}">{{item.title}}</text>
          <text wx:if="{{item.status !== 'completed'}}" class="badge priority-{{item.priority}}">{{item.priorityText}}</text>
        </view>
      </view>

      <!-- 主体：描述、附件 -->
      <view class="card-body">
        <text class="desc" wx:if="{{item.description}}">{{item.description}}</text>
        
        <view class="attachments" wx:if="{{item.attachments && item.attachments.length > 0}}">
          <view class="att-pill" wx:for="{{item.attachments}}" wx:key="name" wx:for-item="att">
            <view class="icon-clip"></view>
            <text>{{att.name}}</text>
          </view>
        </view>
      </view>

      <!-- 底部：关联客户/工地、执行人、日期 -->
      <view class="card-footer">
        <view class="related-pill" catchtap="goToRelated" data-type="{{item.relatedTo.type}}" data-id="{{item.relatedTo.id}}">
          <view class="dot"></view>
          <text>{{item.relatedTo.type === 'lead' ? '线索' : '工地'}}：{{item.relatedTo.name}}</text>
        </view>
        
        <view class="flex items-center gap-3">
          <text class="date">{{item.dueDate}}</text>
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

  <!-- 网页端风格悬浮胶囊按钮 -->
  <view class="fab-btn" bindtap="createTodo">
    <text class="fab-plus">+</text>
    <text>新建待办</text>
  </view>

</view>`;
fs.writeFileSync(indexWxmlPath, indexWxml, 'utf8');

// 3. 彻底重写 index.wxss (Tailwind 级精细间距、边框、阴影)
const indexWxssPath = path.join(mpRoot, 'pages', 'index', 'index.wxss');
const indexWxss = `.page-container { height: 100vh; display: flex; flex-direction: column; overflow: hidden; }

/* 工具栏 */
.toolbar { padding: 24rpx 32rpx; display: flex; gap: 24rpx; background: #fff; border-bottom: 1rpx solid var(--primary-100); flex-shrink: 0; z-index: 10; }
.search-wrap { flex: 1; background: var(--primary-50); border-radius: 16rpx; display: flex; align-items: center; padding: 0 24rpx; height: 72rpx; border: 1rpx solid var(--primary-100); transition: all 0.2s; }
.search-wrap input { flex: 1; margin-left: 16rpx; font-size: 28rpx; color: var(--primary-900); }
.ph { color: var(--primary-400); }
.picker-btn { height: 72rpx; padding: 0 32rpx; background: var(--primary-50); border: 1rpx solid var(--primary-100); border-radius: 16rpx; display: flex; align-items: center; justify-content: center; font-size: 28rpx; font-weight: 600; color: var(--primary-900); gap: 12rpx; }
.arrow-down { width: 0; height: 0; border-left: 8rpx solid transparent; border-right: 8rpx solid transparent; border-top: 10rpx solid var(--primary-600); border-radius: 2rpx; margin-top: 4rpx; }

/* 列表区 */
.list-container { flex: 1; padding: 32rpx; }
.bottom-padding { height: 160rpx; }

/* 卡片 */
.todo-card { background: #fff; border-radius: 24rpx; padding: 32rpx; margin-bottom: 32rpx; border: 1rpx solid rgba(234, 221, 215, 0.6); box-shadow: 0 8rpx 30rpx rgba(74, 64, 58, 0.03); transition: all 0.3s ease; }
.opacity-60 { opacity: 0.6; }

/* 头部 */
.card-header { display: flex; align-items: flex-start; margin-bottom: 20rpx; }
.checkbox { width: 40rpx; height: 40rpx; border-radius: 50%; border: 3rpx solid #d1d5db; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.2s; margin-top: 4rpx; }
.checkbox.checked { background: #10b981; border-color: #10b981; }
.title { font-size: 32rpx; font-weight: bold; line-height: 1.4; color: var(--primary-900); flex: 1; word-break: break-all; }
.line-through { text-decoration: line-through; color: var(--primary-400); }

/* 优先级标签 */
.badge { padding: 4rpx 16rpx; border-radius: 8rpx; font-size: 22rpx; font-weight: 800; flex-shrink: 0; margin-left: 16rpx; margin-top: 4rpx; }
.priority-high { background: #fff1f2; color: #e11d48; border: 1rpx solid #ffe4e6; }
.priority-medium { background: #fffbeb; color: #d97706; border: 1rpx solid #fef3c7; }
.priority-low { background: #ecfdf5; color: #059669; border: 1rpx solid #d1fae5; }

/* 主体内容 */
.card-body { margin-bottom: 24rpx; padding-left: 64rpx; }
.desc { font-size: 28rpx; color: var(--primary-600); line-height: 1.6; display: block; margin-bottom: 16rpx; }

/* 附件小标签 */
.attachments { display: flex; flex-wrap: wrap; gap: 12rpx; }
.att-pill { display: flex; align-items: center; background: var(--primary-50); padding: 6rpx 16rpx; border-radius: 12rpx; border: 1rpx solid var(--primary-100); font-size: 22rpx; color: var(--primary-600); max-width: 100%; }
.icon-clip { width: 8rpx; height: 16rpx; border: 3rpx solid var(--primary-400); border-top: none; border-radius: 0 0 6rpx 6rpx; margin-right: 10rpx; position: relative; }
.icon-clip::before { content: ''; position: absolute; top: -6rpx; left: 1rpx; width: 6rpx; height: 10rpx; border: 3rpx solid var(--primary-400); border-bottom: none; border-radius: 4rpx 4rpx 0 0; }

/* 底部区域 */
.card-footer { display: flex; justify-content: space-between; align-items: center; padding-left: 64rpx; border-top: 1rpx dashed var(--primary-100); padding-top: 24rpx; }
.related-pill { display: flex; align-items: center; background: var(--primary-50); padding: 8rpx 20rpx; border-radius: 30rpx; font-size: 24rpx; color: var(--primary-600); font-weight: 500; max-width: 50%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dot { width: 12rpx; height: 12rpx; border-radius: 50%; background: var(--primary-400); margin-right: 12rpx; flex-shrink: 0; }

/* 角色标签 (和Web端颜色一致) */
.role-badge { padding: 6rpx 16rpx; border-radius: 8rpx; font-size: 22rpx; font-weight: 800; border: 1rpx solid transparent; }
.role-sales { background: #eff6ff; color: #1d4ed8; border-color: #dbeafe; }
.role-designer { background: #fdf2f8; color: #be185d; border-color: #fce7f3; }
.role-manager { background: #ecfeff; color: #047857; border-color: #d1fae5; }
.role-admin { background: #faf5ff; color: #a21caf; border-color: #f3e8ff; }
.role-undefined { background: var(--primary-100); color: var(--primary-600); }

.date { font-size: 24rpx; color: var(--primary-400); font-weight: 600; }

/* 空状态 */
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 120rpx 0; color: var(--primary-400); font-size: 28rpx; }
.empty-icon { width: 120rpx; height: 120rpx; background: var(--primary-100); border-radius: 50%; margin-bottom: 32rpx; position: relative; }
.empty-icon::after { content: ''; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 40rpx; height: 4rpx; background: var(--primary-200); border-radius: 4rpx; }

/* 网页风格的悬浮胶囊按钮 */
.fab-btn { position: fixed; bottom: 60rpx; left: 50%; transform: translateX(-50%); background: var(--primary-900); color: #fff; height: 96rpx; padding: 0 48rpx; border-radius: 48rpx; display: flex; align-items: center; justify-content: center; box-shadow: 0 12rpx 32rpx rgba(74, 64, 58, 0.25); z-index: 100; font-size: 32rpx; font-weight: bold; gap: 12rpx; transition: all 0.2s; }
.fab-btn:active { transform: translateX(-50%) scale(0.96); background: #3a322e; box-shadow: 0 4rpx 16rpx rgba(74, 64, 58, 0.2); }
.fab-plus { font-size: 44rpx; font-weight: 300; margin-top: -6rpx; }
`;
fs.writeFileSync(indexWxssPath, indexWxss, 'utf8');

// 4. 重写 JS 逻辑以配合新 UI (增加 priorityText 和 default role 处理)
const indexJsPath = path.join(mpRoot, 'pages', 'index', 'index.js');
const indexJs = `const todosData = require('../../mock/todos.js');

Page({
  data: {
    todos: [],
    activeTab: 'pending' // pending | completed
  },
  onLoad() {
    this.loadTodos();
  },
  loadTodos() {
    const filtered = todosData.filter(t => t.status === this.data.activeTab).map(t => {
      // 映射优先级中文
      const priorityMap = { high: '紧急', medium: '重要', low: '普通' };
      // 容错处理：确保员工角色存在，避免样式渲染不出
      const role = t.assignedTo && t.assignedTo.role ? t.assignedTo.role : 'undefined';
      
      return {
        ...t,
        priorityText: priorityMap[t.priority] || '普通',
        assignedTo: { ...t.assignedTo, role }
      };
    });
    this.setData({ todos: filtered });
  },
  onStatusChange(e) {
    const tabs = ['pending', 'completed'];
    const tab = tabs[e.detail.value];
    if (this.data.activeTab === tab) return;
    this.setData({ activeTab: tab }, () => {
      this.loadTodos();
    });
  },
  toggleTodo(e) {
    const id = e.currentTarget.dataset.id;
    const todos = this.data.todos.map(t => {
      if (t.id === id) {
        return { ...t, status: t.status === 'completed' ? 'pending' : 'completed' };
      }
      return t;
    });
    
    this.setData({ todos });
    setTimeout(() => {
      this.setData({
        todos: this.data.todos.filter(t => t.status === this.data.activeTab)
      });
      wx.showToast({ title: '状态已更新', icon: 'success' });
    }, 400);
  },
  goToRelated(e) {
    wx.showToast({ title: '正在打开详情...', icon: 'none' });
  },
  createTodo() {
    wx.showToast({ title: '新建功能开发中', icon: 'none' });
  }
})`;
fs.writeFileSync(indexJsPath, indexJs, 'utf8');

console.log('UI completely redesigned with Tailwind style!');
