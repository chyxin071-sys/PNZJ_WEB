Page({
  data: {
    allEmployees: [],
    filteredEmployees: [],
    searchQuery: '',
    activeTab: 'all', // all, sales, designer, manager, admin
    tabs: [
      { key: 'all', name: '全部' },
      { key: 'sales', name: '销售' },
      { key: 'designer', name: '设计' },
      { key: 'manager', name: '工程' },
      { key: 'admin', name: '管理' }
    ],
    showModal: false,
    modalType: 'add', // 'add' or 'edit'
    currentEditId: '',
    formData: {
      name: '',
      phone: '',
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
      this.setData({ currentUserId: userInfo.id || userInfo._id });
    }
    this.fetchEmployees();
  },

  fetchEmployees() {
    wx.showLoading({ title: '加载中' });
    const db = wx.cloud.database();
    db.collection('users').get().then(res => {
      wx.hideLoading();
      // 按创建时间或名字排序
      const list = res.data.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
      this.setData({ allEmployees: list }, () => {
        this.filterEmployees();
      });
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({ title: '获取数据失败', icon: 'none' });
      console.error(err);
    });
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
      formData: {
        name: emp.name || '',
        phone: emp.phone || '',
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

    if (!formData.name.trim() || !formData.phone.trim() || !formData.joinDate) {
      return wx.showToast({ title: '请填写完整信息', icon: 'none' });
    }

    wx.showLoading({ title: '保存中' });

    if (modalType === 'add') {
      const date = new Date();
      db.collection('users').add({
        data: {
          name: formData.name.trim(),
          phone: formData.phone.trim(),
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
          role: roleKey,
          joinDate: formData.joinDate
        }
      }).then(() => {
        wx.hideLoading();
        wx.showToast({ title: '修改成功', icon: 'success' });
        
        // 如果修改的是当前登录用户自己，同步更新本地缓存
        if (currentEditId === this.data.currentUserId) {
          const userInfo = wx.getStorageSync('userInfo') || {};
          const updatedUserInfo = {
            ...userInfo,
            name: formData.name.trim(),
            phone: formData.phone.trim(),
            role: roleKey
          };
          wx.setStorageSync('userInfo', updatedUserInfo);
        }

        this.closeModal();
        this.fetchEmployees();
      }).catch(err => {
        wx.hideLoading();
        wx.showToast({ title: '修改失败', icon: 'none' });
      });
    }
  }
});