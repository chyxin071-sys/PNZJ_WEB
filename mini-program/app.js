App({
  onLaunch() {
    console.log('App Launch');
    
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