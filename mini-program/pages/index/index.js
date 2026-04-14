// 移除 mock 数据引入
// const todosData = require('../../mock/todos.js');

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
    
    filterEmployees: [],
    selectedEmployeeIds: [],
    isAdmin: false
  },
  onShow() {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo) {
      wx.reLaunch({
        url: '/pages/login/index'
      });
      return;
    }

    if (userInfo.role === 'admin') {
      this.setData({ isAdmin: true });
    }

    this.initDate();

    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }

    // 每次显示时从云端拉取真实数据
    this.fetchData();
  },
  onLoad() {
    // 恢复筛选状态
    const app = getApp();
    if (app.globalData && app.globalData.todoFilters) {
      const f = app.globalData.todoFilters;
      this.setData({
        timeFilterIndex: f.timeFilterIndex !== undefined ? f.timeFilterIndex : 1,
        timeFilterLabel: f.timeFilterLabel || '最近一周',
        filterScope: f.filterScope || 'related',
        filterPriority: f.filterPriority || 'all',
        filterEmployees: f.filterEmployees || this.data.filterEmployees,
        selectedEmployeeIds: f.selectedEmployeeIds || []
      });
    }
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
        return { id: u._id, name: u.name, dept, selected: false, _todoSelected: false };
      });
      
      if (this.data.selectedEmployeeIds.length > 0) {
        emps.forEach(e => {
          if (this.data.selectedEmployeeIds.includes(e.id)) e.selected = true;
        });
      }
      
      this.setData({ filterEmployees: emps });
      this.updateGroupedEmployees();
    });

    // 2. 获取所有待办
    db.collection('todos').get().then(res => {
      wx.hideNavigationBarLoading();
      wx.stopPullDownRefresh();
      
      const list = res.data.sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dbTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dbTime - da; // 倒序
      });
      
      this.setData({ allTodos: list }, () => {
        this.filterTodos();
      });
    }).catch(err => {
      wx.hideNavigationBarLoading();
      wx.stopPullDownRefresh();
      console.error('获取待办失败', err);
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
  initDate() {
    const d = new Date();
    this.setData({ today: `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日` });
  },
  updateDashboard(filteredList) {
    const list = filteredList || this.data.allTodos;
    const pending = list.filter(t => t.status === 'pending').length;
    const completed = list.filter(t => t.status === 'completed').length;
    this.setData({ pendingCount: pending, completedCount: completed });
  },
  filterTodos() {
    let filtered = this.data.allTodos;
    
    // 搜索过滤
    if (this.data.searchQuery) {
      const q = this.data.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(t => {
        const titleMatch = t.title ? String(t.title).toLowerCase().includes(q) : false;
        const descMatch = t.description ? String(t.description).toLowerCase().includes(q) : false;
        return titleMatch || descMatch;
      });
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

    // 此时的 filtered 是经过时间筛选和搜索的总数据，用来更新顶部看板
    this.updateDashboard(filtered);

    // 继续执行只影响列表的 tab 过滤 (pending / completed)
    filtered = filtered.filter(t => t.status === this.data.activeTab);

    // 映射优先级和多执行人名称
    filtered = filtered.map(t => {
      const priorityMap = { high: '紧急任务', medium: '重要任务', low: '普通任务' };
      
      let assignedNames = '待指派';
      if (t.assignees && t.assignees.length > 0) {
        assignedNames = t.assignees.map(a => a.name).join(' | ');
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
    const today = new Date();
    // 清零时分秒，仅比较日期
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    filtered = filtered.map(t => {
      let dueStatus = 'future';
      if (t.dueDate) {
        const dueObj = new Date(t.dueDate.replace(/-/g, '/'));
        dueObj.setHours(0, 0, 0, 0);
        const dueTime = dueObj.getTime();
        
        if (dueTime < todayTime) {
          dueStatus = 'overdue';
        } else if (dueTime === todayTime) {
          dueStatus = 'today';
        } else {
          dueStatus = 'future';
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
    const todo = this.data.allTodos.find(t => t._id === id);
    if (!todo) return;
    
    const newStatus = todo.status === 'completed' ? 'pending' : 'completed';
    
    // 乐观更新本地
    const newAllTodos = this.data.allTodos.map(t => {
      if (t._id === id) {
        return { ...t, status: newStatus };
      }
      return t;
    });
    this.setData({ allTodos: newAllTodos });
    this.filterTodos();
    
    // 更新云端
    const db = wx.cloud.database();
    db.collection('todos').doc(id).update({
      data: { status: newStatus }
    }).then(() => {
      wx.showToast({ title: '已更新', icon: 'success', duration: 800 });
      
      // --- 触发通知逻辑：待办完成 ---
      if (newStatus === 'completed') {
        const userInfo = wx.getStorageSync('userInfo');
        const operatorName = userInfo.name || '未知人员';
        
        // 找出任务相关人员（除了操作者本人）
        const notifyUsers = new Set();
        
        // 如果有创建者，且创建者不是当前操作人，通知创建者
        if (todo.creatorName && todo.creatorName !== operatorName) {
          notifyUsers.add(todo.creatorName);
        }
        
        // 通知其他执行人
        if (todo.assignees && todo.assignees.length > 0) {
          todo.assignees.forEach(a => {
            if (a.name !== operatorName) {
              notifyUsers.add(a.name);
            }
          });
        }
        
        // 发送通知
        notifyUsers.forEach(userName => {
          db.collection('notifications').add({
            data: {
              type: 'todo',
              title: '待办任务已完成',
              content: `${operatorName} 已完成了待办任务：【${todo.title}】。`,
              targetUser: userName,
              isRead: false,
              createTime: db.serverDate(),
              link: `/pages/todoForm/index?id=${id}`
            }
          });
        });
        
        // 抄送管理员
        if (userInfo.role !== 'admin') {
          db.collection('notifications').add({
            data: {
              type: 'todo',
              title: '待办任务已完成',
              content: `${operatorName} 完成了待办任务：【${todo.title}】。`,
              targetUser: 'admin',
              isRead: false,
              createTime: db.serverDate(),
              link: `/pages/todoForm/index?id=${id}`
            }
          });
        }
        
        // 自动添加客户跟进记录（仅关联了客户的待办完成时）
        if (todo.relatedTo && todo.relatedTo.type === 'lead' && todo.relatedTo.id) {
          const now = new Date();
          db.collection('followUps').add({
            data: {
              leadId: todo.relatedTo.id,
              content: `【待办已完成】${todo.title.trim()}`,
              createdBy: operatorName,
              createdAt: now.toISOString(),
              type: 'system'
            }
          });
          
          // 更新客户的最后跟进时间
          db.collection('leads').doc(todo.relatedTo.id).update({
            data: {
              lastFollowUp: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
            }
          });
        }
      }
      
      this.fetchData();
    }).catch(() => {
      wx.showToast({ title: '更新失败', icon: 'none' });
      this.fetchData(); // 回滚
    });
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

  // ===================== 新建待办逻辑 =====================
  createTodo() {
    // 弹窗时先加载客户列表，以便关联客户，并构造用于 picker 的名称数组
    const db = wx.cloud.database();
    db.collection('leads').get().then(res => {
      const leads = res.data;
      const leadNames = leads.map(l => l.name);
      this.setData({ 
        availableLeads: leads,
        availableLeadNames: ['不关联', ...leadNames]
      });
    }).catch(err => {
      console.error('获取关联客户失败', err);
    });

    this.setData({
      showAddModal: true,
      showAssigneeDropdown: false,
      newTodo: {
        title: '',
        description: '',
        priority: 'medium',
        dueDate: '',
        assignees: [], // 选中的执行人ID数组
        assigneeNames: '', // 用于在选择器上显示的中文名
        relatedLeadId: '',
        relatedLeadName: ''
      }
    });
  },

  closeAddModal() {
    this.setData({ showAddModal: false, showAssigneeDropdown: false });
  },

  toggleAssigneeDropdown() {
    this.setData({
      showAssigneeDropdown: !this.data.showAssigneeDropdown
    });
  },

  onNewTodoInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`newTodo.${field}`]: e.detail.value
    });
  },

  onNewTodoPickerChange(e) {
    const field = e.currentTarget.dataset.field;
    if (field === 'priority') {
      const priorityMap = ['high', 'medium', 'low'];
      this.setData({
        [`newTodo.${field}`]: priorityMap[e.detail.value]
      });
    } else if (field === 'relatedLead') {
      const idx = e.detail.value;
      if (idx == 0) { // 第0项是不关联
        this.setData({
          'newTodo.relatedLeadId': '',
          'newTodo.relatedLeadName': ''
        });
      } else {
        const lead = this.data.availableLeads[idx - 1]; // 偏移1
        this.setData({
          'newTodo.relatedLeadId': lead._id,
          'newTodo.relatedLeadName': lead.name
        });
      }
    }
  },

  onNewTodoDateChange(e) {
    this.setData({
      'newTodo.dueDate': e.detail.value
    });
  },

  toggleNewTodoAssignee(e) {
    const id = e.currentTarget.dataset.id;
    let assignees = [...this.data.newTodo.assignees];
    if (assignees.includes(id)) {
      assignees = assignees.filter(a => a !== id);
    } else {
      assignees.push(id);
    }
    
    // 更新 filterEmployees 里的 selected 状态以供 WXML 渲染打勾
    const updatedEmps = this.data.filterEmployees.map(emp => {
      return { ...emp, _todoSelected: assignees.includes(emp.id) };
    });
    
    // 生成展示用的中文名，用逗号拼接
    const assigneeNames = updatedEmps
      .filter(emp => emp._todoSelected)
      .map(emp => emp.name)
      .join(', ');

    this.setData({
      filterEmployees: updatedEmps,
      'newTodo.assignees': assignees,
      'newTodo.assigneeNames': assigneeNames
    }, () => {
      this.updateGroupedEmployees();
    });
  },

  saveNewTodo() {
    const { title, priority, dueDate, assignees } = this.data.newTodo;
    if (!(title || '').trim() || assignees.length === 0) {
      return wx.showToast({ title: '请填写任务标题并选择执行人', icon: 'none' });
    }

    wx.showLoading({ title: '保存中' });
    const db = wx.cloud.database();
    const userInfo = wx.getStorageSync('userInfo');
    
    const now = new Date();
    
    // 构造选中的执行人数据结构 [{id, name, avatar}]
    const selectedAssigneeData = this.data.filterEmployees
      .filter(e => assignees.includes(e.id))
      .map(e => ({
        id: e.id,
        name: e.name,
        avatar: ''
      }));

    // 如果有选择关联客户
    let relatedTo = null;
    if (this.data.newTodo.relatedLeadId) {
      relatedTo = {
        type: 'lead',
        id: this.data.newTodo.relatedLeadId,
        name: this.data.newTodo.relatedLeadName
      };
    }

    db.collection('todos').add({
      data: {
        title: title.trim(),
        description: (this.data.newTodo.description || '').trim(),
        status: 'pending',
        priority: priority,
        dueDate: dueDate || `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`,
        assignees: selectedAssigneeData,
        creatorId: userInfo.id || userInfo._id,
        createdAt: now.toISOString(),
        relatedTo: relatedTo
      }
    }).then((res) => {
      // --- 触发通知逻辑：新建待办 ---
      const operatorName = userInfo.name || '未知人员';
      const newTodoId = res._id;
      
      selectedAssigneeData.forEach(assignee => {
        if (assignee.name !== operatorName) {
          db.collection('notifications').add({
            data: {
              type: 'todo',
              title: '收到新的待办任务',
              content: `${operatorName} 给你指派了新的待办任务：【${title.trim()}】。`,
              targetUser: assignee.name,
              isRead: false,
              createTime: db.serverDate(),
              link: `/pages/todoForm/index?id=${newTodoId}`
            }
          });
        }
      });
      
      // 抄送给管理员
      if (userInfo.role !== 'admin') {
        db.collection('notifications').add({
          data: {
            type: 'todo',
            title: '新建了待办任务',
            content: `${operatorName} 创建了待办任务：【${title.trim()}】。`,
            targetUser: 'admin',
            isRead: false,
            createTime: db.serverDate(),
            link: `/pages/todoForm/index?id=${newTodoId}`
          }
        });
      }
      
      wx.hideLoading();
      wx.showToast({ title: '新建成功', icon: 'success' });
      this.closeAddModal();
      this.fetchData();
    }).catch(err => {
      wx.hideLoading();
      console.error('新建待办失败', err);
      wx.showToast({ title: '新建失败', icon: 'none' });
    });
  },

  // 阻止冒泡
  preventTap() {
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
      if (emp.id === id) emp.selected = !emp.selected;
      return emp;
    });
    this.setData({ filterEmployees: employees }, () => {
      this.updateGroupedEmployees();
    });
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

  resetFilter() {
    const emps = this.data.filterEmployees.map(e => ({...e, selected: false}));
    this.setData({
      filterScope: 'related',
      timeFilterIndex: 1,
      timeFilterLabel: '最近一周',
      filterPriority: 'all',
      filterEmployees: emps,
      selectedEmployeeIds: []
    }, () => {
      this.updateGroupedEmployees();
      this.saveFilterState();
      this.filterTodos();
      this.closeFilterModal();
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