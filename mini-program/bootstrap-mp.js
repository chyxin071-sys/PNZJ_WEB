const fs = require('fs');
const path = require('path');

const mpRoot = 'E:/XIN Lab/PNZJ/CM1.0/mini-program';
const sharedMock = 'E:/XIN Lab/PNZJ/CM1.0/shared/mock_data';

// 1. Copy mock data
const mockDest = path.join(mpRoot, 'mock');
if (!fs.existsSync(mockDest)) fs.mkdirSync(mockDest, { recursive: true });
['todos.json', 'leads.json', 'projects.json', 'employees.json'].forEach(file => {
  if (fs.existsSync(path.join(sharedMock, file))) {
    fs.copyFileSync(path.join(sharedMock, file), path.join(mockDest, file));
  }
});

// 2. Create directories for pages
const pages = ['index', 'leads', 'projects', 'profile'];
pages.forEach(p => {
  const pDir = path.join(mpRoot, 'pages', p);
  if (!fs.existsSync(pDir)) fs.mkdirSync(pDir, { recursive: true });
});

// 3. Create dummy icons for TabBar
const iconsDir = path.join(mpRoot, 'assets', 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });
// A 1x1 transparent PNG
const dummyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
const icons = ['todo.png', 'todo-active.png', 'leads.png', 'leads-active.png', 'projects.png', 'projects-active.png', 'profile.png', 'profile-active.png'];
icons.forEach(icon => {
  fs.writeFileSync(path.join(iconsDir, icon), dummyPng);
});

// 4. Write app.json
const appJson = {
  "pages": [
    "pages/index/index",
    "pages/leads/index",
    "pages/projects/index",
    "pages/profile/index"
  ],
  "window": {
    "navigationBarBackgroundColor": "#4a403a",
    "navigationBarTextStyle": "white",
    "navigationBarTitleText": "品诺筑家",
    "backgroundColor": "#f5f4f2",
    "backgroundTextStyle": "light"
  },
  "tabBar": {
    "color": "#999999",
    "selectedColor": "#4a403a",
    "backgroundColor": "#ffffff",
    "borderStyle": "white",
    "list": [
      { "pagePath": "pages/index/index", "text": "协同待办", "iconPath": "assets/icons/todo.png", "selectedIconPath": "assets/icons/todo-active.png" },
      { "pagePath": "pages/leads/index", "text": "客户线索", "iconPath": "assets/icons/leads.png", "selectedIconPath": "assets/icons/leads-active.png" },
      { "pagePath": "pages/projects/index", "text": "施工管理", "iconPath": "assets/icons/projects.png", "selectedIconPath": "assets/icons/projects-active.png" },
      { "pagePath": "pages/profile/index", "text": "我的", "iconPath": "assets/icons/profile.png", "selectedIconPath": "assets/icons/profile-active.png" }
    ]
  },
  "style": "v2"
};
fs.writeFileSync(path.join(mpRoot, 'app.json'), JSON.stringify(appJson, null, 2), 'utf8');

// 5. Write app.wxss
const appWxss = `page {
  --primary: #4a403a;
  --primary-light: #8c7a6e;
  --bg-color: #f5f4f2;
  --text-main: #333333;
  --text-muted: #999999;
  --accent: #b8902e;
  
  background-color: var(--bg-color);
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Segoe UI, Arial, Roboto, 'PingFang SC', 'miui', 'Hiragino Sans GB', 'Microsoft Yahei', sans-serif;
  font-size: 28rpx;
  color: var(--text-main);
}
.container { padding: 20rpx; }
.card { 
  background: #fff; 
  border-radius: 16rpx; 
  padding: 24rpx; 
  margin-bottom: 20rpx; 
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.02); 
}
`;
fs.writeFileSync(path.join(mpRoot, 'app.wxss'), appWxss, 'utf8');

// 6. Write basic page files for leads, projects, profile
pages.forEach(p => {
  if (p === 'index') return; // skip index for now
  fs.writeFileSync(path.join(mpRoot, 'pages', p, 'index.json'), JSON.stringify({ navigationBarTitleText: p === 'leads' ? '客户线索' : p === 'projects' ? '施工打卡' : '我的' }, null, 2), 'utf8');
  fs.writeFileSync(path.join(mpRoot, 'pages', p, 'index.wxml'), `<view class="container"><view class="card"><text>${p} 模块移动端开发中...</text></view></view>`, 'utf8');
  fs.writeFileSync(path.join(mpRoot, 'pages', p, 'index.wxss'), ``, 'utf8');
  fs.writeFileSync(path.join(mpRoot, 'pages', p, 'index.js'), `Page({ data: {} })`, 'utf8');
});

