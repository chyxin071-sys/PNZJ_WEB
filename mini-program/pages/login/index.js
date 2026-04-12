// pages/login/index.js
Page({
  data: {
    username: '',
    password: ''
  },

  onLoad() {
    // 检查是否已登录
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      wx.switchTab({
        url: '/pages/index/index'
      });
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [field]: e.detail.value
    });
  },

  handleLogin() {
    const { username, password } = this.data;
    
    if (!username.trim()) {
      return wx.showToast({ title: '请输入账号', icon: 'none' });
    }
    if (!password.trim()) {
      return wx.showToast({ title: '请输入密码', icon: 'none' });
    }

    wx.showLoading({ title: '登录中...' });
    
    // 模拟账号密码登录校验
    setTimeout(() => {
      wx.hideLoading();
      
      // 简单模拟：如果账号是 admin，则认为是老板
      let role = 'sales';
      let name = '测试员工';
      
      if (username === 'admin' || username === '老板') {
        role = 'admin';
        name = '老板';
      }

      this.doLoginSuccess({
        id: `user_${new Date().getTime()}`,
        name: name,
        role: role,
        phone: username,
        avatarUrl: ''
      });
    }, 800);
  },

  doLoginSuccess(userInfo) {
    wx.setStorageSync('userInfo', userInfo);
    wx.showToast({ title: '登录成功', icon: 'success' });

    setTimeout(() => {
      wx.switchTab({
        url: '/pages/index/index'
      });
    }, 1000);
  }
});