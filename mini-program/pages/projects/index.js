
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
    
    leadIdFilter: '', // 仅显示特定客户的工地

    // 新建工地所需数据
    showAddModal: false,
    leads: [],
    leadIndex: -1,
    managers: [{ id: '', name: '无' }],
    managerIndex: 0,
    newProject: {
      managerId: '',
      startDate: ''
    },
    
    // 多选弹窗状态
    showMultiSelect: false,
    multiSelectField: '', 
    currentMultiList: []
  },
  onLoad(options) {
    if (options && options.leadId) {
      this.setData({ leadIdFilter: options.leadId });
    }
    if (options && options.action === 'create') {
      // 延迟一点等待组件和权限加载
      setTimeout(() => {
        this.createProject();
      }, 500);
    }
    // 恢复筛选状态
    const app = getApp();
    const userInfo = wx.getStorageSync('userInfo');
    const isAdmin = userInfo && userInfo.role === 'admin';

    if (app.globalData && app.globalData.projectFilters) {
      const f = app.globalData.projectFilters;
      this.setData({
        timeFilterIndex: f.timeFilterIndex !== undefined ? f.timeFilterIndex : 0,
        timeFilterLabel: f.timeFilterLabel || '全部时间',
        filterScope: f.filterScope || (isAdmin ? '全部工地' : '与我相关'),
        filterEmployees: f.filterEmployees || this.data.filterEmployees,
        selectedEmployeeIds: f.selectedEmployeeIds || [],
        filterStatuses: f.filterStatuses || this.data.filterStatuses,
        selectedStatuses: f.selectedStatuses || [],
        filterStartDateStart: f.filterStartDateStart || '',
        filterStartDateEnd: f.filterStartDateEnd || ''
      });
    } else {
      if (isAdmin) {
        this.setData({ filterScope: '全部工地' });
      }
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
      canCreate: userInfo.role === 'admin' || userInfo.role === 'manager',
      isAdmin: userInfo.role === 'admin',
      currentUserName: userInfo.name || ''
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
      const projectsData = res.data;
      
      // 3. 获取所有客户数据，用于补全工地缺少的电话和编号
      db.collection('leads').get().then(leadsRes => {
        wx.hideNavigationBarLoading();
        wx.stopPullDownRefresh();
        
        const leadsMap = {};
        leadsRes.data.forEach(l => leadsMap[l._id] = l);

        const now = new Date();
        now.setHours(0,0,0,0);

        const userInfo = wx.getStorageSync('userInfo');
        const myName = userInfo ? userInfo.name : '';
        const isAdmin = userInfo && userInfo.role === 'admin';
        
        const list = projectsData.sort((a, b) => {
          const timeA = a && a.createdAt ? String(a.createdAt) : '';
          const timeB = b && b.createdAt ? String(b.createdAt) : '';
          return timeB.localeCompare(timeA);
        }).map(p => {
          // 补全缺失的客户电话和编号
          if (!p.phone || !p.customerNo) {
            const lead = leadsMap[p.leadId];
            if (lead) {
              p.phone = p.phone || lead.phone;
              p.customerNo = p.customerNo || lead.customerNo || lead._id;
            }
          }

          const isRelated = isAdmin || p.manager === myName || p.sales === myName || p.designer === myName || p.creatorName === myName;
          
          // 项目一定来源于已签单客户，所以全员可见，不再打码
          p._isMasked = false;
          p._isRelated = isRelated;

        // 模拟数据填充，对齐网页端功能
        const nodesList = ["开工", "水电", "木工", "瓦工", "墙面", "定制", "软装", "交付"];
        const currentNode = p.currentNode || 1;
        
        // 计算预计完工时间
        let expectedEndDate = '-';
        let expectedEndDateObj = null;
        if (p.endDate) {
          expectedEndDate = p.endDate;
          expectedEndDateObj = new Date(p.endDate.replace(/-/g, '/'));
        } else if (p.startDate) {
          const sd = new Date(p.startDate.replace(/-/g, '/'));
          sd.setDate(sd.getDate() + 90);
          expectedEndDateObj = sd;
          expectedEndDate = `${sd.getFullYear()}-${String(sd.getMonth()+1).padStart(2,'0')}-${String(sd.getDate()).padStart(2,'0')}`;
        }
        
        let health = p.health || '正常';
        
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
        
        if (dynamicStatus === '已停工') {
          health = '停工';
        } else if (dynamicStatus !== '已竣工' && expectedEndDateObj) {
          expectedEndDateObj.setHours(23, 59, 59, 999);
          if (now.getTime() > expectedEndDateObj.getTime()) {
            health = '逾期';
          } else if (health === '严重延期' || health === '逾期') {
            health = '正常';
          }
        } else if (dynamicStatus === '已竣工') {
          health = '正常';
        }

        // 计算已耗天数 (开工后才算)
        
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
        console.error('获取客户数据失败', err);
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
        const myName = userInfo.name;
        filtered = filtered.filter(p => {
          return (p.manager && p.manager.includes(myName)) || (p.sales && p.sales.includes(myName)) || (p.designer && p.designer.includes(myName)) || p.creatorName === myName;
        });
      }
    }

    // 时间范围过滤 (右上角) - 只筛选已开工的工地
    if (this.data.timeFilterIndex > 0) {
      const now = new Date();
      const filterMs = {
        1: 7 * 24 * 3600 * 1000,
        2: 30 * 24 * 3600 * 1000,
        3: 365 * 24 * 3600 * 1000
      };
      const limitMs = filterMs[this.data.timeFilterIndex];

      filtered = filtered.filter(p => {
        if (!p.startDate) return false; // 没有开工时间的排除
        const startTime = new Date(p.startDate.replace(/-/g, '/')).getTime();
        const diff = now.getTime() - startTime;
        // 只保留已开工且在时间范围内的工地（diff >= 0 表示已开工）
        return diff >= 0 && diff <= limitMs;
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
        return selectedNames.some(name => (p.manager && p.manager.includes(name)) || (p.designer && p.designer.includes(name)));
      });
    }

    // 此时的 filtered 是经过时间、搜索、高级筛选的总数据，用来更新顶部看板
    this.updateDashboard(filtered);

    // 继续执行只影响列表的 tab 过滤
    if (this.data.activeTab !== '全部') {
      filtered = filtered.filter(p => p.status === this.data.activeTab);
    }

    // 按开工时间倒序排序（最近的在上面）
    filtered.sort((a, b) => {
      if (!a.startDate && !b.startDate) return 0;
      if (!a.startDate) return 1; // 没有开工时间的排后面
      if (!b.startDate) return -1;
      return new Date(b.startDate.replace(/-/g, '/')).getTime() - new Date(a.startDate.replace(/-/g, '/')).getTime();
    });

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
    const tabbar = this.getTabBar();
    if (tabbar) tabbar.setData({ showMask: true });
  },
  closeFilterModal() {
    this.setData({ showFilterModal: false });
    const tabbar = this.getTabBar();
    if (tabbar) tabbar.setData({ showMask: false });
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
  // 辅助函数：格式化日期为 YYYY-MM-DD
  formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  // 辅助函数：跳过周末计算结束日期
  calculateEndDate(startDateStr, durationDays) {
    if (!startDateStr || durationDays <= 0) return startDateStr;
    let current = new Date(startDateStr.replace(/-/g, '/'));
    let added = 0;
    while (added < durationDays - 1) {
      current.setDate(current.getDate() + 1);
      const day = current.getDay();
      if (day !== 0 && day !== 6) {
        added++;
      }
    }
    return this.formatDate(current);
  },

  // 辅助函数：获取下一个工作日
  getNextWorkingDay(date) {
    let next = new Date(date);
    next.setDate(next.getDate() + 1);
    while (next.getDay() === 0 || next.getDay() === 6) {
      next.setDate(next.getDate() + 1);
    }
    return next;
  },

  // 辅助函数：生成完整的甘特图排期数据
  generateGanttNodes(templateNodes, baseStartDateStr) {
    let currentStartStr = baseStartDateStr;
    
    return templateNodes.map((node, index) => {
      let nodeStartDate = currentStartStr;
      let nodeEndDate = currentStartStr;
      
      const subNodes = node.subNodes.map((sub, subIndex) => {
        const subStart = currentStartStr;
        const subEnd = this.calculateEndDate(subStart, Number(sub.duration) || 0);
        
        if ((Number(sub.duration) || 0) > 0) {
          currentStartStr = this.formatDate(this.getNextWorkingDay(new Date(subEnd.replace(/-/g, '/'))));
        }
        
        nodeEndDate = subEnd;
        
        const isFirstNode = index === 0 && subIndex === 0;
        
        return {
          name: sub.name,
          duration: sub.duration,
          status: "pending", // 稍后会在外部统一处理状态
          startDate: subStart,
          endDate: subEnd,
          records: []
        };
      });
      
      return {
        name: node.name,
        duration: node.duration,
        subNodes: subNodes,
        status: index === 0 ? 'current' : 'pending',
        startDate: subNodes.length > 0 ? subNodes[0].startDate : nodeStartDate,
        endDate: nodeEndDate,
        expanded: index === 0,
        records: [],
        delayRecords: []
      };
    });
  },

  loadSignedLeads() {
    const db = wx.cloud.database();
    db.collection('leads').where({
      status: '已签单'
    }).get().then(res => {
      const leads = res.data.map(l => ({
        ...l,
        pickerLabel: `${l.name} (${l.address || '无地址'})`
      }));
      let leadIndex = -1;
      if (this.data.leadIdFilter) {
        leadIndex = leads.findIndex(l => l._id === this.data.leadIdFilter);
      }
      this.setData({ leads, leadIndex });
    });
  },

  loadEmployees() {
    const db = wx.cloud.database();
    db.collection('users').get().then(res => {
      const managers = [];
      res.data.forEach(u => {
        if (u.role === 'manager') managers.push({ id: u._id, name: u.name });
      });
      this.setData({ managers });
    });
  },

  createProject() {
    this.loadSignedLeads();
    this.loadEmployees();
    this.setData({
      showAddModal: true,
      managerIndex: 0,
      newProject: { managerId: '', startDate: '' }
    });
    const tabbar = this.getTabBar();
    if (tabbar) tabbar.setData({ showMask: true });
  },

  closeAddModal() {
    this.setData({ showAddModal: false });
    const tabbar = this.getTabBar();
    if (tabbar) tabbar.setData({ showMask: false });
  },

  onLeadChange(e) {
    const idx = e.detail.value;
    const lead = this.data.leads[idx];
    this.setData({
      leadIndex: idx,
      'newProject.leadId': lead._id,
      'newProject.customer': lead.name,
      'newProject.customerNo': lead.customerNo || lead.id,
      'newProject.address': lead.address || '',
      'newProject.phone': lead.phone || '',
      'newProject.area': lead.area || '',
      'newProject.sales': lead.sales || '',
      'newProject.designer': lead.designer || '',
      'newProject.manager': lead.manager || ''
    });
  },

  openMultiSelect(e) {
    const field = e.currentTarget.dataset.field; // e.g. 'manager'
    const sourceList = this.data.managers || [];
    const currentVal = this.data.newProject[field] || '';
    const selectedSet = new Set(currentVal.split(',').map(s => s.trim()).filter(Boolean));

    const currentMultiList = sourceList.map(item => ({
      name: item.name,
      checked: selectedSet.has(item.name)
    }));

    this.setData({
      showMultiSelect: true,
      multiSelectField: field,
      currentMultiList
    });
  },

  closeMultiSelect() {
    this.setData({ showMultiSelect: false });
  },

  toggleMultiSelect(e) {
    const index = e.currentTarget.dataset.index;
    const list = this.data.currentMultiList;
    list[index].checked = !list[index].checked;
    this.setData({ currentMultiList: list });
  },

  confirmMultiSelect() {
    const field = this.data.multiSelectField;
    const selectedNames = this.data.currentMultiList
      .filter(item => item.checked)
      .map(item => item.name)
      .join(', ');
      
    this.setData({
      [`newProject.${field}`]: selectedNames,
      showMultiSelect: false
    });
  },

  onStartDateChange(e) {
    this.setData({ 'newProject.startDate': e.detail.value });
  },

  saveProject() {
    const d = this.data.newProject;
    if (this.data.leadIndex === -1) return wx.showToast({ title: '请选择关联客户', icon: 'none' });
    if (this.data.managerIndex === 0) return wx.showToast({ title: '请选择项目经理', icon: 'none' });
    if (!d.startDate) return wx.showToast({ title: '请选择开工时间', icon: 'none' });
    
    wx.showLoading({ title: '保存中' });
    
    // 自动计算状态逻辑
    let status = '未开工';
    const now = new Date();
    const startDate = new Date(d.startDate.replace(/-/g, '/'));
    now.setHours(0,0,0,0);
    startDate.setHours(0,0,0,0);

    if (now.getTime() >= startDate.getTime()) {
      status = '施工中';
    }
    
    const health = '正常';
    const currentNode = 1;

    // 自动生成8大节点的排期模板
    const templateNodes = [
      { name: "开工", duration: 10, subNodes: [{name: "开工仪式", duration: 1}, {name: "现场交底", duration: 1}, {name: "成品保护", duration: 1}, {name: "墙体拆除", duration: 2}, {name: "垃圾清运", duration: 1}, {name: "设备定位(空调/新风)", duration: 1}, {name: "砌筑新建", duration: 2}, {name: "墙体批荡", duration: 1}] },
      { name: "水电", duration: 9, subNodes: [{name: "水电交底", duration: 1}, {name: "开槽布管", duration: 3}, {name: "排污下水", duration: 1}, {name: "线管敷设", duration: 2}, {name: "打压测试", duration: 1}, {name: "水电验收", duration: 1}] },
      { name: "木工", duration: 10, subNodes: [{name: "木工交底", duration: 1}, {name: "吊顶龙骨", duration: 3}, {name: "石膏板封样", duration: 2}, {name: "背景墙打底", duration: 2}, {name: "隔墙制作", duration: 1}, {name: "木工验收", duration: 1}] },
      { name: "瓦工", duration: 16, subNodes: [{name: "瓦工交底", duration: 1}, {name: "下水管包管", duration: 1}, {name: "防水涂刷", duration: 2}, {name: "闭水试验", duration: 2}, {name: "地面找平", duration: 2}, {name: "瓷砖铺贴", duration: 6}, {name: "瓷砖美缝", duration: 1}, {name: "瓦工验收", duration: 1}] },
      { name: "墙面", duration: 14, subNodes: [{name: "墙面交底", duration: 1}, {name: "基层找平", duration: 2}, {name: "挂网防裂", duration: 1}, {name: "腻子批刮", duration: 4}, {name: "乳胶漆涂刷", duration: 5}, {name: "墙面验收", duration: 1}] },
      { name: "定制", duration: 12, subNodes: [{name: "复尺测量", duration: 1}, {name: "厨卫吊顶", duration: 1}, {name: "木地板铺装", duration: 2}, {name: "木门安装", duration: 1}, {name: "柜体安装", duration: 4}, {name: "台面安装", duration: 1}, {name: "五金挂件", duration: 2}] },
      { name: "软装", duration: 6, subNodes: [{name: "窗帘壁纸", duration: 1}, {name: "灯具安装", duration: 1}, {name: "开关面板", duration: 1}, {name: "卫浴安装", duration: 1}, {name: "大家电进场", duration: 1}, {name: "家具进场", duration: 1}] },
      { name: "交付", duration: 4, subNodes: [{name: "拓荒保洁", duration: 1}, {name: "室内空气治理", duration: 1}, {name: "竣工验收", duration: 1}, {name: "钥匙移交/合影留念", duration: 1}] }
    ];

    let projectNodes = this.generateGanttNodes(templateNodes, d.startDate);
    if (status === '施工中') {
      projectNodes[0].status = 'current';
      projectNodes[0].actualStartDate = d.startDate;
      if (projectNodes[0].subNodes && projectNodes[0].subNodes.length > 0) {
        projectNodes[0].subNodes[0].status = 'current';
        projectNodes[0].subNodes[0].actualStartDate = d.startDate;
      }
    } else {
      projectNodes[0].status = 'pending';
    }

    const db = wx.cloud.database();
    const managerName = d.manager || '';
    const selectedLead = this.data.leads[this.data.leadIndex];

    db.collection('projects').where({ leadId: selectedLead._id }).limit(1).get().then(res => {
      if (res.data && res.data.length > 0) {
        wx.hideLoading();
        wx.showToast({ title: '该客户已关联其他工地', icon: 'none' });
        return;
      }

      const expectedEndDate = projectNodes[projectNodes.length - 1].endDate;

      const projectData = {
        leadId: selectedLead._id,
        customer: selectedLead.name,
        phone: selectedLead.phone || '',
        customerNo: selectedLead.customerNo || selectedLead._id,
        address: selectedLead.address || '',
        manager: managerName,
        designer: selectedLead.designer || '',
        sales: selectedLead.sales || '',
        signDate: selectedLead.signDate || '',
        signer: selectedLead.signer || '',
        startDate: d.startDate,
        expectedEndDate: expectedEndDate,
        status: status,
        currentNode: currentNode,
        health: health,
        nodesData: projectNodes,
        createdAt: db.serverDate()
      };

      db.collection('projects').add({
        data: projectData
      }).then(() => {
        db.collection('leads').doc(selectedLead._id).update({
          data: { manager: managerName }
        }).catch(err => console.error('更新客户项目经理失败', err));

        this.addSystemFollowUpToLead(selectedLead._id, `工地创建，开工日期：${projectData.startDate}，预计完工：${projectData.expectedEndDate}，项目经理：${projectData.manager || '未分配'}`);
        
        wx.hideLoading();
        wx.showToast({ title: '创建成功', icon: 'success' });
        this.closeAddModal();
        this.fetchData();
      }).catch(() => {
        wx.hideLoading();
        wx.showToast({ title: '创建失败', icon: 'none' });
      });
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '查询关联工地失败', icon: 'none' });
    });
  },

  addSystemFollowUpToLead(leadId, content) {
    const db = wx.cloud.database();
    const userInfo = wx.getStorageSync('userInfo') || {};
    const operatorName = userInfo.name || '系统';
    const now = new Date();
    const nowStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    const followUp = {
      leadId: leadId,
      content: content,
      method: '系统记录',
      type: 'system',
      createdBy: operatorName,
      createdAt: db.serverDate(),
      displayTime: nowStr,
      timestamp: db.serverDate()
    };
    db.collection('followUps').add({ data: followUp }).catch(() => {});

    db.collection('leads').doc(leadId).update({
      data: { lastFollowUp: nowStr, lastFollowUpAt: Date.now() }
    }).catch(() => {});

    // 给相关人发送未读通知，确保产生红点
    db.collection('leads').doc(leadId).get().then(res => {
      const lead = res.data;
      const notifyUsers = new Set();
      if (lead.sales) notifyUsers.add(lead.sales);
      if (lead.designer) notifyUsers.add(lead.designer);
      if (lead.manager) notifyUsers.add(lead.manager);
      if (lead.creatorName) notifyUsers.add(lead.creatorName);

      db.collection('users').where({ role: 'admin' }).get().then(adminRes => {
        adminRes.data.forEach(u => {
          notifyUsers.add(u.name);
        });

        notifyUsers.forEach(u => {
          if (!u) return;
          db.collection('notifications').add({
            data: {
              type: 'lead',
              title: '跟进记录已更新',
              content: `${operatorName} 添加了项目跟进记录：${content.substring(0, 30)}...`,
              senderName: operatorName,
              senderRole: userInfo.role || 'default',
              targetUser: u,
              isRead: false,
              createTime: db.serverDate(),
              link: `/pages/leadDetail/index?id=${leadId}`
            }
          }).catch(() => {});
        });
      });
    }).catch(() => {});
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (id) {
      wx.navigateTo({ url: `/pages/projectDetail/index?id=${id}` });
    }
  },

  deleteProject(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    
    // 获取当前用户信息
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo) {
      wx.showToast({ title: '无删除权限', icon: 'none' });
      return;
    }

    // 查找该项目
    const project = this.data.projects.find(p => p._id === id);
    if (!project) return;

    // 权限校验：仅允许管理员或该项目的项目经理删除
    const isAdmin = userInfo.role === 'admin';
    const userName = userInfo.name;
    const isManager = userName && project.manager === userName;

    if (!isAdmin && !isManager) {
      wx.showToast({ title: '仅限项目经理或管理员删除', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '警告',
      content: '确定要永久删除该工地记录吗？此操作不可恢复！',
      confirmColor: '#e11d48',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' });
          const db = wx.cloud.database();
          db.collection('projects').doc(id).remove().then(() => {
            wx.hideLoading();
            wx.showToast({ title: '删除成功', icon: 'success' });
            this.fetchData(); // 重新拉取数据
          }).catch((err) => {
            wx.hideLoading();
            console.error('删除工地失败', err);
            wx.showToast({ title: '删除失败', icon: 'error' });
          });
        }
      }
    });
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
