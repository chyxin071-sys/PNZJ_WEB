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
    showPasswordModal: false,
    oldPassword: "",
    newPassword: "",
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

  onPasswordInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
  },

  openEditPassword() {
    this.setData({
      showPasswordModal: true,
      oldPassword: "",
      newPassword: "",
      showOldPwd: false,
      showNewPwd: false
    });
  },

  togglePwdVisibility(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: !this.data[field] });
  },

  closePasswordModal() {
    this.setData({ showPasswordModal: false });
  },

  saveName() {
    const newName = this.data.editName.trim();
    if (!newName) {
      wx.showToast({ title: "姓名不能为空", icon: "none" });
      return;
    }
    const oldName = this.data.userInfo.name;
    if (newName === oldName) {
      this.closeEditName();
      return;
    }

    wx.showLoading({ title: "保存中", mask: true });
    const db = wx.cloud.database();
    const _ = db.command;
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
        
        // --- 开始全局名字同步联动 ---
        // 1. 同步客户线索 (leads)
        db.collection('leads').where(_.or([
          { creatorName: oldName },
          { sales: oldName },
          { designer: oldName },
          { signer: oldName }
        ])).get().then(res => {
          res.data.forEach(item => {
            let updateData = {};
            if (item.creatorName === oldName) updateData.creatorName = newName;
            if (item.sales === oldName) updateData.sales = newName;
            if (item.designer === oldName) updateData.designer = newName;
            if (item.signer === oldName) updateData.signer = newName;
            db.collection('leads').doc(item._id).update({ data: updateData });
          });
        });

        // 2. 同步工地 (projects)
        db.collection('projects').where(_.or([
          { manager: oldName },
          { sales: oldName },
          { designer: oldName }
        ])).get().then(res => {
          res.data.forEach(item => {
            let updateData = {};
            if (item.manager === oldName) updateData.manager = newName;
            if (item.sales === oldName) updateData.sales = newName;
            if (item.designer === oldName) updateData.designer = newName;
            db.collection('projects').doc(item._id).update({ data: updateData });
          });
        });

        // 3. 同步报价单 (quotes)
        db.collection('quotes').where(_.or([
          { sales: oldName },
          { modifier: oldName }
        ])).get().then(res => {
          res.data.forEach(item => {
            let updateData = {};
            if (item.sales === oldName) updateData.sales = newName;
            if (item.modifier === oldName) updateData.modifier = newName;
            db.collection('quotes').doc(item._id).update({ data: updateData });
          });
        });

        // 4. 同步待办 (todos)
        db.collection('todos').where(_.or([
          { creatorName: oldName },
          { 'assignees.name': oldName }
        ])).get().then(res => {
          res.data.forEach(item => {
            let updateData = {};
            if (item.creatorName === oldName) updateData.creatorName = newName;
            if (item.assignees) {
              let assignees = item.assignees.map(a => a.name === oldName ? { ...a, name: newName } : a);
              updateData.assignees = assignees;
              updateData.assignedNames = assignees.map(a => a.name).join(', ');
            }
            db.collection('todos').doc(item._id).update({ data: updateData });
          });
        });

        // 5. 同步跟进记录 (followUps)
        db.collection('followUps').where({ createdBy: oldName }).get().then(res => {
          res.data.forEach(item => {
            db.collection('followUps').doc(item._id).update({ data: { createdBy: newName } });
          });
        });

        // 6. 同步消息通知 (notifications)
        db.collection('notifications').where(_.or([
          { senderName: oldName },
          { targetUser: oldName }
        ])).get().then(res => {
          res.data.forEach(item => {
            let updateData = {};
            if (item.senderName === oldName) updateData.senderName = newName;
            if (item.targetUser === oldName) updateData.targetUser = newName;
            db.collection('notifications').doc(item._id).update({ data: updateData });
          });
        });
        // --- 结束全局同步 ---

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

  savePassword() {
    const { oldPassword, newPassword, userInfo } = this.data;
    if (!oldPassword.trim() || !newPassword.trim()) {
      return wx.showToast({ title: '请填写完整', icon: 'none' });
    }

    wx.showLoading({ title: '验证中...' });
    const db = wx.cloud.database();
    
    // 1. 验证原密码
    db.collection('users').doc(userInfo._id || userInfo.id).get().then(res => {
      const user = res.data;
      if (user.passwordPlain !== oldPassword && user.passwordHash !== oldPassword) {
        wx.hideLoading();
        return wx.showToast({ title: '原密码错误', icon: 'none' });
      }

      // 2. 更新新密码
      db.collection('users').doc(userInfo._id || userInfo.id).update({
        data: {
          passwordPlain: newPassword
        }
      }).then(() => {
        wx.hideLoading();
        wx.showToast({ title: '密码修改成功，请重新登录', icon: 'none' });
        this.closePasswordModal();
        setTimeout(() => {
          wx.removeStorageSync('userInfo');
          wx.reLaunch({ url: '/pages/login/index' });
        }, 1500);
      }).catch(err => {
        wx.hideLoading();
        wx.showToast({ title: '修改失败', icon: 'none' });
      });
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({ title: '网络异常', icon: 'none' });
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
