// 移除 mock 数据引入
// const leadsData = require('../../mock/leads.js');

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
    filterEmployees: [],
    selectedEmployeeIds: [],

    filterScope: '全部线索',

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
    
    const d = new Date();
    this.setData({ 
      today: `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`
    });

    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
    
    // 检测是否需要播放签单动效
    const app = getApp();
    if (app.globalData && app.globalData.triggerSignAnimation) {
      this.setData({ playSignAnim: true });
      app.globalData.triggerSignAnimation = false;
      
      // 保存定时器 ID 以便在页面隐藏或卸载时清理
      this._signAnimTimer = setTimeout(() => {
        this.setData({ playSignAnim: false });
        this._signAnimTimer = null;
      }, 2500);
    }
    
    // 每次显示页面都拉取最新数据
    this.fetchData();
  },

  onHide() {
    if (this._signAnimTimer) {
      clearTimeout(this._signAnimTimer);
      this._signAnimTimer = null;
    }
  },

  onUnload() {
    if (this._signAnimTimer) {
      clearTimeout(this._signAnimTimer);
      this._signAnimTimer = null;
    }
  },

  // ===================== 添加线索弹窗逻辑 =====================
  showAddLeadModal() {
    this.setData({
      showAddModal: true,
      newLead: {
        name: '',
        phone: '',
        address: '',
        area: '',
        requirement: '旧改',
        rating: 'C',
        source: '自然进店',
        notes: ''
      }
    });
  },

  closeAddModal() {
    this.setData({ showAddModal: false });
  },

  onNewLeadInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`newLead.${field}`]: e.detail.value
    });
  },

  onNewLeadPickerChange(e) {
    const field = e.currentTarget.dataset.field;
    let val = '';
    if (field === 'rating') {
      val = ['A', 'B', 'C', 'D'][e.detail.value];
    } else if (field === 'source') {
      val = ['自然进店', '老介新', '抖音', '小红书', '大众点评', '自有关系', '其他'][e.detail.value];
    } else if (field === 'requirement') {
      val = ['旧改', '毛坯'][e.detail.value];
    }
    this.setData({
      [`newLead.${field}`]: val
    });
  },

  saveNewLead() {
    const { name, phone, address, area, requirement, rating, source, notes } = this.data.newLead;
    if (!(name || '').trim() || !(phone || '').trim()) {
      return wx.showToast({ title: '请填写姓名和手机号', icon: 'none' });
    }

    wx.showLoading({ title: '保存中' });
    const db = wx.cloud.database();
    const userInfo = wx.getStorageSync('userInfo');
    
    const now = new Date();
    const nowStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const operatorName = userInfo.name || '未知人员';

    db.collection('leads').add({
      data: {
        name: (name || '').trim(),
        phone: (phone || '').trim(),
        address: (address || '').trim(),
        area: (area || '').trim(),
        requirement,
        rating,
        source,
        notes: (notes || '').trim(),
        status: '待跟进',
        sales: userInfo.role === 'sales' ? userInfo.name : '',
        designer: userInfo.role === 'designer' ? userInfo.name : '',
        lastFollowUp: nowStr,
        createdAt: now.toISOString(),
        createdBy: userInfo.id || userInfo._id,
        creatorName: operatorName
      }
    }).then((res) => {
      // --- 触发通知逻辑：新建线索 ---
      const newLeadId = res._id;
      
      // 抄送给管理员
      if (userInfo.role !== 'admin') {
        db.collection('notifications').add({
          data: {
            type: 'lead',
            title: '新增客户线索',
            content: `${operatorName} 录入了新客户【${(name || '').trim()}】。`,
            targetUser: 'admin',
            isRead: false,
            createTime: db.serverDate(),
            link: `/pages/leadDetail/index?id=${newLeadId}`
          }
        });
      }

      wx.hideLoading();
      wx.showToast({ title: '添加成功', icon: 'success' });
      this.closeAddModal();
      this.fetchData(); // 重新拉取云端数据
    }).catch(err => {
      wx.hideLoading();
      console.error('添加线索失败', err);
      wx.showToast({ title: '添加失败', icon: 'none' });
    });
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

    // 2. 获取所有线索
    db.collection('leads').get().then(res => {
      wx.hideNavigationBarLoading();
      wx.stopPullDownRefresh();
      
      // 按照创建时间倒序
      const list = res.data.sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dbTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dbTime - da;
      });
      
      this.setData({ allLeads: list }, () => {
        this.filterLeads();
      });
    }).catch(err => {
      wx.hideNavigationBarLoading();
      wx.stopPullDownRefresh();
      console.error('获取线索失败', err);
      wx.showToast({ title: '获取数据失败', icon: 'none' });
    });
  },

  updateGroupedEmployees() {
    const depts = ['管理部', '项目部', '销售部', '设计部', '财务部', '其他'];
    const grouped = [];
    const oldGrouped = this.data.groupedEmployees || [];
    depts.forEach(dept => {
      const emps = this.data.filterEmployees.filter(e => e.dept === dept);
      if (emps.length > 0) {
        const oldDept = oldGrouped.find(g => g.dept === dept);
        grouped.push({ dept, employees: emps, expanded: oldDept ? oldDept.expanded : false });
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
    const data = filteredList || this.data.allLeads;
    this.setData({
      totalCount: data.length,
      aRatingCount: data.filter(l => l.rating === 'A').length,
      signedCount: data.filter(l => l.status === '已签单').length
    });
  },

  filterLeads() {
    let filtered = this.data.allLeads;
    
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
      
      filtered = filtered.filter(l => 
        selectedNames.includes(l.sales) || selectedNames.includes(l.designer)
      );
    }

    // 与我相关过滤
    if (this.data.filterScope === '与我相关') {
      const userInfo = wx.getStorageSync('userInfo');
      if (userInfo) {
        filtered = filtered.filter(l => l.sales === userInfo.name || l.designer === userInfo.name);
      }
    }

    // 此时的 filtered 是经过时间、搜索、高级筛选的总数据，用来更新顶部看板
    this.updateDashboard(filtered);

    // 继续执行只影响列表的 tab 过滤
    if (this.data.activeTab !== '全部') {
      if (this.data.activeTab === 'A级') {
        filtered = filtered.filter(l => l.rating === 'A');
      } else if (this.data.activeTab === '已签单') {
        filtered = filtered.filter(l => l.status === '已签单');
      }
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
        filterScope: f.filterScope || '全部线索',
        selectedEmployeeIds: f.selectedEmployeeIds || [],
        filterRatings: f.filterRatings || this.data.filterRatings,
        selectedRatings: f.selectedRatings || [],
        filterSources: f.filterSources || this.data.filterSources,
        selectedSources: f.selectedSources || []
      });
    }

    // 首次进入通过 onShow 中的 fetchData 拉取数据，因此这里不需要设置 allLeads 了
  },

  saveFilterState() {
    const app = getApp();
    if (!app.globalData) app.globalData = {};
    app.globalData.leadFilters = {
      timeFilterIndex: this.data.timeFilterIndex,
      timeFilterLabel: this.data.timeFilterLabel,
      filterScope: this.data.filterScope,
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
      if (l._id === leadId) {
        return { ...l, status: newStatus };
      }
      return l;
    });
    
    this.setData({ allLeads: all }, () => {
      this.updateDashboard();
      this.filterLeads();
      
      const db = wx.cloud.database();
      db.collection('leads').doc(leadId).update({
        data: { status: newStatus }
      }).then(() => {
        wx.showToast({ title: '状态已更新', icon: 'success' });
      });
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

  openFilterModal() {
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

  toggleRating(e) {
    const name = e.currentTarget.dataset.name;
    const rats = this.data.filterRatings.map(r => {
      if (r.name === name) r.selected = !r.selected;
      return r;
    });
    this.setData({ filterRatings: rats });
  },

  toggleSource(e) {
    const name = e.currentTarget.dataset.name;
    const srcs = this.data.filterSources.map(s => {
      if (s.name === name) s.selected = !s.selected;
      return s;
    });
    this.setData({ filterSources: srcs });
  },

  switchScope(e) {
    const scope = e.currentTarget.dataset.scope;
    this.setData({ filterScope: scope }, () => {
      this.saveFilterState();
      this.filterLeads();
    });
  },

  resetFilter() {
    const emps = this.data.filterEmployees.map(e => ({...e, selected: false}));
    const src = this.data.filterSources.map(s => ({...s, selected: false}));
    const rts = this.data.filterRatings.map(r => ({...r, selected: false}));
    
    this.setData({
      filterEmployees: emps,
      filterSources: src,
      filterRatings: rts,
      filterScope: '全部线索',
      selectedEmployeeIds: [],
      selectedSources: [],
      selectedRatings: []
    }, () => {
      this.updateGroupedEmployees();
      this.saveFilterState();
      this.filterLeads();
      this.closeFilterModal();
    });
  },

  applyFilter() {
    const selectedEmpIds = this.data.filterEmployees.filter(e => e.selected).map(e => e.id);
    const selectedRats = this.data.filterRatings.filter(r => r.selected).map(r => r.name);
    const selectedSrcs = this.data.filterSources.filter(s => s.selected).map(s => s.name);
    
    this.setData({
      selectedEmployeeIds: selectedEmpIds,
      selectedRatings: selectedRats,
      selectedSources: selectedSrcs
    }, () => {
      this.saveFilterState();
      this.filterLeads();
      this.closeFilterModal();
    });
  }
})