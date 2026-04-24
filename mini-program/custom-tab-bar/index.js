Component({
  data: {
    selected: 0,
    unreadCount: 0,
    hidden: false,
    showMask: false,
    list: [
      { pagePath: "/pages/index/index", text: "待办", iconClass: "icon-todo" },
      { pagePath: "/pages/leads/index", text: "客户", iconClass: "icon-leads" },
      { pagePath: "/pages/projects/index", text: "工地", iconClass: "icon-projects" },
      { pagePath: "/pages/notifications/index", text: "消息", iconClass: "icon-message" }
    ]
  },
  lifetimes: {
    attached() {
      this.fetchGlobalUnread();
    }
  },
  pageLifetimes: {
    show() {
      this.fetchGlobalUnread();
    }
  },
  methods: {
    noop() {},
    switchTab(e) {
      const data = e.currentTarget.dataset;
      const url = data.path;
      wx.switchTab({ url });
    },
    // 供其他页面调用更新未读数
    updateUnread(count) {
      this.setData({ unreadCount: count });
    },
    // 全局获取未读消息数
    fetchGlobalUnread() {
      const userInfo = wx.getStorageSync('userInfo');
      if (!userInfo || !userInfo.name) return;
      
      const db = wx.cloud.database();
      const _ = db.command;
      const userName = userInfo.name;
      const isAdmin = userInfo.role === 'admin';

      // 必须把目标用户的条件放在数据库查询中，避免因 100 条限制导致其他人的未读消息把自己的挤掉
      let targetCondition;
      if (isAdmin) {
        targetCondition = _.or([
          _.eq(userName),
          _.eq('all'),
          _.eq('admin'),
          _.exists(false) // 兼容没有 targetUser 字段的老数据
        ]);
      } else {
        targetCondition = _.or([
          _.eq(userName),
          _.eq('all')
        ]);
      }

      db.collection('notifications')
        .where({
          isRead: _.neq(true),
          targetUser: targetCondition
        })
        .count() // 直接用 count 获取真实总数，突破 100 条限制
        .then(res => {
          this.setData({ unreadCount: res.total });
        })
        .catch(err => console.error('获取全局未读消息失败', err));
    }
  }
})