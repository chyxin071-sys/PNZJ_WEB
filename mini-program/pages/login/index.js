// pages/login/index.js
Page({
  data: {
    username: '',
    password: '',
    logoError: false
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

  onLogoError() {
    this.setData({ logoError: true });
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
    
    // 调用云数据库进行真实鉴权
    const db = wx.cloud.database();
    db.collection('users').where({
      phone: username
    }).get().then(res => {
      wx.hideLoading();
      if (res.data && res.data.length > 0) {
        const user = res.data[0];
        
        // 校验密码
        if (user.passwordPlain !== password) {
          return wx.showToast({ title: '密码错误，请重新输入', icon: 'none' });
        }
        
        if (user.status !== 'active') {
          return wx.showToast({ title: '该账号已被停用', icon: 'none' });
        }
        
        this.doLoginSuccess({
          id: user._id,
          name: user.name,
          role: user.role,
          phone: user.phone,
          department: user.department,
          avatarUrl: ''
        });
      } else {
        wx.showToast({ title: '账号不存在，请联系管理员', icon: 'none' });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('登录失败:', err);
      wx.showToast({ title: '网络异常，请重试', icon: 'none' });
    });
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