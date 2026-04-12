
const leadsData = require('../../mock/leads.js');
const projectsData = require('../../mock/projects.js');
const employeesData = require('../../mock/employees.js');

Page({
  data: {
    mode: 'create', // 'create' | 'view' | 'edit'
    id: null,
    isEdit: false,
    formData: {
      title: '',
      priority: 'medium',
      relatedType: 'none',
      relatedId: '',
      dueDate: '',
      assignedToIds: [],
      description: ''
    },
    
    // UI Options
    typeOptions: ['无关联', '关联客户', '关联工地'],
    typeValues: ['none', 'lead', 'project'],
    typeIndex: 0,
    
    relatedOptions: [],
    relatedIndex: -1,
    
    employees: [],
    selectedEmployeeNames: ''
  },

  onShow() {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo) {
      wx.reLaunch({
        url: '/pages/login/index'
      });
    }
  },

  onLoad(options) {
    // 格式化员工数据用于选择
    const emps = employeesData.map(e => ({
      ...e,
      displayName: `${e.name} (${e.role === 'admin' ? '管理员' : e.role === 'designer' ? '设计师' : e.role === 'sales' ? '销售' : '项目经理'})`
    }));
    this.setData({ employees: emps });

    if (options.id) {
      wx.setNavigationBarTitle({ title: '待办详情' });
      this.setData({ isEdit: true, id: options.id, mode: 'view' });
      this.loadTodoData(options.id);
    }
  },

  enterEditMode() {
    wx.setNavigationBarTitle({ title: '编辑待办' });
    this.setData({ mode: 'edit' });
  },

  cancelEdit() {
    wx.setNavigationBarTitle({ title: '待办详情' });
    this.setData({ mode: 'view' });
    this.loadTodoData(this.data.id); // 还原数据
  },

    loadTodoData(id) {
      // 模拟从本地 mock 数据获取
      const todosData = require('../../mock/todos.js');
      const todo = todosData.find(t => t.id === id);
      if (todo) {
        // 找出 relatedIndex
        let rIndex = -1;
        let tIndex = this.data.typeValues.indexOf(todo.relatedTo.type);
        if (tIndex === -1) tIndex = 0;

        let options = [];
        if (todo.relatedTo.type === 'lead') {
          options = leadsData;
          rIndex = leadsData.findIndex(l => l.id === todo.relatedTo.id);
        } else if (todo.relatedTo.type === 'project') {
          options = projectsData;
          rIndex = projectsData.findIndex(p => p.id === todo.relatedTo.id);
        }

        // 选中执行人
        const assignees = todo.assignees || [];
        const assigneeIds = assignees.map(a => a.id);
        const emps = this.data.employees.map(e => ({
          ...e,
          selected: assigneeIds.includes(e.id)
        }));
        const selectedNames = emps.filter(e => e.selected).map(e => e.name).join(', ');

        this.setData({
          formData: {
            title: todo.title,
            priority: todo.priority,
            relatedType: todo.relatedTo.type,
            relatedId: todo.relatedTo.id,
            dueDate: todo.dueDate || '',
            assignedToIds: assigneeIds,
            description: todo.description || ''
          },
          typeIndex: tIndex,
          relatedOptions: options,
          relatedIndex: rIndex,
          employees: emps,
          selectedEmployeeNames: selectedNames
        });
      }
    },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`formData.${field}`]: e.detail.value
    });
  },

  setPriority(e) {
    this.setData({
      'formData.priority': e.currentTarget.dataset.value
    });
  },

  onTypeChange(e) {
    const idx = parseInt(e.detail.value);
    const typeVal = this.data.typeValues[idx];
    
    let relatedOps = [];
    if (typeVal === 'lead') {
      relatedOps = leadsData.map(l => ({ id: l.id, name: `${l.name} - ${l.status}` }));
    } else if (typeVal === 'project') {
      relatedOps = projectsData.map(p => ({ id: p.id, name: `${p.customer} - ${p.address}` }));
    }

    this.setData({
      typeIndex: idx,
      'formData.relatedType': typeVal,
      relatedOptions: relatedOps,
      relatedIndex: -1,
      'formData.relatedId': ''
    });
  },

  onRelatedChange(e) {
    const idx = parseInt(e.detail.value);
    this.setData({
      relatedIndex: idx,
      'formData.relatedId': this.data.relatedOptions[idx].id
    });
  },

  onDateChange(e) {
    this.setData({
      'formData.dueDate': e.detail.value
    });
  },

  showAssigneeModal() {
    this.setData({ showAssigneeModal: true });
  },

  hideAssigneeModal() {
    this.setData({ showAssigneeModal: false });
  },

  toggleAssignee(e) {
    const id = e.currentTarget.dataset.id;
    const emps = this.data.employees.map(emp => {
      if (emp.id === id) {
        return { ...emp, selected: !emp.selected };
      }
      return emp;
    });
    
    const selectedEmps = emps.filter(e => e.selected);
    
    this.setData({
      employees: emps,
      'formData.assignedToIds': selectedEmps.map(e => e.id),
      selectedEmployeeNames: selectedEmps.map(e => e.name).join('、')
    });
  },

  goBack() {
    wx.navigateBack();
  },

  goToRelated() {
      const type = this.data.formData.relatedType;
      const id = this.data.formData.relatedId;
      if (!id) return;
      
      if (type === 'lead') {
        wx.navigateTo({ url: `/pages/leadDetail/index?id=${id}` });
      } else if (type === 'project') {
        wx.navigateTo({ url: `/pages/projectDetail/index?id=${id}` });
      }
    },

  deleteTodo() {
    wx.showModal({
      title: '删除待办',
      content: '确定要删除此待办任务吗？',
      confirmColor: '#ef4444',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' });
          setTimeout(() => {
            wx.hideLoading();
            wx.showToast({ title: '删除成功', icon: 'success' });
            setTimeout(() => {
              wx.navigateBack();
            }, 1000);
          }, 800);
        }
      }
    });
  },

  saveTodo() {
    const d = this.data.formData;
    if (!d.title.trim()) return wx.showToast({ title: '请输入标题', icon: 'none' });
    if (!d.dueDate) return wx.showToast({ title: '请选择截止日期', icon: 'none' });
    if (!d.assignedToIds || d.assignedToIds.length === 0) return wx.showToast({ title: '请选择执行人', icon: 'none' });
    if (d.relatedType !== 'none' && !d.relatedId) return wx.showToast({ title: '请选择关联对象', icon: 'none' });

    wx.showLoading({ title: '保存中...' });
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 800);
    }, 600);
  }
});
