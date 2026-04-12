// pages/profile/index.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    userInfo: null,
    myTodosCount: 12,
    myLeadsCount: 56,
    myProjectsCount: 8
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
    }
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo) {
      wx.reLaunch({
        url: '/pages/login/index'
      });
    } else {
      this.setData({ userInfo });
    }
  },

  goToQuote() {
    wx.showToast({ title: '我的报价开发中', icon: 'none' });
  },

  goToMaterials() {
    wx.showToast({ title: '材料大厅开发中', icon: 'none' });
  },

  goToTeam() {
    wx.navigateTo({ url: '/pages/employees/index' });
  },

  handleLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success(res) {
        if (res.confirm) {
          wx.removeStorageSync('userInfo');
          wx.reLaunch({
            url: '/pages/login/index'
          });
        }
      }
    });
  }
})