// 7. Write index (Todos) page
fs.writeFileSync(path.join(mpRoot, 'pages', 'index', 'index.json'), JSON.stringify({ navigationBarTitleText: '协同待办' }, null, 2), 'utf8');

fs.writeFileSync(path.join(mpRoot, 'pages', 'index', 'index.wxml'), `
<view class="container">
  <!-- Tabs -->
  <view class="tabs">
    <view class="tab {{activeTab === 'pending' ? 'active' : ''}}" data-tab="pending" bindtap="switchTab">待处理</view>
    <view class="tab {{activeTab === 'completed' ? 'active' : ''}}" data-tab="completed" bindtap="switchTab">已完成</view>
  </view>

  <!-- Todo List -->
  <view class="todo-list">
    <view class="card todo-item {{item.status === 'completed' ? 'completed' : ''}}" wx:for="{{todos}}" wx:key="id">
      <view class="todo-header">
        <text class="title">{{item.title}}</text>
        <text class="priority {{item.priority}}" wx:if="{{item.status !== 'completed'}}">
          {{item.priority === 'high' ? '紧急' : item.priority === 'medium' ? '重要' : '普通'}}
        </text>
      </view>
      <view class="todo-desc">{{item.description}}</view>
      
      <view class="todo-footer">
        <view class="related">
          <text class="related-tag">{{item.relatedTo.type === 'lead' ? '线索' : '工地'}}</text>
          <text>{{item.relatedTo.name}}</text>
        </view>
        <text class="date">{{item.dueDate}} 截止</text>
      </view>

      <view class="todo-meta">
        <text>派发: {{item.createdBy.name}}</text>
        <text>执行: {{item.assignedTo.name}}</text>
      </view>
    </view>
    
    <view class="empty" wx:if="{{todos.length === 0}}">
      <text>暂无相关任务</text>
    </view>
  </view>
</view>
`, 'utf8');

fs.writeFileSync(path.join(mpRoot, 'pages', 'index', 'index.wxss'), `
.tabs { display: flex; background: #fff; padding: 10rpx; border-radius: 12rpx; margin-bottom: 24rpx; }
.tab { flex: 1; text-align: center; padding: 16rpx 0; font-size: 28rpx; color: var(--text-muted); transition: all 0.3s; border-radius: 8rpx; }
.tab.active { background: var(--bg-color); color: var(--primary); font-weight: bold; }

.todo-item { display: flex; flex-direction: column; gap: 16rpx; transition: opacity 0.3s; }
.todo-item.completed { opacity: 0.6; }

.todo-header { display: flex; justify-content: space-between; align-items: center; }
.todo-header .title { font-size: 32rpx; font-weight: bold; color: var(--text-main); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.completed .title { text-decoration: line-through; color: var(--text-muted); }

.priority { font-size: 20rpx; padding: 4rpx 12rpx; border-radius: 6rpx; margin-left: 16rpx; font-weight: bold; }
.priority.high { background: #fee2e2; color: #e11d48; border: 1rpx solid #fecdd3; }
.priority.medium { background: #fef3c7; color: #d97706; border: 1rpx solid #fde68a; }
.priority.low { background: #d1fae5; color: #059669; border: 1rpx solid #a7f3d0; }

.todo-desc { font-size: 26rpx; color: var(--text-muted); display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; line-height: 1.5; }

.todo-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 8rpx; padding-top: 16rpx; border-top: 1rpx solid #f0f0f0; }
.related { display: flex; align-items: center; gap: 8rpx; font-size: 24rpx; color: var(--primary); background: var(--bg-color); padding: 6rpx 16rpx; border-radius: 8rpx; max-width: 60%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.related-tag { font-weight: bold; color: var(--primary-light); }
.date { font-size: 24rpx; color: #d97706; font-weight: 500; }

.todo-meta { display: flex; justify-content: space-between; font-size: 22rpx; color: #bbbbbb; margin-top: 8rpx; }

.empty { text-align: center; color: var(--text-muted); padding: 100rpx 0; font-size: 28rpx; }
`, 'utf8');

fs.writeFileSync(path.join(mpRoot, 'pages', 'index', 'index.js'), `
const todosData = require('../../mock/todos.json');

Page({
  data: {
    todos: [],
    activeTab: 'pending' // pending | completed
  },
  onLoad() {
    this.loadTodos();
  },
  loadTodos() {
    // 过滤出对应状态的数据
    const filtered = todosData.filter(t => t.status === this.data.activeTab);
    this.setData({ todos: filtered });
  },
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (this.data.activeTab === tab) return;
    this.setData({ activeTab: tab }, () => {
      this.loadTodos();
    });
  }
})
`, 'utf8');

console.log('Mini-program fully bootstrapped with TabBar and Mock Data!');
