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
    selectedEmployeeIds: [],

    filterRatings: [
      { name: 'A', selected: false },
      { name: 'B', selected: false },
      { name: 'C', selected: false },
      { name: 'D', selected: false }
    ],
    selectedRatings: [],

    filterSources: [
      { name: '自然进店', selected: false },
      { name: '老介新', selected: false },
      { name: '抖音', selected: false },
      { name: '小红书', selected: false },
      { name: '大众点评', selected: false },
      { name: '自有关系', selected: false },
      { name: '其他', selected: false }
    ],
    selectedSources: []
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
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
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
      const q = this.data.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(l => {
        const nameMatch = l.name ? String(l.name).toLowerCase().includes(q) : false;
        const phoneMatch = l.phone ? String(l.phone).includes(q) : false;
        const addressMatch = l.address ? String(l.address).toLowerCase().includes(q) : false;
        return nameMatch || phoneMatch || addressMatch;
      });
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

    // 评级过滤
    if (this.data.selectedRatings && this.data.selectedRatings.length > 0) {
      filtered = filtered.filter(l => this.data.selectedRatings.includes(l.rating));
    }

    // 来源过滤
    if (this.data.selectedSources && this.data.selectedSources.length > 0) {
      filtered = filtered.filter(l => this.data.selectedSources.includes(l.source));
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
        timeFilterIndex: f.timeFilterIndex !== undefined ? f.timeFilterIndex : 2,
        timeFilterLabel: f.timeFilterLabel || '最近一月',
        filterEmployees: f.filterEmployees || this.data.filterEmployees,
        selectedEmployeeIds: f.selectedEmployeeIds || [],
        filterRatings: f.filterRatings || this.data.filterRatings,
        selectedRatings: f.selectedRatings || [],
        filterSources: f.filterSources || this.data.filterSources,
        selectedSources: f.selectedSources || []
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
      selectedEmployeeIds: this.data.selectedEmployeeIds,
      filterRatings: this.data.filterRatings,
      selectedRatings: this.data.selectedRatings,
      filterSources: this.data.filterSources,
      selectedSources: this.data.selectedSources
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
  toggleFilterRating(e) {
    const name = e.currentTarget.dataset.name;
    const ratings = this.data.filterRatings.map(r => {
      if (r.name === name) {
        return { ...r, selected: !r.selected };
      }
      return r;
    });
    this.setData({ filterRatings: ratings });
  },
  toggleFilterSource(e) {
    const name = e.currentTarget.dataset.name;
    const sources = this.data.filterSources.map(s => {
      if (s.name === name) {
        return { ...s, selected: !s.selected };
      }
      return s;
    });
    this.setData({ filterSources: sources });
  },
  applyFilter() {
    const selectedEmps = this.data.filterEmployees.filter(e => e.selected).map(e => e.id);
    const selectedRats = this.data.filterRatings.filter(r => r.selected).map(r => r.name);
    const selectedSrcs = this.data.filterSources.filter(s => s.selected).map(s => s.name);

    this.setData({ 
      selectedEmployeeIds: selectedEmps,
      selectedRatings: selectedRats,
      selectedSources: selectedSrcs,
      showFilterModal: false 
    }, () => {
      this.saveFilterState();
      this.filterLeads();
    });
  }
})