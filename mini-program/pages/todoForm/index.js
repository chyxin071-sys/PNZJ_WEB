
import { maskName } from '../../utils/format.js';

Page({
  data: {
    mode: 'create', // 'create' | 'view' | 'edit'
    id: null,
    isEdit: false,
    isAdmin: false,
    isRelated: true,
    formData: {
      title: '',
      priority: 'medium',
      relatedType: 'none',
      relatedId: '',
      dueDate: '',
      assignees: [], // 存储选中的执行人信息 [{id, name}]
      description: ''
    },
    
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
    wx.showLoading({ title: '加载中' });
    const db = wx.cloud.database();
    
    // 加载员工数据
    db.collection('users').get().then(res => {
      const emps = res.data.map(e => ({
        id: e._id,
        name: e.name,
        role: e.role,
        displayName: `${e.name} (${e.role === 'admin' ? '管理员' : e.role === 'designer' ? '设计师' : e.role === 'sales' ? '销售' : '项目经理'})`
      }));
      this.setData({ employees: emps });

      if (options.id) {
        wx.setNavigationBarTitle({ title: '待办详情' });
        this.setData({ isEdit: true, id: options.id, mode: 'view' });
        this.loadTodoData(options.id);
      } else {
        wx.hideLoading();
      }
    });
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
    const db = wx.cloud.database();
    db.collection('todos').doc(id).get().then(res => {
      const todo = res.data;
      if (todo) {
        const userInfo = wx.getStorageSync('userInfo');
        const myName = userInfo ? userInfo.name : '';
        const isAdmin = userInfo && userInfo.role === 'admin';
        
        // 判断当前用户是否与该待办相关
        const assignees = todo.assignees || [];
        const assigneeIds = assignees.map(a => a.id);
        const isRelated = isAdmin || todo.creatorName === myName || assignees.some(a => a.name === myName);
        
        const emps = this.data.employees.map(e => ({
          ...e,
          selected: assigneeIds.includes(e.id)
        }));
        const selectedNames = emps.filter(e => e.selected).map(e => e.name).join(', ');
        
        let relatedName = '';
        if (todo.relatedTo && todo.relatedTo.name) {
          if (todo.relatedTo.type === 'lead') {
            db.collection('leads').doc(todo.relatedTo.id).get().then(lRes => {
              const l = lRes.data;
              const isLeadRelated = isAdmin || l.creatorName === myName || l.sales === myName || l.designer === myName || l.signer === myName;
              this.setData({
                'formData._displayRelatedName': isLeadRelated ? l.name : maskName(l.name)
              });
            }).catch(() => {
              this.setData({ 'formData._displayRelatedName': maskName(todo.relatedTo.name) });
            });
          } else {
            relatedName = todo.relatedTo.name;
          }
        }

        this.setData({
          isAdmin,
          isRelated,
          formData: {
            title: todo.title || '',
            priority: todo.priority || 'medium',
            relatedType: todo.relatedTo ? todo.relatedTo.type : 'none',
            relatedId: todo.relatedTo ? todo.relatedTo.id : '',
            dueDate: todo.dueDate || '',
            assignees: assignees,
            description: todo.description || '',
            _displayRelatedName: relatedName
          },
          employees: emps,
          selectedEmployeeNames: selectedNames
        });
        
        // 如果有关联对象，动态加载对应的选项
        if (todo.relatedTo && todo.relatedTo.type !== 'none') {
          this.loadRelatedOptions(todo.relatedTo.type, todo.relatedTo.id);
        } else {
          wx.hideLoading();
        }
      } else {
        wx.hideLoading();
      }
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '获取数据失败', icon: 'none' });
    });
  },

  loadRelatedOptions(typeVal, relatedId) {
    const db = wx.cloud.database();
    const collectionName = typeVal === 'lead' ? 'leads' : 'projects';
    
    db.collection(collectionName).get().then(res => {
      const userInfo = wx.getStorageSync('userInfo');
      const myName = userInfo ? userInfo.name : '';
      const isAdmin = userInfo && userInfo.role === 'admin';

      let relatedOps = [];
      if (typeVal === 'lead') {
        relatedOps = res.data.map(l => {
          const isLeadRelated = isAdmin || l.creatorName === myName || l.sales === myName || l.designer === myName || l.signer === myName;
          const displayName = isLeadRelated ? l.name : maskName(l.name);
          return { id: l._id, name: `${displayName} - ${l.status}` };
        });
      } else if (typeVal === 'project') {
        relatedOps = res.data.map(p => {
          const isProjRelated = isAdmin || p.creatorName === myName || p.manager === myName || p.designer === myName;
          const displayName = isProjRelated ? p.customer : maskName(p.customer);
          return { id: p._id, name: `${displayName} - ${p.address}` };
        });
      }

      const rIndex = relatedOps.findIndex(r => r.id === relatedId);
      const tIndex = this.data.typeValues.indexOf(typeVal);

      this.setData({
        typeIndex: tIndex !== -1 ? tIndex : 0,
        relatedOptions: relatedOps,
        relatedIndex: rIndex
      });
      wx.hideLoading();
    }).catch(() => {
      wx.hideLoading();
    });
  },

  onInput(e) {
    if (this.data.mode === 'view') return;
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`formData.${field}`]: e.detail.value
    });
  },

  setPriority(e) {
    if (this.data.mode === 'view') return;
    this.setData({
      'formData.priority': e.currentTarget.dataset.value
    });
  },

  onTypeChange(e) {
    if (this.data.mode === 'view') return;
    const idx = parseInt(e.detail.value);
    const typeVal = this.data.typeValues[idx];
    
    if (typeVal === 'none') {
      this.setData({
        typeIndex: idx,
        'formData.relatedType': 'none',
        relatedOptions: [],
        relatedIndex: -1,
        'formData.relatedId': ''
      });
      return;
    }

    wx.showLoading({ title: '加载选项' });
    const db = wx.cloud.database();
    const collectionName = typeVal === 'lead' ? 'leads' : 'projects';
    
    db.collection(collectionName).get().then(res => {
      const userInfo = wx.getStorageSync('userInfo');
      const myName = userInfo ? userInfo.name : '';
      const isAdmin = userInfo && userInfo.role === 'admin';

      let relatedOps = [];
      if (typeVal === 'lead') {
        relatedOps = res.data.map(l => {
          const isLeadRelated = isAdmin || l.creatorName === myName || l.sales === myName || l.designer === myName || l.signer === myName;
          const displayName = isLeadRelated ? l.name : maskName(l.name);
          return { id: l._id, name: `${displayName} - ${l.status}` };
        });
      } else if (typeVal === 'project') {
        relatedOps = res.data.map(p => {
          const isProjRelated = isAdmin || p.creatorName === myName || p.manager === myName || p.designer === myName;
          const displayName = isProjRelated ? p.customer : maskName(p.customer);
          return { id: p._id, name: `${displayName} - ${p.address}` };
        });
      }

      this.setData({
        typeIndex: idx,
        'formData.relatedType': typeVal,
        relatedOptions: relatedOps,
        relatedIndex: -1,
        'formData.relatedId': ''
      });
      wx.hideLoading();
    }).catch(() => {
      wx.hideLoading();
    });
  },

  onRelatedChange(e) {
    if (this.data.mode === 'view') return;
    const idx = parseInt(e.detail.value);
    this.setData({
      relatedIndex: idx,
      'formData.relatedId': this.data.relatedOptions[idx].id
    });
  },
  
  goToRelated() {
    const type = this.data.formData.relatedType;
    const id = this.data.formData.relatedId;
    if (!id || type === 'none') return;
    
    if (type === 'lead') {
      wx.navigateTo({ url: `/pages/leadDetail/index?id=${id}` });
    } else if (type === 'project') {
      wx.navigateTo({ url: `/pages/projectDetail/index?id=${id}` });
    }
  },

  onDateChange(e) {
    if (this.data.mode === 'view') return;
    this.setData({
      'formData.dueDate': e.detail.value
    });
  },

  toggleAssignee(e) {
    if (this.data.mode === 'view') return;
    const id = e.currentTarget.dataset.id;
    const emps = this.data.employees.map(emp => {
      if (emp.id === id) {
        emp.selected = !emp.selected;
      }
      return emp;
    });

    const selectedEmps = emps.filter(e => e.selected).map(e => ({ id: e.id, name: e.name }));
    const selectedNames = selectedEmps.map(e => e.name).join(', ');

    this.setData({
      employees: emps,
      'formData.assignees': selectedEmps,
      selectedEmployeeNames: selectedNames
    });
  },

  showAssigneeModal() {
    if (this.data.mode === 'view') return;
    this.setData({ showAssigneeModal: true });
  },

  hideAssigneeModal() {
    this.setData({ showAssigneeModal: false });
  },

  saveTodo() {
    if (this.data.mode === 'view') return;
    
    const d = this.data.formData;
    if (!d.title.trim()) return wx.showToast({ title: '请输入待办标题', icon: 'none' });
    if (d.assignees.length === 0) return wx.showToast({ title: '请至少选择一位执行人', icon: 'none' });
    if (d.relatedType !== 'none' && !d.relatedId) {
      return wx.showToast({ title: '请选择关联的具体对象', icon: 'none' });
    }

    wx.showLoading({ title: '保存中...' });
    const db = wx.cloud.database();
    
    let relatedTo = null; // 无关联时为 null
    if (d.relatedType !== 'none') {
      const selectedRelated = this.data.relatedOptions[this.data.relatedIndex];
      relatedTo = {
        type: d.relatedType,
        id: d.relatedId,
        name: selectedRelated ? selectedRelated.name.split(' - ')[0] : ''
      };
    }

    const updateData = {
      title: (d.title || '').trim(),
      description: (d.description || '').trim(),
      priority: d.priority,
      dueDate: d.dueDate,
      assignees: d.assignees,
      relatedTo: relatedTo
    };

    if (this.data.isEdit) {
      db.collection('todos').doc(this.data.id).update({
        data: updateData
      }).then(() => {
        // --- 触发通知逻辑：修改了待办 ---
        const userInfo = wx.getStorageSync('userInfo');
        const operatorName = userInfo.name || '未知人员';
        updateData.assignees.forEach(assignee => {
          if (assignee.name !== operatorName) {
            db.collection('notifications').add({
              data: {
                type: 'todo',
                title: '待办任务已更新',
                content: `${operatorName} 更新了指派给你的待办任务：【${updateData.title}】。`,
                targetUser: assignee.name,
                isRead: false,
                createTime: db.serverDate(),
                link: `/pages/todoForm/index?id=${this.data.id}`
              }
            });
          }
        });
        // 抄送给管理员
        if (userInfo.role !== 'admin') {
          db.collection('notifications').add({
            data: {
              type: 'todo',
              title: '待办任务已更新',
              content: `${operatorName} 更新了待办任务：【${updateData.title}】。`,
              targetUser: 'admin',
              isRead: false,
              createTime: db.serverDate(),
              link: `/pages/todoForm/index?id=${this.data.id}`
            }
          });
        }
        
        wx.hideLoading();
        wx.showToast({ title: '修改成功', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 1000);
      }).catch(() => {
        wx.hideLoading();
        wx.showToast({ title: '修改失败', icon: 'none' });
      });
    } else {
      const userInfo = wx.getStorageSync('userInfo');
      updateData.status = 'pending';
      updateData.creatorId = userInfo.id || userInfo._id;
      updateData.createdAt = new Date().toISOString();
      
      db.collection('todos').add({
        data: updateData
      }).then((res) => {
        // --- 触发通知逻辑：新建待办 ---
        const operatorName = userInfo.name || '未知人员';
        const newTodoId = res._id;
        
        updateData.assignees.forEach(assignee => {
          if (assignee.name !== operatorName) {
            db.collection('notifications').add({
              data: {
                type: 'todo',
                title: '收到新的待办任务',
                content: `${operatorName} 给你指派了新的待办任务：【${updateData.title}】。`,
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
              content: `${operatorName} 创建了待办任务：【${updateData.title}】。`,
              targetUser: 'admin',
              isRead: false,
              createTime: db.serverDate(),
              link: `/pages/todoForm/index?id=${newTodoId}`
            }
          });
        }

        wx.hideLoading();
        wx.showToast({ title: '新建成功', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 1000);
      }).catch(() => {
        wx.hideLoading();
        wx.showToast({ title: '新建失败', icon: 'none' });
      });
    }
  },

  deleteTodo() {
    if (!this.data.id) return;
    wx.showModal({
      title: '删除确认',
      content: '确定要删除这条待办吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中' });
          const db = wx.cloud.database();
          db.collection('todos').doc(this.data.id).remove().then(() => {
            wx.hideLoading();
            wx.showToast({ title: '删除成功', icon: 'success' });
            setTimeout(() => wx.navigateBack(), 1000);
          }).catch(() => {
            wx.hideLoading();
            wx.showToast({ title: '删除失败', icon: 'none' });
          });
        }
      }
    });
  }
});
