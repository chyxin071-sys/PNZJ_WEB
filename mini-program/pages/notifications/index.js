// pages/notifications/index.js
Page({
  data: {
    activeTab: 'unread', // 'unread' or 'all'
    notifications: [],
    loading: false,
    userInfo: null,
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({ userInfo });
    }
  },

  onShow() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
    }
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo) {
      wx.reLaunch({
        url: "/pages/login/index",
      });
      return;
    }
    this.fetchNotifications();
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (this.data.activeTab === tab) return;
    this.setData({ activeTab: tab }, () => {
      this.fetchNotifications();
    });
  },

  fetchNotifications() {
    if (!this.data.userInfo) return;
    this.setData({ loading: true });

    const db = wx.cloud.database();
    const _ = db.command;
    const userName = this.data.userInfo.name;
    const isAdmin = this.data.userInfo.role === 'admin';

    // 去掉复杂的 where 查询，直接全部拉下来在前端过滤
    // 这样彻底避免任何因为云数据库版本/索引/字段缺失导致的拉取失败
    db.collection('notifications')
      .orderBy('createTime', 'desc')
      .limit(100) // 考虑到前端过滤，多拉取一些
      .get()
      .then(res => {
        wx.stopPullDownRefresh();
        
        // --- 核心：将条件过滤转移到前端执行 ---
        let filteredList = res.data.filter(item => {
          // 1. 权限过滤
          const target = item.targetUser;
          const hasPermission = isAdmin 
            ? (target === userName || target === 'all' || target === 'admin' || !target) 
            : (target === userName || target === 'all');
            
          if (!hasPermission) return false;

          // 2. 未读过滤
          if (this.data.activeTab === 'unread' && item.isRead === true) {
            return false;
          }
          
          // 3. 收藏过滤
          if (this.data.activeTab === 'starred' && !item.isStarred) {
            return false;
          }
          
          return true;
        });

        const list = filteredList.map(item => {
          // 格式化时间
          const date = new Date(item.createTime);
          const now = new Date();
          const isToday = date.toDateString() === now.toDateString();
          item.createTimeStr = isToday 
            ? `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
            : `${date.getMonth() + 1}-${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
          return item;
        });

        this.setData({ notifications: list, loading: false });
        
        // 更新未读数到 tab bar
        if (this.data.activeTab === 'unread') {
          if (typeof this.getTabBar === 'function' && this.getTabBar()) {
            this.getTabBar().updateUnread(list.length);
          }
        }
      })
      .catch(err => {
        wx.stopPullDownRefresh();
        console.error('获取通知失败', err);
        
        // 增加权限诊断提示
        let errorMsg = '加载失败';
        if (err.errCode === -502001 || String(err).includes('database collection not exists')) {
          errorMsg = '数据库 notifications 集合不存在';
          wx.showModal({
            title: '配置错误',
            content: '云数据库中未找到 `notifications` 集合。\n请在微信开发者工具->云开发->数据库中，新建集合 `notifications`，并将权限设为【所有用户可读，仅创建者可读写】或【自定义】',
            showCancel: false
          });
        } else if (err.errCode === -502003 || String(err).includes('permission denied')) {
          errorMsg = '数据库权限不足';
          wx.showModal({
            title: '权限错误',
            content: '`notifications` 集合权限不足。\n请在云开发控制台中，将该集合的数据权限修改为【自定义】，并设置 read 为 true，write 为 true。',
            showCancel: false
          });
        } else {
          wx.showToast({ title: errorMsg, icon: 'none' });
        }
        
        this.setData({ loading: false });
      });
  },

  onSwipeChange(e) {
    if (e.detail.source === 'touch') {
      const index = e.currentTarget.dataset.index;
      this.setData({
        [`notifications[${index}].x`]: e.detail.x
      });
    }
  },

  onSwipeEnd(e) {
    const index = e.currentTarget.dataset.index;
    const x = this.data.notifications[index].x;
    
    // 如果向左滑动（x为负数）超过一定阈值，就展开
    if (x < -30) {
      this.setData({ [`notifications[${index}].x`]: -140 }); // 完全展开
    } else {
      this.setData({ [`notifications[${index}].x`]: 0 }); // 收回
    }
  },

  toggleStar(e) {
    const id = e.currentTarget.dataset.id;
    const index = e.currentTarget.dataset.index;
    const item = this.data.notifications[index];
    const newStatus = !item.isStarred;

    // 先收起侧滑菜单
    this.setData({ [`notifications[${index}].x`]: 0 });

    wx.showLoading({ title: '处理中' });
    const db = wx.cloud.database();
    db.collection('notifications').doc(id).update({
      data: { isStarred: newStatus }
    }).then(() => {
      wx.hideLoading();
      wx.showToast({ title: newStatus ? '已收藏' : '已取消收藏', icon: 'success' });
      
      // 更新本地数据
      const list = this.data.notifications;
      list[index].isStarred = newStatus;
      
      // 如果当前在收藏 tab 并且取消了收藏，则移除
      if (this.data.activeTab === 'starred' && !newStatus) {
        list.splice(index, 1);
      }
      this.setData({ notifications: list });
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '操作失败', icon: 'none' });
    });
  },

  deleteNotification(e) {
    const id = e.currentTarget.dataset.id;
    const index = e.currentTarget.dataset.index;
    
    // 先收起侧滑菜单
    this.setData({ [`notifications[${index}].x`]: 0 });

    wx.showModal({
      title: '删除通知',
      content: '确定要删除这条消息吗？',
      confirmColor: '#e11d48',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中' });
          const db = wx.cloud.database();
          db.collection('notifications').doc(id).remove().then(() => {
            wx.hideLoading();
            wx.showToast({ title: '已删除', icon: 'success' });
            
            const list = this.data.notifications;
            list.splice(index, 1);
            this.setData({ notifications: list });
          }).catch(() => {
            wx.hideLoading();
            wx.showToast({ title: '删除失败', icon: 'none' });
          });
        }
      }
    });
  },

  handleNotificationClick(e) {
    const item = e.currentTarget.dataset.item;
    
    // 如果未读，则标记为已读
    if (!item.isRead) {
      const db = wx.cloud.database();
      db.collection('notifications').doc(item._id).update({
        data: { isRead: true }
      }).then(() => {
        // 更新本地列表状态
        const list = this.data.notifications.map(n => {
          if (n._id === item._id) n.isRead = true;
          return n;
        });
        
        // 如果在未读 tab 下点击，则从列表中移除
        if (this.data.activeTab === 'unread') {
          const newList = list.filter(n => !n.isRead);
          this.setData({ notifications: newList });
          if (typeof this.getTabBar === 'function' && this.getTabBar()) {
            this.getTabBar().updateUnread(newList.length);
          }
        } else {
          this.setData({ notifications: list });
        }
      });
    }

    // 根据通知类型跳转
    if (item.link) {
      wx.navigateTo({ url: item.link });
    } else if (item.type === 'todo') {
      wx.switchTab({ url: '/pages/index/index' });
    } else if (item.type === 'lead') {
      wx.switchTab({ url: '/pages/leads/index' });
    } else if (item.type === 'project') {
      wx.switchTab({ url: '/pages/projects/index' });
    }
  },

  onPullDownRefresh() {
    this.fetchNotifications();
    wx.stopPullDownRefresh();
  },

  goToProfile() {
    wx.navigateTo({ url: '/pages/profile/index' });
  }
});
