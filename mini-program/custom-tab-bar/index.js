Component({
  data: {
    selected: 0,
    list: [
      { pagePath: "/pages/index/index", iconClass: "icon-todo" },
      { pagePath: "/pages/leads/index", iconClass: "icon-leads" },
      { pagePath: "/pages/projects/index", iconClass: "icon-projects" },
      { pagePath: "/pages/profile/index", iconClass: "icon-profile" }
    ]
  },
  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset;
      const url = data.path;
      wx.switchTab({ url });
    }
  }
})