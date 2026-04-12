const fs = require('fs');
const path = require('path');

const mpRoot = 'E:/XIN Lab/PNZJ/CM1.0/mini-program';

// 1. 生成真实的 SVG 图标 (与 Web 端 Lucide Icons 保持一致)
const iconsDir = path.join(mpRoot, 'assets', 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

// SVG 模板：全部取自 web 端使用的相同概念图标
const icons = {
  todo: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="m9 15 2 2 4-4"></path></svg>',
  leads: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
  projects: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>',
  profile: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>'
};

// 浅灰色和品牌咖色
const normalColor = '#cccccc';
const activeColor = '#4a403a';

for (const [name, svg] of Object.entries(icons)) {
  fs.writeFileSync(path.join(iconsDir, `${name}.svg`), svg.replace(/\{color\}/g, normalColor), 'utf8');
  fs.writeFileSync(path.join(iconsDir, `${name}-active.svg`), svg.replace(/\{color\}/g, activeColor), 'utf8');
}

// 2. 更新 app.json 的扩展名 png -> svg
const appJsonPath = path.join(mpRoot, 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

appJson.tabBar.list.forEach(item => {
  item.iconPath = item.iconPath.replace('.png', '.svg');
  item.selectedIconPath = item.selectedIconPath.replace('.png', '.svg');
});
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2), 'utf8');


// 3. 构建【工地】(施工管理) 模块的界面代码，使其和 Web 端风格完全统一
const projWxml = `
<view class="container">
  <!-- 搜索栏 -->
  <view class="search-bar">
    <view class="search-box">
      <icon type="search" size="14" color="#999" />
      <input type="text" placeholder="搜索客户 / 项目经理..." placeholder-class="ph-color" bindinput="onSearch" />
    </view>
    <view class="filter-btn"><text>筛选</text></view>
  </view>

  <!-- 状态 Tabs -->
  <scroll-view class="status-tabs" scroll-x>
    <view class="tab {{activeStatus === '全部' ? 'active' : ''}}" bindtap="switchStatus" data-status="全部">全部</view>
    <view class="tab {{activeStatus === '施工中' ? 'active' : ''}}" bindtap="switchStatus" data-status="施工中">施工中</view>
    <view class="tab {{activeStatus === '已竣工' ? 'active' : ''}}" bindtap="switchStatus" data-status="已竣工">已竣工</view>
    <view class="tab {{activeStatus === '停工' ? 'active' : ''}}" bindtap="switchStatus" data-status="停工">停工</view>
  </scroll-view>

  <!-- 施工列表 -->
  <scroll-view class="project-list" scroll-y>
    <view class="card project-item" wx:for="{{projects}}" wx:key="id" bindtap="goToDetail" data-id="{{item.id}}">
      <view class="p-header">
        <view class="p-title">
          <text class="c-name">{{item.customer}}</text>
          <text class="c-address">{{item.address}}</text>
        </view>
        <view class="p-status {{item.status === '已竣工' ? 'completed' : item.status === '停工' ? 'stopped' : 'active'}}">{{item.status}}</view>
      </view>
      
      <view class="p-body">
        <view class="info-row">
          <text class="label">健康度</text>
          <text class="value health-{{item.health === '正常' ? 'good' : item.health === '预警' ? 'warn' : 'danger'}}">● {{item.health}}</text>
        </view>
        <view class="info-row">
          <text class="label">开工时间</text>
          <text class="value">{{item.startDate}}</text>
        </view>
        <view class="info-row">
          <text class="label">项目经理</text>
          <text class="value manager">{{item.manager}}</text>
        </view>
      </view>
    </view>
    
    <view class="empty" wx:if="{{projects.length === 0}}">
      <icon type="info" size="48" color="#ccc" />
      <text>暂无相关工地</text>
    </view>
    <view class="bottom-space"></view>
  </scroll-view>
</view>
`;

