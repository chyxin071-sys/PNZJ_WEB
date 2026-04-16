
import { maskName, maskAddress } from '../../utils/format.js';

// 移除 mock 数据
// const projectsData = require('../../mock/projects.js');

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

    filterScope: '与我相关',
    
    showFilterModal: false,
    filterEmployees: [],
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
    filterStartDateEnd: '',
    
    leadIdFilter: '' // 仅显示特定客户的工地
  },
  onLoad(options) {
    if (options && options.leadId) {
      this.setData({ leadIdFilter: options.leadId });
    }
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
    
    // 权限控制：仅管理员和项目经理可新建
    this.setData({
      canCreate: userInfo.role === 'admin' || userInfo.role === 'manager'
    });
    
    const d = new Date();
    this.setData({ 
      today: `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`
    });

    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
      this.getTabBar().fetchGlobalUnread();
    }
    
    this.fetchData();
  },

  fetchData() {
    wx.showNavigationBarLoading();
    const db = wx.cloud.database();
    
    // 1. 获取员工列表用于高级筛选
    db.collection('users').get().then(userRes => {
      const roleMap = {
        admin: '管理部',
        manager: '项目部',
        sales: '销售部',
        designer: '设计部',
        finance: '财务部'
      };
      const emps = userRes.data.map(u => {
        const dept = roleMap[u.role] || '其他';
        return { id: u._id, name: u.name, dept, selected: false };
      });
      if (this.data.selectedEmployeeIds && this.data.selectedEmployeeIds.length > 0) {
        emps.forEach(e => {
          if (this.data.selectedEmployeeIds.includes(e.id)) e.selected = true;
        });
      }
      this.setData({ filterEmployees: emps }, () => {
        this.updateGroupedEmployees();
      });
    });

    // 2. 获取所有工地
    db.collection('projects').get().then(res => {
      wx.hideNavigationBarLoading();
      wx.stopPullDownRefresh();
      
      const now = new Date();
      now.setHours(0,0,0,0);

      const userInfo = wx.getStorageSync('userInfo');
      const myName = userInfo ? userInfo.name : '';
      const isAdmin = userInfo && userInfo.role === 'admin';
      
      const list = res.data.sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dbTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dbTime - da;
      }).map(p => {
        const isRelated = isAdmin || p.manager === myName || p.sales === myName || p.designer === myName || p.creatorName === myName;
        
        if (!isRelated) {
          p._isMasked = true;
          if (p.customer) p.customer = maskName(p.customer);
          if (p.address) p.address = maskAddress(p.address);
        } else {
          p._isMasked = false;
        }

        // 模拟数据填充，对齐网页端功能
        const nodesList = ["开工", "水电", "木工", "瓦工", "墙面", "定制", "软装", "交付"];
        const currentNode = p.currentNode || 1;
        
        let health = p.health || '正常';
        if (p.status === '已停工') health = '严重延期';
        
        // 动态计算当前状态
        let dynamicStatus = p.status;
        if (p.startDate && p.status !== '已竣工' && p.status !== '已停工') {
           const startDate = new Date(p.startDate.replace(/-/g, '/'));
           startDate.setHours(0,0,0,0);
           
           if (now.getTime() < startDate.getTime()) {
             dynamicStatus = '未开工';
           } else if (now.getTime() >= startDate.getTime()) {
             dynamicStatus = '施工中';
           }
        }
        
        // 计算已耗天数 (开工后才算)
        let daysElapsed = 0;
        if (dynamicStatus !== '未开工' && p.startDate) {
          daysElapsed = Math.ceil((new Date().getTime() - new Date(p.startDate.replace(/-/g, '/')).getTime()) / (1000 * 60 * 60 * 24));
        }
        
        // 计算预计完工时间 (默认开工后 90 天)
        let expectedEndDate = '-';
        if (p.startDate) {
          const sd = new Date(p.startDate.replace(/-/g, '/'));
          sd.setDate(sd.getDate() + 90);
          expectedEndDate = `${sd.getFullYear()}-${String(sd.getMonth()+1).padStart(2,'0')}-${String(sd.getDate()).padStart(2,'0')}`;
        }
        
        return {
          ...p,
          status: dynamicStatus,
          currentNode,
          nodeName: nodesList[currentNode - 1],
          nodesList,
          health,
          daysElapsed: daysElapsed > 0 ? daysElapsed : 0,
          expectedEndDate
        };
      });
      
      this.setData({ allProjects: list }, () => {
        this.filterProjects();
      });
    }).catch(err => {
      wx.hideNavigationBarLoading();
      wx.stopPullDownRefresh();
      console.error('获取工地失败', err);
      wx.showToast({ title: '获取数据失败', icon: 'none' });
    });
  },

  updateGroupedEmployees() {
    const depts = ['管理部', '项目部', '销售部', '设计部', '财务部', '其他'];
    const grouped = [];
    
    // Preserve expanded state
    const currentGroups = this.data.groupedEmployees || [];
    const expandedMap = {};
    currentGroups.forEach(g => {
      expandedMap[g.dept] = g.expanded;
    });

    depts.forEach(dept => {
      const emps = this.data.filterEmployees.filter(e => e.dept === dept);
      if (emps.length > 0) {
        grouped.push({
          dept,
          employees: emps,
          expanded: expandedMap[dept] !== undefined ? expandedMap[dept] : false
        });
      }
    });
    this.setData({ groupedEmployees: grouped });
  },

  toggleDept(e) {
    const dept = e.currentTarget.dataset.dept;
    const grouped = this.data.groupedEmployees.map(g => {
      if (g.dept === dept) g.expanded = !g.expanded;
      return g;
    });
    this.setData({ groupedEmployees: grouped });
  },

  onPullDownRefresh() {
    this.fetchData();
  },
  updateDashboard(filteredList) {
    const data = filteredList || this.data.allProjects;
    this.setData({
      totalCount: data.length,
      activeCount: data.filter(p => p.status === '施工中').length,
      completedCount: data.filter(p => p.status === '已竣工').length
    });
  },
  filterProjects() {
    let filtered = this.data.allProjects;
    
    if (this.data.leadIdFilter) {
      filtered = filtered.filter(p => p.leadId === this.data.leadIdFilter);
    }

    if (this.data.searchQuery) {
      const q = this.data.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(p => {
        const cusMatch = p.customer ? String(p.customer).toLowerCase().includes(q) : false;
        const mgrMatch = p.manager ? String(p.manager).toLowerCase().includes(q) : false;
        const addMatch = p.address ? String(p.address).toLowerCase().includes(q) : false;
        const customerNoMatch = p.customerNo ? String(p.customerNo).toLowerCase().includes(q) : false;
        return cusMatch || mgrMatch || addMatch || customerNoMatch;
      });
    }

    // 范围过滤 (与我相关 vs 全部工地)
    if (this.data.filterScope === '与我相关') {
      const userInfo = wx.getStorageSync('userInfo');
      if (userInfo && userInfo.name) {
        filtered = filtered.filter(p => {
          return p.manager === userInfo.name || p.sales === userInfo.name || p.designer === userInfo.name || p.creatorName === userInfo.name;
        });
      }
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

    // 此时的 filtered 是经过时间、搜索、高级筛选的总数据，用来更新顶部看板
    this.updateDashboard(filtered);

    // 继续执行只影响列表的 tab 过滤
    if (this.data.activeTab !== '全部') {
      filtered = filtered.filter(p => p.status === this.data.activeTab);
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
  toggleEmployee(e) {
    const id = e.currentTarget.dataset.id;
    const emps = this.data.filterEmployees.map(emp => {
      if (emp.id === id) emp.selected = !emp.selected;
      return emp;
    });
    this.setData({ filterEmployees: emps }, () => {
      this.updateGroupedEmployees();
    });
  },
  toggleStatus(e) {
    const name = e.currentTarget.dataset.name;
    const stats = this.data.filterStatuses.map(s => {
      if (s.name === name) s.selected = !s.selected;
      return s;
    });
    this.setData({ filterStatuses: stats });
  },
  onStartDateStartChange(e) {
    this.setData({ filterStartDateStart: e.detail.value });
  },
  onStartDateEndChange(e) {
    this.setData({ filterStartDateEnd: e.detail.value });
  },
  switchScope(e) {
    const scope = e.currentTarget.dataset.scope;
    this.setData({ filterScope: scope }, () => {
      this.saveFilterState();
      this.filterProjects();
    });
  },

  resetFilter() {
    const emps = this.data.filterEmployees.map(e => ({...e, selected: false}));
    const stats = this.data.filterStatuses.map(s => ({...s, selected: false}));
    
    this.setData({
      filterScope: '与我相关',
      filterEmployees: emps,
      filterStatuses: stats,
      selectedEmployeeIds: [],
      selectedStatuses: [],
      filterStartDateStart: '',
      filterStartDateEnd: ''
    }, () => {
      this.updateGroupedEmployees();
      this.saveFilterState();
      this.filterProjects();
      this.closeFilterModal();
    });
  },
  applyFilter() {
    const selectedEmpIds = this.data.filterEmployees.filter(e => e.selected).map(e => e.id);
    const selectedStats = this.data.filterStatuses.filter(s => s.selected).map(s => s.name);
    
    this.setData({
      selectedEmployeeIds: selectedEmpIds,
      selectedStatuses: selectedStats
    }, () => {
      this.saveFilterState();
      this.filterProjects();
      this.closeFilterModal();
    });
  },
  // 阻止冒泡
  preventTap() {
  },

  // ===================== 新建工地逻辑 =====================
  createProject() {
    wx.showToast({ title: '正在开发中...', icon: 'none' });
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (id) {
      wx.navigateTo({ url: `/pages/projectDetail/index?id=${id}` });
    }
  },

  showComingSoon(e) {
    const type = e.currentTarget.dataset.type;
    if (type === '报价') {
      wx.navigateTo({ url: '/pages/quotes/index' });
      return;
    }
    wx.showToast({ title: `${type}模块正在紧锣密鼓开发中...`, icon: 'none' });
  }
});
