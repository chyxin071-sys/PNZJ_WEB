Component({
  data: {
    selected: 0,
    unreadCount: 0,
    list: [
      { pagePath: "/pages/index/index", text: "待办", iconClass: "icon-todo" },
      { pagePath: "/pages/leads/index", text: "客户", iconClass: "icon-leads" },
      { pagePath: "/pages/projects/index", text: "工地", iconClass: "icon-projects" },
      { pagePath: "/pages/notifications/index", text: "消息", iconClass: "icon-message" }
    ]
  },
  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset;
      const url = data.path;
      wx.switchTab({ url });
    },
    // 供其他页面调用更新未读数
    updateUnread(count) {
      this.setData({ unreadCount: count });
    }
  }
})