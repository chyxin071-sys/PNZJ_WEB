const fs = require('fs');
const path = require('path');

const base = 'E:/XIN Lab/PNZJ/CM1.0/mini-program';

const files = {
  'app.json': `{
  "pages": [
    "pages/index/index"
  ],
  "window": {
    "navigationBarBackgroundColor": "#ffffff",
    "navigationBarTextStyle": "black",
    "navigationBarTitleText": "品诺筑家",
    "backgroundColor": "#eeeeee",
    "backgroundTextStyle": "light"
  },
  "style": "v2"
}`,
  'app.js': `App({
  onLaunch() {
    console.log('App Launch')
  },
  globalData: {
    userInfo: null
  }
})`,
  'app.wxss': `page {
  background-color: #f7f7f7;
}`,
  'pages/index/index.json': `{
  "usingComponents": {},
  "navigationBarTitleText": "首页"
}`,
  'pages/index/index.wxml': `<view class="container">
  <text class="title">品诺筑家</text>
  <text class="subtitle">小程序端开发中...</text>
</view>`,
  'pages/index/index.wxss': `.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
}
.title {
  font-size: 48rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
}
.subtitle {
  font-size: 28rpx;
  color: #666;
}`,
  'pages/index/index.js': `Page({
  data: {},
  onLoad() {}
})`
};

for (const [p, c] of Object.entries(files)) {
  const f = path.join(base, p);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, c, 'utf8');
}
console.log('Fixed Encoding');
