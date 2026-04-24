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

    let query = db.collection('notifications');
    
    let targetCondition;
    if (isAdmin) {
      targetCondition = _.or([
        _.eq(userName),
        _.eq('all'),
        _.eq('admin'),
        _.exists(false)
      ]);
    } else {
      targetCondition = _.or([
        _.eq(userName),
        _.eq('all')
      ]);
    }

    // 组合基本条件
    const baseWhere = { targetUser: targetCondition };

    // 为了防止旧的未读消息被 100 条限制冲掉，当处于“未读” tab 时，必须加上未读的条件查询
    if (this.data.activeTab === 'unread') {
      baseWhere.isRead = _.neq(true);
    } else if (this.data.activeTab === 'starred') {
      baseWhere.isStarred = true;
    } else if (this.data.activeTab === 'all') {
      // “全部消息”仅保留一个月内的消息
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      baseWhere.createTime = _.gte(oneMonthAgo);
    }

    query = query.where(baseWhere);

    query.count().then(countRes => {
      const total = countRes.total;
      const MAX_LIMIT = 20;
      const batchTimes = Math.ceil(total / MAX_LIMIT);
      const tasks = [];
      for (let i = 0; i < batchTimes; i++) {
        tasks.push(
          query.orderBy('createTime', 'desc').skip(i * MAX_LIMIT).limit(MAX_LIMIT).get()
        );
      }
      
      if (tasks.length === 0) {
        return Promise.resolve([]);
      }
      return Promise.all(tasks);
    })
    .then(results => {
      wx.stopPullDownRefresh();
      
      // 合并所有批次的数据
      const allData = results.reduce((acc, cur) => acc.concat(cur ? cur.data : []), []);
      
      let list = allData.map(item => {
          // 格式化时间
          const date = new Date(item.createTime);
          const now = new Date();
          const isToday = date.toDateString() === now.toDateString();
          item.createTimeStr = isToday 
            ? `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
            : `${date.getMonth() + 1}-${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

          let senderName = item.senderName;
          if (!senderName && item.content) {
            // 尝试从内容开头提取操作人名字
            const match = item.content.match(/^([^\s【】]+)\s*(更新|指派|创建|删除|完成|取消)/);
            if (match) {
              senderName = match[1];
            }
            // 如果内容以【系统】开头，强制认为是系统
            if (item.content.startsWith('【系统】') || item.content.includes('系统记录')) {
              senderName = '系统';
            }
          }
          
          // 如果名字被错误地提取成了带括号的，去掉括号
          if (senderName && typeof senderName === 'string' && senderName.startsWith('【') && senderName.endsWith('】')) {
            senderName = senderName.slice(1, -1);
          }

          item.senderName = senderName || null;
          
          // 给默认角色，如果后续需要精准角色可以在这加联查，这里先用默认的即可
          item.senderRole = item.senderRole || 'default';

          return item;
        });

        this.setData({ notifications: list, loading: false });
        
        // 使用全局方法更新未读数到 tab bar
        if (typeof this.getTabBar === 'function' && this.getTabBar()) {
          this.getTabBar().fetchGlobalUnread();
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
