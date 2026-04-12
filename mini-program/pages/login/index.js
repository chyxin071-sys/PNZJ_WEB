// pages/login/index.js
Page({
  data: {
    // any state needed
  },

  onLoad(options) {
    // Check if already logged in
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      wx.switchTab({
        url: '/pages/index/index'
      });
    }
  },

  handleGetPhoneNumber(e) {
    if (e.detail.errMsg === "getPhoneNumber:ok") {
      // User allowed getting phone number
      // In real app, we send e.detail.code to our backend
      wx.showLoading({ title: '登录中...' });
      
      setTimeout(() => {
        wx.hideLoading();
        this.doLoginSuccess({
          name: '微信用户',
          role: '未知角色',
          phone: '138****8888'
        });
      }, 800);
    } else {
      wx.showToast({
        title: '需要授权才能提供完整服务哦',
        icon: 'none'
      });
    }
  },

  handleMockLogin() {
    wx.showLoading({ title: '免密登录中...' });
    setTimeout(() => {
      wx.hideLoading();
      this.doLoginSuccess({
        id: 'user_1',
        name: '测试用户(老板)',
        role: 'admin',
        phone: '13800138000',
        avatarUrl: ''
      });
    }, 500);
  },

  doLoginSuccess(userInfo) {
    // Save to storage
    wx.setStorageSync('userInfo', userInfo);
    wx.showToast({
      title: '登录成功',
      icon: 'success'
    });
    
    // Redirect to home page
    setTimeout(() => {
      wx.switchTab({
        url: '/pages/index/index'
      });
    }, 1000);
  }
});