const projWxss = `
page { height: 100vh; overflow: hidden; background: var(--bg-color); }
.container { display: flex; flex-direction: column; height: 100vh; padding: 20rpx 20rpx 0; }

.search-bar { display: flex; gap: 20rpx; margin-bottom: 20rpx; flex-shrink: 0; }
.search-box { flex: 1; display: flex; align-items: center; background: #fff; padding: 0 20rpx; border-radius: 12rpx; height: 72rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.02); }
.search-box input { flex: 1; margin-left: 10rpx; font-size: 26rpx; }
.ph-color { color: #ccc; }
.filter-btn { display: flex; align-items: center; justify-content: center; background: #fff; border-radius: 12rpx; padding: 0 30rpx; font-size: 26rpx; color: var(--primary); height: 72rpx; font-weight: bold; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.02); }

.status-tabs { white-space: nowrap; margin-bottom: 20rpx; flex-shrink: 0; }
.tab { display: inline-block; padding: 12rpx 32rpx; background: #fff; border-radius: 30rpx; font-size: 26rpx; color: var(--text-muted); margin-right: 16rpx; transition: all 0.2s; box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.02); }
.tab.active { background: var(--primary); color: #fff; font-weight: bold; }

.project-list { flex: 1; overflow-y: auto; }
.bottom-space { height: 40rpx; }

.project-item { padding: 30rpx; }
.p-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24rpx; border-bottom: 1rpx dashed #f0f0f0; padding-bottom: 20rpx; }
.p-title { display: flex; flex-direction: column; gap: 8rpx; flex: 1; margin-right: 20rpx; }
.c-name { font-size: 32rpx; font-weight: bold; color: var(--text-main); }
.c-address { font-size: 24rpx; color: var(--text-muted); }

.p-status { font-size: 22rpx; padding: 6rpx 16rpx; border-radius: 8rpx; font-weight: bold; flex-shrink: 0; }
.p-status.active { background: #e0e7ff; color: #0369a1; border: 1rpx solid #bae6fd; }
.p-status.completed { background: #d1fae5; color: #059669; border: 1rpx solid #a7f3d0; }
.p-status.stopped { background: #fee2e2; color: #e11d48; border: 1rpx solid #fecdd3; }

.p-body { display: flex; flex-direction: column; gap: 16rpx; }
.info-row { display: flex; justify-content: space-between; align-items: center; font-size: 26rpx; }
.info-row .label { color: var(--text-muted); }
.info-row .value { color: var(--text-main); font-weight: bold; }

.health-good { color: #10b981 !important; }
.health-warn { color: #f59e0b !important; }
.health-danger { color: #ef4444 !important; }

.manager { background: #fef3c7; color: #b45309 !important; padding: 4rpx 12rpx; border-radius: 6rpx; font-size: 22rpx; }

.empty { display: flex; flex-direction: column; align-items: center; color: var(--text-muted); padding: 160rpx 0; font-size: 28rpx; gap: 20rpx; }
`;

const projJs = `
const projectsData = require('../../mock/projects.json');

Page({
  data: {
    projects: [],
    activeStatus: '全部',
    searchQuery: ''
  },
  onLoad() {
    this.filterProjects();
  },
  filterProjects() {
    let filtered = projectsData;
    
    if (this.data.activeStatus !== '全部') {
      filtered = filtered.filter(p => p.status === this.data.activeStatus);
    }
    
    if (this.data.searchQuery) {
      const q = this.data.searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.customer.toLowerCase().includes(q) || 
        p.manager.toLowerCase().includes(q)
      );
    }
    
    this.setData({ projects: filtered });
  },
  switchStatus(e) {
    this.setData({ activeStatus: e.currentTarget.dataset.status }, () => {
      this.filterProjects();
    });
  },
  onSearch(e) {
    this.setData({ searchQuery: e.detail.value }, () => {
      this.filterProjects();
    });
  },
  goToDetail(e) {
    wx.showToast({ title: '详情页开发中', icon: 'none' });
  }
})
`;

fs.writeFileSync(path.join(mpRoot, 'pages/projects/index.wxml'), projWxml, 'utf8');
fs.writeFileSync(path.join(mpRoot, 'pages/projects/index.wxss'), projWxss, 'utf8');
fs.writeFileSync(path.join(mpRoot, 'pages/projects/index.js'), projJs, 'utf8');

// 顺便把其他两个白屏页面加上占位样式，防止纯白
const blankWxml = `
<view class="container">
  <view class="empty">
    <icon type="info" size="48" color="#ccc" />
    <text>该模块正在开发中...</text>
  </view>
</view>
`;
const blankWxss = `
page { height: 100vh; overflow: hidden; background: var(--bg-color); }
.container { display: flex; flex-direction: column; height: 100vh; padding: 20rpx; }
.empty { display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--text-muted); height: 100%; font-size: 28rpx; gap: 20rpx; }
`;

fs.writeFileSync(path.join(mpRoot, 'pages/leads/index.wxml'), blankWxml, 'utf8');
fs.writeFileSync(path.join(mpRoot, 'pages/leads/index.wxss'), blankWxss, 'utf8');
fs.writeFileSync(path.join(mpRoot, 'pages/profile/index.wxml'), blankWxml, 'utf8');
fs.writeFileSync(path.join(mpRoot, 'pages/profile/index.wxss'), blankWxss, 'utf8');

console.log('Icons and Projects UI updated');
