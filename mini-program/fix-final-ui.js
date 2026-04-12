const fs = require('fs');
const path = require('path');

const mpRoot = 'E:/XIN Lab/PNZJ/CM1.0/mini-program';
const appJsonPath = path.join(mpRoot, 'app.json');

// 1. 彻底修复 TabBar 图标不显示问题：检查 app.json 里的 iconPath 是否正确引用了生成的 base64 文件
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

// 强制更新所有路径为绝对的小程序根目录路径前缀 '/'
appJson.tabBar.list.forEach(item => {
  item.iconPath = item.iconPath.replace('assets/icons/', '/assets/icons/');
  if (!item.iconPath.startsWith('/')) {
    item.iconPath = '/' + item.iconPath;
  }
  item.selectedIconPath = item.selectedIconPath.replace('assets/icons/', '/assets/icons/');
  if (!item.selectedIconPath.startsWith('/')) {
    item.selectedIconPath = '/' + item.selectedIconPath;
  }
});

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2), 'utf8');

// 2. 改造顶部看板，对齐网页端的双卡片设计（包含时钟和绿勾图标）
const indexWxmlPath = path.join(mpRoot, 'pages', 'index', 'index.wxml');
let indexWxml = fs.readFileSync(indexWxmlPath, 'utf8');

const newDashboard = `
  <!-- 顶部数据看板 (对齐 Web 端卡片样式) -->
  <view class="dashboard">
    <view class="dashboard-header">
      <text class="dashboard-title">团队协同</text>
      <view class="date-display">{{today}}</view>
    </view>
    <view class="dashboard-cards">
      <!-- 待处理卡片 -->
      <view class="stat-card {{activeTab === 'pending' ? 'active-card' : ''}}" bindtap="switchTab" data-tab="pending">
        <view class="icon-box bg-orange-50">
          <view class="icon-clock"></view>
        </view>
        <view class="stat-info">
          <text class="stat-label">待处理</text>
          <text class="stat-num">{{pendingCount}}</text>
        </view>
      </view>
      <!-- 已完成卡片 -->
      <view class="stat-card {{activeTab === 'completed' ? 'active-card' : ''}}" bindtap="switchTab" data-tab="completed">
        <view class="icon-box bg-emerald-50">
          <view class="icon-check"></view>
        </view>
        <view class="stat-info">
          <text class="stat-label">已完成</text>
          <text class="stat-num">{{completedCount}}</text>
        </view>
      </view>
    </view>
  </view>
`;

indexWxml = indexWxml.replace(/<!-- 顶部数据看板 -->[\s\S]*?<!-- 新建按钮/m, newDashboard + '\n  <!-- 新建按钮');
fs.writeFileSync(indexWxmlPath, indexWxml, 'utf8');

// 3. 更新对应的 CSS 以匹配网页端的卡片视觉
const indexWxssPath = path.join(mpRoot, 'pages', 'index', 'index.wxss');
let indexWxss = fs.readFileSync(indexWxssPath, 'utf8');

// 移除旧的 stats 样式
indexWxss = indexWxss.replace(/\.dashboard-stats \{[\s\S]*?\.active-line \{[^\}]*\}/m, `
/* 新版 Web 风格数据卡片 */
.dashboard-cards { display: flex; gap: 24rpx; }
.stat-card { flex: 1; background: #fff; border: 2rpx solid #f1f5f9; border-radius: 24rpx; padding: 24rpx; display: flex; align-items: center; gap: 24rpx; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.02); transition: all 0.2s; }
.stat-card.active-card { border-color: var(--primary-400); box-shadow: 0 8rpx 24rpx rgba(74, 64, 58, 0.08); background: var(--primary-50); }

/* 卡片内图标 */
.icon-box { width: 80rpx; height: 80rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.bg-orange-50 { background: #fffbeb; }
.bg-emerald-50 { background: #ecfdf5; }

/* 纯 CSS 绘制的精致时钟图标 */
.icon-clock { width: 36rpx; height: 36rpx; border: 4rpx solid #d97706; border-radius: 50%; position: relative; }
.icon-clock::before { content: ''; position: absolute; top: 8rpx; left: 14rpx; width: 4rpx; height: 10rpx; background: #d97706; border-radius: 2rpx; }
.icon-clock::after { content: ''; position: absolute; top: 14rpx; left: 14rpx; width: 10rpx; height: 4rpx; background: #d97706; border-radius: 2rpx; }

/* 纯 CSS 绘制的精致大勾图标 */
.icon-check { width: 16rpx; height: 28rpx; border: 4rpx solid #059669; border-top: none; border-left: none; transform: rotate(45deg); margin-top: -6rpx; }

.stat-info { display: flex; flex-direction: column; justify-content: center; }
.stat-label { font-size: 26rpx; color: var(--primary-600); margin-bottom: 4rpx; }
.stat-num { font-size: 48rpx; font-weight: 800; color: var(--primary-900); line-height: 1; }
`);
fs.writeFileSync(indexWxssPath, indexWxss, 'utf8');

console.log('Fixed TabBar paths and synced Web Dashboard UI');
