Page({
  data: {
    allEmployees: [],
    filteredEmployees: [],
    deptGroups: [], // 非管理员用的部门分组数据
    searchQuery: '',
    activeTab: 'all',
    isAdmin: false,
    tabs: [
      { key: 'all', name: '全部' },
      { key: 'sales', name: '销售' },
      { key: 'designer', name: '设计' },
      { key: 'manager', name: '工程' },
      { key: 'admin', name: '管理' }
    ],
    showModal: false,
    modalType: 'add',
    currentEditId: '',
    formData: {
      name: '',
      phone: '',
      account: '',
      joinDate: ''
    },
    roleIndex: 0,
    roleOptions: [
      { key: 'sales', name: '销售' },
      { key: 'designer', name: '设计师' },
      { key: 'manager', name: '项目经理' },
      { key: 'admin', name: '管理员' }
    ],
    currentUserId: ''
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        currentUserId: userInfo.id || userInfo._id,
        isAdmin: userInfo.role === 'admin'
      });
    }
    this.fetchEmployees();
  },

  fetchEmployees() {
    wx.showLoading({ title: '加载中' });
    const db = wx.cloud.database();
    db.collection('users').get().then(res => {
      wx.hideLoading();
      const list = res.data.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
      this.setData({ allEmployees: list }, () => {
        this.filterEmployees();
        this.buildDeptGroups();
      });
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({ title: '获取数据失败', icon: 'none' });
      console.error(err);
    });
  },

  buildDeptGroups() {
    const all = this.data.allEmployees.filter(e => e.status !== 'inactive');
    const currentUserId = this.data.currentUserId;
    const depts = [
      { key: 'admin', label: '管理组' },
      { key: 'sales', label: '销售部' },
      { key: 'designer', label: '设计部' },
      { key: 'manager', label: '工程部' },
    ];
    const groups = depts.map(d => ({
      label: d.label,
      members: all.filter(e => e.role === d.key).map(e => ({
        ...e,
        isMe: e._id === currentUserId
      }))
    })).filter(g => g.members.length > 0);
    this.setData({ deptGroups: groups });
  },

  onSearch(e) {
    this.setData({ searchQuery: e.detail.value }, () => {
      this.filterEmployees();
    });
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab }, () => {
      this.filterEmployees();
    });
  },

  filterEmployees() {
    let filtered = [...this.data.allEmployees];

    // 搜索过滤
    if (this.data.searchQuery) {
      const q = this.data.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(emp => {
        const nameMatch = emp.name ? String(emp.name).toLowerCase().includes(q) : false;
        const phoneMatch = emp.phone ? String(emp.phone).includes(q) : false;
        return nameMatch || phoneMatch;
      });
    }

    // 角色过滤
    if (this.data.activeTab !== 'all') {
      filtered = filtered.filter(emp => emp.role === this.data.activeTab);
    }

    this.setData({ filteredEmployees: filtered });
  },

  // ---------------- 操作菜单 (修改/重置) ----------------
  showActionSheet(e) {
    const emp = e.currentTarget.dataset.employee;
    const isMe = emp._id === this.data.currentUserId;
    
    const actions = [
      { name: '修改身份', type: 'edit_role' },
      { name: '重置密码 (888888)', type: 'reset_pwd' }
    ];
    
    // 如果不是自己，才可以设为离职/在职
    if (!isMe) {
      actions.push({ name: emp.status === 'active' ? '设为离职' : '设为在职', type: 'toggle_status' });
    }
    
    wx.showActionSheet({
      itemList: actions.map(a => a.name),
      success: (res) => {
        const action = actions[res.tapIndex];
        if (action.type === 'edit_role') {
          this.showEditModal(emp);
        } else if (action.type === 'reset_pwd') {
          this.resetPassword(emp._id);
        } else if (action.type === 'toggle_status') {
          this.toggleStatus(emp._id, emp.status);
        }
      }
    });
  },

  resetPassword(id) {
    wx.showModal({
      title: '重置密码',
      content: '确定要将该员工密码重置为 888888 吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '重置中' });
          const db = wx.cloud.database();
          // 此处临时更新 passwordPlain 以匹配小程序当前的简单登录逻辑
          db.collection('users').doc(id).update({
            data: { passwordPlain: '888888' }
          }).then(() => {
            wx.hideLoading();
            wx.showToast({ title: '重置成功', icon: 'success' });
          }).catch(() => {
            wx.hideLoading();
            wx.showToast({ title: '重置失败', icon: 'none' });
          });
        }
      }
    });
  },

  toggleStatus(id, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    wx.showLoading({ title: '更新中' });
    const db = wx.cloud.database();
    db.collection('users').doc(id).update({
      data: { status: newStatus }
    }).then(() => {
      wx.hideLoading();
      wx.showToast({ title: '状态已更新', icon: 'success' });
      this.fetchEmployees();
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '更新失败', icon: 'none' });
    });
  },

  // ---------------- 弹窗表单 ----------------
  showAddModal() {
    const date = new Date();
    const today = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    this.setData({
      showModal: true,
      modalType: 'add',
      formData: { name: '', phone: '', joinDate: today },
      roleIndex: 0
    });
  },

  showEditModal(emp) {
    const idx = this.data.roleOptions.findIndex(r => r.key === emp.role);
    this.setData({
      showModal: true,
      modalType: 'edit',
      currentEditId: emp._id,
      oldName: emp.name,
      formData: {
        name: emp.name || '',
        phone: emp.phone || '',
        account: emp.account || '',
        joinDate: emp.joinDate || ''
      },
      roleIndex: idx >= 0 ? idx : 0
    });
  },

  closeModal() {
    this.setData({ showModal: false });
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`formData.${field}`]: e.detail.value
    });
  },

  onRoleChange(e) {
    this.setData({ roleIndex: e.detail.value });
  },

  onJoinDateChange(e) {
    this.setData({
      'formData.joinDate': e.detail.value
    });
  },

  saveEmployee() {
    const { modalType, formData, roleIndex, roleOptions, currentEditId } = this.data;
    const db = wx.cloud.database();
    const roleKey = roleOptions[roleIndex].key;

    if (!formData.name.trim() || !formData.phone.trim() || !formData.account.trim() || !formData.joinDate) {
      return wx.showToast({ title: '请填写完整信息', icon: 'none' });
    }

    wx.showLoading({ title: '保存中' });

    if (modalType === 'add') {
      const date = new Date();
      db.collection('users').add({
        data: {
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          account: formData.account.trim(),
          role: roleKey,
          status: 'active',
          joinDate: formData.joinDate,
          passwordPlain: '888888',
          passwordHash: '$2a$10$tK9i/O7q/U8T.w8/lQ8L8.6k5M1y7B1x4M4b9y3L2T7A4k6Z8u2G', // 888888的预设哈希值，方便网页端共用
          createdAt: date.toISOString()
        }
      }).then(() => {
        wx.hideLoading();
        wx.showToast({ title: '添加成功', icon: 'success' });
        this.closeModal();
        this.fetchEmployees();
      }).catch(err => {
        wx.hideLoading();
        console.error(err);
        wx.showToast({ title: '添加失败', icon: 'none' });
      });
    } else {
      // 修改员工
      db.collection('users').doc(currentEditId).update({
        data: { 
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          account: formData.account.trim(),
          role: roleKey,
          joinDate: formData.joinDate
        }
      }).then(() => {
        wx.hideLoading();
        wx.showToast({ title: '修改成功', icon: 'success' });
        
        // 如果修改的是当前登录用户自己，同步更新本地缓存
        if (currentEditId === this.data.currentUserId) {
          const userInfo = wx.getStorageSync('userInfo');
          userInfo.name = formData.name.trim();
          userInfo.phone = formData.phone.trim();
          userInfo.account = formData.account.trim();
          userInfo.role = roleKey;
          wx.setStorageSync('userInfo', userInfo);
        }

        // 同步更新 leads 和 projects 中的员工信息
        this.syncEmployeeReferences(currentEditId, formData.name.trim(), this.data.oldName);

        this.closeModal();
        this.fetchEmployees();
      }).catch(err => {
        wx.hideLoading();
        console.error(err);
        wx.showToast({ title: '修改失败', icon: 'none' });
      });
    }
  },

  // 同步更新员工引用
  syncEmployeeReferences(employeeId, newName, oldName) {
    const db = wx.cloud.database();
    const _ = db.command;

    // 更新 leads 中的 sales, designer, manager
    const updateLeads = db.collection('leads').where(_.or([
      { 'sales._id': employeeId },
      { 'designer._id': employeeId },
      { 'manager._id': employeeId }
    ])).update({
      data: {
        'sales.name': _.eq('sales._id', employeeId).then(newName),
        'designer.name': _.eq('designer._id', employeeId).then(newName),
        'manager.name': _.eq('manager._id', employeeId).then(newName)
      }
    });

    // 更新 projects 中的 manager
    const updateProjects = db.collection('projects').where({
      'manager._id': employeeId
    }).update({
      data: {
        'manager.name': newName
      }
    });

    // 执行更新（静默，不显示loading）
    Promise.all([updateLeads, updateProjects]).then(() => {
      console.log('员工引用同步更新完成');
      // 如果名字改变，添加跟进记录
      if (oldName && newName !== oldName) {
        this.addFollowUpForEmployeeChange(employeeId, oldName, newName);
      }
    }).catch(err => {
      console.error('同步更新失败:', err);
    });
  },

  addFollowUpForEmployeeChange(employeeId, oldName, newName) {
    const db = wx.cloud.database();
    const _ = db.command;

    // 查询受影响的leads
    db.collection('leads').where(_.or([
      { 'sales._id': employeeId },
      { 'designer._id': employeeId },
      { 'manager._id': employeeId }
    ])).get().then(res => {
      const leads = res.data;
      const followUps = leads.map(lead => {
        let role = '';
        if (lead.sales && lead.sales._id === employeeId) role = '销售';
        else if (lead.designer && lead.designer._id === employeeId) role = '设计师';
        else if (lead.manager && lead.manager._id === employeeId) role = '项目经理';

        return {
          leadId: lead._id,
          content: `${role}人员变更：${oldName} → ${newName}`,
          type: 'system',
          creator: '系统',
          createdAt: db.serverDate()
        };
      });

      // 批量添加跟进记录
      if (followUps.length > 0) {
        const promises = followUps.map(f => db.collection('followUps').add({ data: f }));
        Promise.all(promises).then(() => {
          console.log('员工变更跟进记录添加完成');
        }).catch(err => {
          console.error('添加跟进记录失败:', err);
        });
      }
    }).catch(err => {
      console.error('查询leads失败:', err);
    });
  }
});