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
    showPhoneModal: false,
    editPhone: "",
    unreadCount: 0,
    showAvatarModal: false,
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
      this.calculateJoinDays(userInfo);
      this.setData({ userInfo });
      this.fetchStats(userInfo);
    }
  },

  calculateJoinDays(userInfo) {
    if (userInfo.joinDate) {
      const start = new Date(userInfo.joinDate);
      const now = new Date();
      start.setHours(0, 0, 0, 0);
      now.setHours(0, 0, 0, 0);
      const diffTime = Math.abs(now - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include the first day
      userInfo.joinDays = diffDays;
    } else {
      userInfo.joinDays = 0;
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

  viewAvatarFull() {
    wx.previewImage({
      urls: [this.data.userInfo.avatarUrl],
      current: this.data.userInfo.avatarUrl,
    });
  },

  previewAvatar() {
    this.setData({ showAvatarModal: true });
  },

  closeAvatarModal() {
    this.setData({ showAvatarModal: false });
  },

  resetAvatar() {
    this.setData({ showAvatarModal: false });
    wx.showModal({
      title: '还原默认头像',
      content: '确定要移除自定义头像，恢复为默认头像吗？',
      success: (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '处理中' });
        const db = wx.cloud.database();
        const userId = this.data.userInfo._id || this.data.userInfo.id;
        db.collection('users').doc(userId).update({
          data: { avatarUrl: '' }
        }).then(() => {
          wx.hideLoading();
          const updatedUser = { ...this.data.userInfo, avatarUrl: '' };
          wx.setStorageSync('pnzj_user', updatedUser);
          wx.setStorageSync('userInfo', updatedUser);
          this.setData({ userInfo: updatedUser });
          wx.showToast({ title: '已还原默认', icon: 'success' });
        }).catch(() => {
          wx.hideLoading();
          wx.showToast({ title: '操作失败', icon: 'none' });
        });
      }
    });
  },

  changeAvatar() {
    this.setData({ showAvatarModal: false });
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempPath = res.tempFiles[0].tempFilePath;
        wx.showLoading({ title: '处理中' });

        // 上传前二次压缩，quality 60 大幅减小体积，加快加载速度
        wx.compressImage({
          src: tempPath,
          quality: 60,
          success: (compressRes) => {
            const userId = this.data.userInfo._id || this.data.userInfo.id;
            const cloudPath = `avatars/${userId}_${Date.now()}.jpg`;
            wx.showLoading({ title: '上传中' });

            wx.cloud.uploadFile({
              cloudPath,
              filePath: compressRes.tempFilePath,
              success: (uploadRes) => {
                const avatarUrl = uploadRes.fileID;
                const db = wx.cloud.database();
                db.collection('users').doc(userId).update({
                  data: { avatarUrl }
                }).then(() => {
                  wx.hideLoading();
                  const updatedUser = { ...this.data.userInfo, avatarUrl };
                  wx.setStorageSync('pnzj_user', updatedUser);
                  wx.setStorageSync('userInfo', updatedUser);
                  this.setData({ userInfo: updatedUser });
                  wx.showToast({ title: '头像已更新', icon: 'success' });
                }).catch(() => {
                  wx.hideLoading();
                  wx.showToast({ title: '保存失败', icon: 'none' });
                });
              },
              fail: (err) => {
                wx.hideLoading();
                console.error('头像上传失败', err);
                wx.showToast({ title: '上传失败，请重试', icon: 'none' });
              }
            });
          },
          fail: () => {
            wx.hideLoading();
            wx.showToast({ title: '图片处理失败', icon: 'none' });
          }
        });
      }
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

  openEditPhone() {
    this.setData({
      showPhoneModal: true,
      editPhone: this.data.userInfo.phone || "",
    });
  },

  closeEditPhone() {
    this.setData({
      showPhoneModal: false,
      editPhone: "",
    });
  },

  onPhoneInput(e) {
    this.setData({
      editPhone: e.detail.value,
    });
  },

  savePhone() {
    const newPhone = this.data.editPhone.trim();
    if (!newPhone) {
      wx.showToast({ title: "手机号不能为空", icon: "none" });
      return;
    }
    
    wx.showLoading({ title: "校验中" });
    const db = wx.cloud.database();
    
    db.collection('users').where({ phone: newPhone }).get().then(res => {
      const existUsers = res.data.filter(u => u._id !== (this.data.userInfo._id || this.data.userInfo.id));
      if (existUsers.length > 0) {
        wx.hideLoading();
        return wx.showToast({ title: '该手机号已被使用', icon: 'none' });
      }

      db.collection('users').doc(this.data.userInfo._id || this.data.userInfo.id).update({
        data: { phone: newPhone }
      }).then(() => {
        const updatedUser = { ...this.data.userInfo, phone: newPhone };
        wx.setStorageSync("userInfo", updatedUser);
        this.setData({
          userInfo: updatedUser,
          showPhoneModal: false,
          editPhone: "",
        });
        wx.hideLoading();
        wx.showToast({ title: "修改成功", icon: "success" });
      }).catch(err => {
        wx.hideLoading();
        wx.showToast({ title: "修改失败", icon: "none" });
      });
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({ title: "网络异常", icon: "none" });
    });
  },

  onJoinDateChange(e) {
    const newDate = e.detail.value;
    if (!newDate) return;
    
    wx.showLoading({ title: "保存中" });
    const db = wx.cloud.database();
    
    db.collection('users').doc(this.data.userInfo._id || this.data.userInfo.id).update({
      data: { joinDate: newDate }
    }).then(() => {
      const updatedUser = { ...this.data.userInfo, joinDate: newDate };
      this.calculateJoinDays(updatedUser);
      wx.setStorageSync("userInfo", updatedUser);
      this.setData({
        userInfo: updatedUser,
      });
      wx.hideLoading();
      wx.showToast({ title: "修改成功", icon: "success" });
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({ title: "修改失败", icon: "none" });
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
        if (res.stats && res.stats.updated === 0) {
          wx.hideLoading();
          wx.showToast({ title: "权限不足，请联系超级管理员在组织架构中修改", icon: "none", duration: 3000 });
          return;
        }
        console.log("更新姓名成功:", res);
        
        // --- 开始全局名字同步联动 ---
        // 1. 同步客户线索 (leads)
        db.collection('leads').where(_.or([
          { creatorName: oldName },
          { sales: oldName },
          { designer: oldName },
          { manager: oldName },
          { signer: oldName }
        ])).get().then(res => {
          res.data.forEach(item => {
            let updateData = {};
            if (item.creatorName === oldName) updateData.creatorName = newName;
            if (item.sales === oldName) updateData.sales = newName;
            if (item.designer === oldName) updateData.designer = newName;
            if (item.manager === oldName) updateData.manager = newName;
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
        db.collection('followUps').where({ createdBy: oldName }).limit(1000).get().then(res => {
          res.data.forEach(item => {
            db.collection('followUps').doc(item._id).update({
              data: { createdBy: newName }
            }).catch(err => {
              console.error('同步跟进记录失败:', item._id, err);
            });
          });
        }).catch(err => {
          console.error('查询跟进记录失败:', err);
        });

        // 6. 同步消息通知 (notifications)
        db.collection('notifications').where(_.or([
          { senderName: oldName },
          { targetUser: oldName }
        ])).limit(1000).get().then(res => {
          res.data.forEach(item => {
            let updateData = {};
            if (item.senderName === oldName) updateData.senderName = newName;
            if (item.targetUser === oldName) updateData.targetUser = newName;
            db.collection('notifications').doc(item._id).update({
              data: updateData
            }).catch(err => {
              console.error('同步通知失败:', item._id, err);
            });
          });
        }).catch(err => {
          console.error('查询通知失败:', err);
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

      // 2. 更新新密码（同时更新明文和哈希字段，确保两端都能登录）
      db.collection('users').doc(userInfo._id || userInfo.id).update({
        data: {
          passwordPlain: newPassword,
          passwordHash: newPassword  // 小程序端无法使用bcrypt，所以两个字段都存明文
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
