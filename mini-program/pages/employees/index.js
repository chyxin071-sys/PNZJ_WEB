const employeesData = require('../../mock/employees.js');

Page({
  data: {
    allEmployees: [],
    filteredEmployees: [],
    searchQuery: '',
    activeTab: 'all', // all, sales, designer, manager, admin
    tabs: [
      { key: 'all', name: '全部' },
      { key: 'sales', name: '销售' },
      { key: 'designer', name: '设计' },
      { key: 'manager', name: '工程' },
      { key: 'admin', name: '管理' }
    ]
  },

  onLoad() {
    this.setData({ allEmployees: employeesData });
    this.filterEmployees();
  },

  onSearch(e) {
    this.setData({ searchQuery: e.detail.value }, () => {
      this.filterEmployees();
    });
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab }, () => {
      this.filterEmployees();
    });
  },

  filterEmployees() {
    let filtered = [...this.data.allEmployees];

    // 搜索过滤
    if (this.data.searchQuery) {
      const q = this.data.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(emp => {
        const nameMatch = emp.name ? String(emp.name).toLowerCase().includes(q) : false;
        const phoneMatch = emp.username ? String(emp.username).includes(q) : false;
        return nameMatch || phoneMatch;
      });
    }

    // 角色过滤
    if (this.data.activeTab !== 'all') {
      filtered = filtered.filter(emp => emp.role === this.data.activeTab);
    }

    this.setData({ filteredEmployees: filtered });
  },

  addEmployee() {
    wx.showToast({
      title: '小程序端暂不支持添加员工，请前往Web端操作',
      icon: 'none',
      duration: 2000
    });
  }
});