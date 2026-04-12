
const projectsData = require('../../mock/projects.js');

Page({
  data: {
    projects: [],
    allProjects: [],
    today: '',
    totalCount: 0,
    activeCount: 0,
    completedCount: 0,
    activeTab: '全部',
    searchQuery: '',
    timeFilterOptions: ['全部时间', '最近一周', '最近一月', '最近一年'],
    timeFilterIndex: 0, // 默认全部
    timeFilterLabel: '全部时间',

    showFilterModal: false,
    filterEmployees: [
      { id: 1, name: '销售A', selected: false },
      { id: 2, name: '设计师B', selected: false },
      { id: 3, name: '项目经理C', selected: false }
    ],
    selectedEmployeeIds: [],

    filterStatuses: [
      { name: '未开工', selected: false },
      { name: '施工中', selected: false },
      { name: '已竣工', selected: false },
      { name: '已停工', selected: false }
    ],
    selectedStatuses: [],

    // 自定义开工时间范围
    filterStartDateStart: '',
    filterStartDateEnd: ''
  },
  onLoad() {
    // 恢复筛选状态
    const app = getApp();
    if (app.globalData && app.globalData.projectFilters) {
      const f = app.globalData.projectFilters;
      this.setData({
        timeFilterIndex: f.timeFilterIndex !== undefined ? f.timeFilterIndex : 0,
        timeFilterLabel: f.timeFilterLabel || '全部时间',
        filterEmployees: f.filterEmployees || this.data.filterEmployees,
        selectedEmployeeIds: f.selectedEmployeeIds || [],
        filterStatuses: f.filterStatuses || this.data.filterStatuses,
        selectedStatuses: f.selectedStatuses || [],
        filterStartDateStart: f.filterStartDateStart || '',
        filterStartDateEnd: f.filterStartDateEnd || ''
      });
    }
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
      this.getTabBar().setData({ selected: 2 });
    }
  },
  initData() {
    const d = new Date();
    this.setData({ 
      today: `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`,
      allProjects: projectsData
    });
    this.updateDashboard();
    this.filterProjects();
  },
  updateDashboard() {
    const data = this.data.allProjects;
    this.setData({
      totalCount: data.length,
      activeCount: data.filter(p => p.status === '施工中').length,
      completedCount: data.filter(p => p.status === '已竣工').length
    });
  },
  filterProjects() {
    let filtered = this.data.allProjects;
    
    if (this.data.activeTab !== '全部') {
      filtered = filtered.filter(p => p.status === this.data.activeTab);
    }
    
    if (this.data.searchQuery) {
      const q = this.data.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(p => {
        const cusMatch = p.customer ? String(p.customer).toLowerCase().includes(q) : false;
        const mgrMatch = p.manager ? String(p.manager).toLowerCase().includes(q) : false;
        const addMatch = p.address ? String(p.address).toLowerCase().includes(q) : false;
        return cusMatch || mgrMatch || addMatch;
      });
    }

    // 时间范围过滤 (右上角)
    if (this.data.timeFilterIndex > 0) {
      const now = new Date();
      const filterMs = {
        1: 7 * 24 * 3600 * 1000,
        2: 30 * 24 * 3600 * 1000,
        3: 365 * 24 * 3600 * 1000
      };
      const limitMs = filterMs[this.data.timeFilterIndex];

      filtered = filtered.filter(p => {
        if (!p.startDate) return true;
        const diff = now.getTime() - new Date(p.startDate.replace(/-/g, '/')).getTime();
        return Math.abs(diff) <= limitMs;
      });
    }

    // 状态高级筛选过滤
    if (this.data.selectedStatuses && this.data.selectedStatuses.length > 0) {
      filtered = filtered.filter(p => this.data.selectedStatuses.includes(p.status));
    }

    // 开工时间高级筛选过滤
    if (this.data.filterStartDateStart || this.data.filterStartDateEnd) {
      filtered = filtered.filter(p => {
        if (!p.startDate) return false;
        const projectDate = new Date(p.startDate.replace(/-/g, '/')).getTime();
        let valid = true;
        if (this.data.filterStartDateStart) {
          const startDate = new Date(this.data.filterStartDateStart.replace(/-/g, '/')).getTime();
          if (projectDate < startDate) valid = false;
        }
        if (this.data.filterStartDateEnd) {
          // 包含结束日期当天
          const endDateObj = new Date(this.data.filterStartDateEnd.replace(/-/g, '/'));
          endDateObj.setHours(23, 59, 59, 999);
          if (projectDate > endDateObj.getTime()) valid = false;
        }
        return valid;
      });
    }

    // 人员高级筛选过滤
    if (this.data.selectedEmployeeIds && this.data.selectedEmployeeIds.length > 0) {
      const selectedNames = this.data.filterEmployees
        .filter(e => e.selected)
        .map(e => e.name);
      
      filtered = filtered.filter(p => {
        return selectedNames.includes(p.manager) || selectedNames.includes(p.designer);
      });
    }

    this.setData({ projects: filtered });
  },
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (this.data.activeTab === tab) return;
    this.setData({ activeTab: tab }, () => {
      this.filterProjects();
    });
  },
  saveFilterState() {
    const app = getApp();
    if (!app.globalData) app.globalData = {};
    app.globalData.projectFilters = {
      timeFilterIndex: this.data.timeFilterIndex,
      timeFilterLabel: this.data.timeFilterLabel,
      filterEmployees: this.data.filterEmployees,
      selectedEmployeeIds: this.data.selectedEmployeeIds,
      filterStatuses: this.data.filterStatuses,
      selectedStatuses: this.data.selectedStatuses,
      filterStartDateStart: this.data.filterStartDateStart,
      filterStartDateEnd: this.data.filterStartDateEnd
    };
  },
  onSearch(e) {
    this.setData({ searchQuery: e.detail.value }, () => {
      this.filterProjects();
    });
  },
  onTimeFilterChange(e) {
    const idx = parseInt(e.detail.value);
    this.setData({
      timeFilterIndex: idx,
      timeFilterLabel: this.data.timeFilterOptions[idx]
    }, () => {
      this.saveFilterState();
      this.filterProjects();
    });
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
  toggleFilterStatus(e) {
    const name = e.currentTarget.dataset.name;
    const statuses = this.data.filterStatuses.map(s => {
      if (s.name === name) {
        return { ...s, selected: !s.selected };
      }
      return s;
    });
    this.setData({ filterStatuses: statuses });
  },
  onStartDateStartChange(e) {
    this.setData({ filterStartDateStart: e.detail.value });
  },
  onStartDateEndChange(e) {
    this.setData({ filterStartDateEnd: e.detail.value });
  },
  applyFilter() {
    const selectedEmps = this.data.filterEmployees.filter(e => e.selected).map(e => e.id);
    const selectedStats = this.data.filterStatuses.filter(s => s.selected).map(s => s.name);
    
    this.setData({ 
      selectedEmployeeIds: selectedEmps,
      selectedStatuses: selectedStats,
      showFilterModal: false 
    }, () => {
      this.saveFilterState();
      this.filterProjects();
    });
  },
  createProject() {
    wx.showToast({ title: '新建工地开发中', icon: 'none' });
  },
  goToDetail(e) {
    wx.showToast({ title: '工地详情开发中', icon: 'none' });
  }
})
