// pages/login/index.js
import { requestSubscribe } from '../../utils/subscribe';

Page({
  data: {
    username: '',
    password: '',
    showPassword: false,
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

  togglePassword() {
    this.setData({ showPassword: !this.data.showPassword });
  },

  handleLogin() {
    const { username, password } = this.data;
    
    if (!username.trim()) {
      return wx.showToast({ title: '请输入账号', icon: 'none' });
    }
    if (!password.trim()) {
      return wx.showToast({ title: '请输入密码', icon: 'none' });
    }

    // 在用户点击登录按钮的同步执行栈中请求订阅消息授权
    // 这是微信小程序的强制要求（不能在异步回调里拉起授权）
    requestSubscribe().catch(() => {});

    wx.showLoading({ title: '登录中...' });
    
    // 调用云数据库进行真实鉴权 (支持 phone 或 account)
    const db = wx.cloud.database();
    const _ = db.command;
    db.collection('users').where(_.or([
      { phone: username },
      { account: username }
    ])).get().then(res => {
      if (res.data && res.data.length > 0) {
        const user = res.data[0];
        
        // 校验密码
        if (user.passwordPlain !== password && user.passwordHash !== password) {
          wx.hideLoading();
          return wx.showToast({ title: '密码错误，请重新输入', icon: 'none' });
        }
        
        if (user.status !== 'active') {
          wx.hideLoading();
          return wx.showToast({ title: '该账号已被停用', icon: 'none' });
        }
        
        this.doLoginSuccess({
          id: user._id,
          name: user.name,
          role: user.role,
          phone: user.phone,
          account: user.account,
          department: user.department,
          avatarUrl: ''
        }, password);
      } else {
        wx.hideLoading();
        wx.showToast({ title: '账号不存在或密码错误', icon: 'none' });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('登录失败:', err);
      wx.showToast({ title: '网络异常，请重试', icon: 'none' });
    });
  },

  async doLoginSuccess(userInfo, passwordUsed) {
    wx.hideLoading();
    
    // 把本次登录使用的密码临时存起来用于校验状态，但不展示在UI
    userInfo._loginPassword = passwordUsed;
    
    const db = wx.cloud.database();
    
    // 如果登录账号有关联最新的员工信息，同步最新数据到缓存
    db.collection('users').doc(userInfo._id || userInfo.id).get().then(res => {
      const latestUser = res.data;
      latestUser._loginPassword = passwordUsed;
      wx.setStorageSync('userInfo', latestUser);
    }).catch(() => {
      wx.setStorageSync('userInfo', userInfo);
    });
    
    // 每次重新登录时清空全局状态，防止上一个账号的筛选条件残留
    const app = getApp();
    if (app) app.globalData = {};

    wx.showToast({ title: '登录成功', icon: 'success' });

    // 使用云函数绑定当前微信的 OpenID 到此账号
    // 通过将 OpenID 作为 sessionToken，实现“同微信多端登录不踢人，异微信登录互踢”
    try {
      const res = await wx.cloud.callFunction({
        name: 'bindOpenId',
        data: { 
          userId: userInfo._id || userInfo.id
        }
      });
      if (res.result && res.result.openid) {
        wx.setStorageSync('sessionToken', res.result.openid);
      }
    } catch (err) {
      console.error('绑定 OpenID 失败:', err);
    }

    setTimeout(() => {
      wx.switchTab({
        url: '/pages/index/index'
      });
    }, 1000);
  },

  contactAdmin() {
    wx.showModal({
      title: '联系管理员',
      content: '请联系微信chyxinxin222',
      showCancel: false,
      confirmText: '我知道了'
    });
  }
});