// pages/profile/index.js
Page({
  /**
   * 页面的初始数据
   */
  data: {
    userInfo: null,
    myTodosCount: 0,
    myLeadsCount: 0,
    myProjectsCount: 0,
    showEditModal: false,
    editName: "",
    unreadCount: 0,
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    const userInfo = wx.getStorageSync("userInfo");
    if (!userInfo) {
      wx.reLaunch({
        url: "/pages/login/index",
      });
    } else {
      this.setData({ userInfo });
      this.fetchStats(userInfo);
    }
  },

  fetchStats(userInfo) {
    const db = wx.cloud.database();
    const _ = db.command;
    const name = userInfo.name;

    // 获取与我相关的未完成待办
    db.collection('todos').where({
      status: 'pending',
      assignees: _.elemMatch({ name: name })
    }).count().then(res => {
      this.setData({ myTodosCount: res.total });
    }).catch(console.error);

    // 获取我负责的客户
    db.collection('leads').where(
      _.or([
        { sales: name },
        { designer: name }
      ])
    ).count().then(res => {
      this.setData({ myLeadsCount: res.total });
    }).catch(console.error);

    // 获取我负责的工地
    db.collection('projects').where({
      manager: name
    }).count().then(res => {
      this.setData({ myProjectsCount: res.total });
    }).catch(console.error);
  },

  fetchUnreadNotifications(userName) {
    const db = wx.cloud.database();
    const _ = db.command;
    db.collection('notifications').where({
      targetUser: _.in([userName, 'all']),
      isRead: false
    }).count().then(res => {
      this.setData({ unreadCount: res.total });
    }).catch(err => {
      console.error('获取未读通知失败', err);
    });
  },

  openEditName() {
    this.setData({
      showEditModal: true,
      editName: this.data.userInfo.name || "",
    });
  },

  closeEditName() {
    this.setData({
      showEditModal: false,
      editName: "",
    });
  },

  onNameInput(e) {
    this.setData({
      editName: e.detail.value,
    });
  },

  saveName() {
    const newName = this.data.editName.trim();
    if (!newName) {
      wx.showToast({ title: "姓名不能为空", icon: "none" });
      return;
    }
    if (newName === this.data.userInfo.name) {
      this.closeEditName();
      return;
    }

    wx.showLoading({ title: "保存中" });
    const db = wx.cloud.database();
    const userId = this.data.userInfo.id || this.data.userInfo._id;
    
    console.log("准备更新的用户ID:", userId, "新姓名:", newName);

    db.collection("users")
      .doc(userId)
      .update({
        data: {
          name: newName,
        },
      })
      .then((res) => {
        console.log("更新姓名成功:", res);
        wx.hideLoading();
        wx.showToast({ title: "修改成功", icon: "success" });

        // 更新本地存储和页面状态
        const updatedUserInfo = { ...this.data.userInfo, name: newName };
        wx.setStorageSync("userInfo", updatedUserInfo);
        this.setData({
          userInfo: updatedUserInfo,
          showEditModal: false,
        });
      })
      .catch((err) => {
        wx.hideLoading();
        console.error("更新姓名失败", err);
        wx.showToast({ title: "修改失败", icon: "none" });
      });
  },

  goToMaterials() {
    wx.navigateTo({ url: "/pages/materials/index" });
  },

  goToTeam() {
    wx.navigateTo({ url: "/pages/employees/index" });
  },

  goToNotifications() {
    wx.navigateTo({ url: "/pages/notifications/index" });
  },

  handleLogout() {
    wx.showModal({
      title: "提示",
      content: "确定要退出登录吗？",
      success(res) {
        if (res.confirm) {
          wx.removeStorageSync("userInfo");
          wx.reLaunch({
            url: "/pages/login/index",
          });
        }
      },
    });
  },
});
