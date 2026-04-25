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
  onShow() {
    this.checkSessionStatus();
  },
  checkSessionStatus() {
    // 每次应用回到前台，检查 sessionToken 是否和云端一致，实现异地登录踢下线功能
    const userInfo = wx.getStorageSync('userInfo');
    const localSession = wx.getStorageSync('sessionToken');
    
    if (userInfo && (userInfo.id || userInfo._id) && wx.cloud) {
      const db = wx.cloud.database();
      const userId = userInfo.id || userInfo._id;
      
      db.collection('users').doc(userId).get().then(res => {
        const remoteUser = res.data;
        const remoteSession = remoteUser.sessionToken;
        
        // 如果云端有 sessionToken 且和本地不同，说明在其他设备登录了
        if (remoteSession && localSession && remoteSession !== localSession) {
          wx.showModal({
            title: '下线通知',
            content: '您的账号已在其他微信/设备登录。为了安全起见，您已被强制下线。如非本人操作请联系管理员。',
            showCancel: false,
            confirmText: '重新登录',
            success: () => {
              wx.clearStorageSync();
              wx.reLaunch({
                url: '/pages/login/index'
              });
            }
          });
        } else if (remoteUser) {
          // 如果没有被踢下线，顺便静默同步一下最新的用户信息（如名字/角色）到缓存
          // 避免改了名字之后缓存还是旧的
          remoteUser._loginPassword = userInfo._loginPassword; // 维持密码状态
          remoteUser.id = remoteUser._id;
          wx.setStorageSync('userInfo', remoteUser);
        }
      }).catch(err => {
        console.error('检查 session 失败', err);
      });
    }
  },
  globalData: {
    userInfo: null
  }
})