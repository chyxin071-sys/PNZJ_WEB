App({
  onLaunch() {
    console.log('App Launch');
    
    // 全局锁定字体大小，禁止跟随微信系统字体放大缩小，保护排版
    if (wx.canIUse('setWindowSize')) {
      // 仅用于一些特殊窗口API的兼容性检查
    }
    
    // 初始化微信云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        // 此处填入新获取的环境 ID
        env: 'cloud1-8grodf5s3006f004',
        traceUser: true,
      });
    }
  },
  globalData: {
    userInfo: null
  }
})