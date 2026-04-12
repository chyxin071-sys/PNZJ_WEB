const leadsData = require('../../mock/leads.js');

Page({
  data: {
    leads: [],
    allLeads: [],
    today: '',
    totalCount: 0,
    aRatingCount: 0,
    signedCount: 0,
    activeTab: '全部',
    searchQuery: '',
    timeFilterOptions: ['全部时间', '最近一周', '最近一月', '最近一年'],
    timeFilterIndex: 2, // 默认最近一月
    timeFilterLabel: '最近一月',

    showFilterModal: false,
    filterEmployees: [
      { id: 1, name: '销售A', selected: false },
      { id: 2, name: '设计师B', selected: false },
      { id: 3, name: '项目经理C', selected: false }
    ],
    selectedEmployeeIds: []
  },

  onShow() {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo) {
      wx.reLaunch({
        url: '/pages/login/index'
      });
      return;
    }
    this.initData();
  },

  initData() {
    const d = new Date();
    this.setData({ 
      today: `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`,
      allLeads: leadsData
    });
    this.updateDashboard();
    this.filterLeads();
  },

  updateDashboard() {
    const data = this.data.allLeads;
    this.setData({
      totalCount: data.length,
      aRatingCount: data.filter(l => l.rating === 'A').length,
      signedCount: data.filter(l => l.status === '已签单').length
    });
  },

  filterLeads() {
    let filtered = this.data.allLeads;
    
    if (this.data.activeTab !== '全部') {
      if (this.data.activeTab === 'A级') {
        filtered = filtered.filter(l => l.rating === 'A');
      } else if (this.data.activeTab === '已签单') {
        filtered = filtered.filter(l => l.status === '已签单');
      }
    }
    
    if (this.data.searchQuery) {
      const q = this.data.searchQuery.toLowerCase();
      filtered = filtered.filter(l => 
        l.name.toLowerCase().includes(q) || 
        l.phone.includes(q) ||
        l.address.toLowerCase().includes(q)
      );
    }

    // 时间范围过滤 (以 lastFollowUp 为主)
    if (this.data.timeFilterIndex > 0) {
      const now = new Date();
      const filterMs = {
        1: 7 * 24 * 3600 * 1000,
        2: 30 * 24 * 3600 * 1000,
        3: 365 * 24 * 3600 * 1000
      };
      const limitMs = filterMs[this.data.timeFilterIndex];

      filtered = filtered.filter(l => {
        if (!l.lastFollowUp) return true;
        const diff = now.getTime() - new Date(l.lastFollowUp.replace(/-/g, '/')).getTime();
        return Math.abs(diff) <= limitMs;
      });
    }

    // 人员高级筛选过滤
    if (this.data.selectedEmployeeIds && this.data.selectedEmployeeIds.length > 0) {
      const selectedNames = this.data.filterEmployees
        .filter(e => e.selected)
        .map(e => e.name);
      
      filtered = filtered.filter(l => {
        return selectedNames.includes(l.sales) || selectedNames.includes(l.designer);
      });
    }

    this.setData({ leads: filtered });
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (this.data.activeTab === tab) return;
    this.setData({ activeTab: tab }, () => {
      this.filterLeads();
    });
  },

  onLoad() {
    // 恢复筛选状态
    const app = getApp();
    if (app.globalData && app.globalData.leadFilters) {
      const f = app.globalData.leadFilters;
      this.setData({
        timeFilterIndex: f.timeFilterIndex,
        timeFilterLabel: f.timeFilterLabel,
        filterEmployees: f.filterEmployees || this.data.filterEmployees,
        selectedEmployeeIds: f.selectedEmployeeIds || []
      });
    }

    this.setData({ allLeads: leadsData });
    this.filterLeads();
  },

  saveFilterState() {
    const app = getApp();
    if (!app.globalData) app.globalData = {};
    app.globalData.leadFilters = {
      timeFilterIndex: this.data.timeFilterIndex,
      timeFilterLabel: this.data.timeFilterLabel,
      filterEmployees: this.data.filterEmployees,
      selectedEmployeeIds: this.data.selectedEmployeeIds
    };
  },

  onSearch(e) {
    this.setData({ searchQuery: e.detail.value }, () => {
      this.filterLeads();
    });
  },

  onTimeFilterChange(e) {
    const idx = parseInt(e.detail.value);
    this.setData({ 
      timeFilterIndex: idx,
      timeFilterLabel: this.data.timeFilterOptions[idx]
    }, () => {
      this.saveFilterState();
      this.filterLeads();
    });
  },

  preventTap() {
    // 阻止冒泡到卡片的详情跳转
  },

  onStatusChange(e) {
    const newStatusIndex = e.detail.value;
    const statuses = ['待分配', '跟进中', '已量房', '已出图', '已报预估', '已签单', '已流失'];
    const newStatus = statuses[newStatusIndex];
    const leadId = e.currentTarget.dataset.id;
    
    // 更新数据
    const all = this.data.allLeads.map(l => {
      if (l.id === leadId) {
        return { ...l, status: newStatus };
      }
      return l;
    });
    
    this.setData({ allLeads: all }, () => {
      this.updateDashboard();
      this.filterLeads();
      wx.showToast({ title: '状态已更新', icon: 'success' });
    });
  },

  createLead() {
    wx.navigateTo({ url: '/pages/leadForm/index' });
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (id) {
      wx.navigateTo({ url: `/pages/leadDetail/index?id=${id}` });
    }
  },

  callPhone(e) {
    const phone = e.currentTarget.dataset.phone;
    wx.makePhoneCall({ phoneNumber: phone });
  },

  openAdvancedFilter() {
    this.setData({ showFilterModal: true });
  },
  closeFilterModal() {
    this.setData({ showFilterModal: false });
  },
  toggleFilterEmployee(e) {
    const id = e.currentTarget.dataset.id;
    const employees = this.data.filterEmployees.map(emp => {
      if (emp.id === id) {
        return { ...emp, selected: !emp.selected };
      }
      return emp;
    });
    this.setData({ filterEmployees: employees });
  },
  applyFilter() {
    const selected = this.data.filterEmployees.filter(e => e.selected).map(e => e.id);
    this.setData({ 
      selectedEmployeeIds: selected,
      showFilterModal: false 
    }, () => {
      this.saveFilterState();
      this.filterLeads();
    });
  }
})