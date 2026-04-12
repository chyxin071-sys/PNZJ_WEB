const todosData = require('../../mock/todos.js');

Page({
  data: {
    todos: [],
    allTodos: [],
    activeTab: 'pending',
    pendingCount: 0,
    completedCount: 0,
    today: '',
    searchQuery: '',
    timeFilterOptions: ['全部时间', '最近一周', '最近一月', '最近一年'],
    timeFilterIndex: 1, // 默认最近一周
    timeFilterLabel: '最近一周',

    showFilterModal: false,
    
    // 高级筛选状态
    filterScope: 'related', // 'related' | 'all'
    filterPriority: 'all',  // 'all' | 'high' | 'medium' | 'low'
    
    filterEmployees: [
      { id: 1, name: '销售A', selected: false },
      { id: 2, name: '设计师B', selected: false },
      { id: 3, name: '项目经理C', selected: false }
    ],
    selectedEmployeeIds: [],
    isAdmin: false
  },
  onShow() {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo) {
      wx.reLaunch({
        url: '/pages/login/index'
      });
    }
    // 每次显示时重新过滤，以防全局状态被其他页面改变（如果有）
    this.filterTodos();
  },
  onLoad() {
    // 恢复筛选状态
    const app = getApp();
    if (app.globalData && app.globalData.todoFilters) {
      const f = app.globalData.todoFilters;
      this.setData({
        timeFilterIndex: f.timeFilterIndex,
        timeFilterLabel: f.timeFilterLabel,
        filterScope: f.filterScope || 'related',
        filterPriority: f.filterPriority || 'all',
        filterEmployees: f.filterEmployees || this.data.filterEmployees,
        selectedEmployeeIds: f.selectedEmployeeIds || []
      });
    }

    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo && userInfo.role === 'admin') {
      this.setData({ isAdmin: true });
    }

    this.initDate();
    // 模拟从接口获取全部数据
    this.setData({ allTodos: todosData }, () => {
      this.updateDashboard();
      this.filterTodos();
    });
  },
  initDate() {
    const d = new Date();
    this.setData({ today: `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日` });
  },
  updateDashboard() {
    const pending = this.data.allTodos.filter(t => t.status === 'pending').length;
    const completed = this.data.allTodos.filter(t => t.status === 'completed').length;
    this.setData({ pendingCount: pending, completedCount: completed });
  },
  filterTodos() {
    let filtered = this.data.allTodos.filter(t => t.status === this.data.activeTab);
    
    // 搜索过滤
    if (this.data.searchQuery) {
      const q = this.data.searchQuery.toLowerCase();
      filtered = filtered.filter(t => t.title.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q)));
    }

    // 时间范围过滤 (以 dueDate 为主，如果没有则以 createdAt 为主)
    if (this.data.timeFilterIndex > 0) {
      const now = new Date();
      const filterMs = {
        1: 7 * 24 * 3600 * 1000,   // 最近一周
        2: 30 * 24 * 3600 * 1000,  // 最近一月
        3: 365 * 24 * 3600 * 1000  // 最近一年
      };
      const limitMs = filterMs[this.data.timeFilterIndex];
      
      filtered = filtered.filter(t => {
        const targetDate = t.dueDate || t.createdAt;
        if (!targetDate) return true;
        const diff = now.getTime() - new Date(targetDate.replace(/-/g, '/')).getTime();
        return Math.abs(diff) <= limitMs;
      });
    }

    // 映射优先级和多执行人名称
    filtered = filtered.map(t => {
      const priorityMap = { high: '紧急任务', medium: '重要任务', low: '普通任务' };
      
      let assignedNames = '待指派';
      if (t.assignees && t.assignees.length > 0) {
        assignedNames = t.assignees.map(a => a.name).join('、');
      } else if (t.assignedTo) {
        // Fallback for any unmigrated mock data
        assignedNames = t.assignedTo.name;
      }

      return {
        ...t,
        priorityText: priorityMap[t.priority] || '普通任务',
        assignedNames
      };
    });
    
    // 人员高级筛选过滤
    if (this.data.selectedEmployeeIds && this.data.selectedEmployeeIds.length > 0) {
      const selectedNames = this.data.filterEmployees
        .filter(e => e.selected)
        .map(e => e.name);
      
      filtered = filtered.filter(t => {
        if (!t.assignees || t.assignees.length === 0) return false;
        // 只要待办的执行人中包含任意一个选中的人员即可
        return t.assignees.some(a => selectedNames.includes(a.name));
      });
    }

    // 优先级过滤
    if (this.data.filterPriority !== 'all') {
      filtered = filtered.filter(t => t.priority === this.data.filterPriority);
    }

    // 范围过滤 (与我相关 vs 全部)
    if (this.data.filterScope === 'related') {
      const userInfo = wx.getStorageSync('userInfo');
      if (userInfo && userInfo.name) {
        filtered = filtered.filter(t => {
          if (!t.assignees) return false;
          return t.assignees.some(a => a.name === userInfo.name);
        });
      }
    }

    // 计算到期状态
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '/');
    const todayTime = new Date(today).getTime();

    filtered = filtered.map(t => {
      let dueStatus = 'future';
      if (t.dueDate) {
        const dueTime = new Date(t.dueDate.replace(/-/g, '/')).getTime();
        if (dueTime < todayTime) {
          dueStatus = 'overdue';
        } else if (dueTime === todayTime) {
          dueStatus = 'today';
        }
      }
      return { ...t, dueStatus };
    });

    this.setData({ todos: filtered });
  },
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (this.data.activeTab === tab) return;
    this.setData({ activeTab: tab }, () => {
      this.filterTodos();
    });
  },
  saveFilterState() {
    const app = getApp();
    if (!app.globalData) app.globalData = {};
    app.globalData.todoFilters = {
      timeFilterIndex: this.data.timeFilterIndex,
      timeFilterLabel: this.data.timeFilterLabel,
      filterScope: this.data.filterScope,
      filterPriority: this.data.filterPriority,
      filterEmployees: this.data.filterEmployees,
      selectedEmployeeIds: this.data.selectedEmployeeIds
    };
  },

  onSearch(e) {
    this.setData({ searchQuery: e.detail.value }, () => {
      this.filterTodos();
    });
  },
  onTimeFilterChange(e) {
    const idx = parseInt(e.detail.value);
    this.setData({
      timeFilterIndex: idx,
      timeFilterLabel: this.data.timeFilterOptions[idx]
    }, () => {
      this.saveFilterState();
      this.filterTodos();
    });
  },

  toggleTodo(e) {
    const id = e.currentTarget.dataset.id;
    const newAllTodos = this.data.allTodos.map(t => {
      if (t.id === id) {
        return { ...t, status: t.status === 'completed' ? 'pending' : 'completed' };
      }
      return t;
    });
    
    // 先更新全部数据和本地列表产生即时反馈
    this.setData({ allTodos: newAllTodos });
    this.filterTodos();
    this.updateDashboard();
    
    // 延迟 400ms 后再次过滤（让完成的卡片有时间播完动画后消失）
    setTimeout(() => {
      this.filterTodos();
      wx.showToast({ title: '已更新', icon: 'success', duration: 800 });
    }, 400);
  },

  goToRelated(e) {
    const type = e.currentTarget.dataset.type;
    const id = e.currentTarget.dataset.id;
    if (type === 'lead') {
      wx.navigateTo({ url: `/pages/leadDetail/index?id=${id}` });
    } else if (type === 'project') {
      wx.navigateTo({ url: `/pages/projectDetail/index?id=${id}` });
    }
  },
  
  onTodoTap(e) {
    const id = e.currentTarget.dataset.id;
    if(id) wx.navigateTo({ url: '/pages/todoForm/index?id=' + id });
  },

  createTodo() {
    wx.navigateTo({ url: '/pages/todoForm/index' });
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
  switchFilterScope(e) {
    const scope = e.currentTarget.dataset.scope;
    this.setData({ filterScope: scope }, () => {
      this.saveFilterState();
      this.filterTodos();
    });
  },

  switchFilterPriority(e) {
    const p = e.currentTarget.dataset.priority;
    this.setData({ filterPriority: p }, () => {
      this.saveFilterState();
      this.filterTodos();
    });
  },

  applyFilter() {
    const selected = this.data.filterEmployees.filter(e => e.selected).map(e => e.id);
    this.setData({ 
      selectedEmployeeIds: selected,
      showFilterModal: false 
    }, () => {
      this.saveFilterState();
      this.filterTodos();
    });
  }
})