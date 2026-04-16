Page({
  data: {
    formData: {
      managerId: '',
      startDate: ''
    },
    leads: [],
    leadIndex: -1,
    
    managers: [{ id: '', name: '无' }],
    managerIndex: 0
  },

  onLoad() {
    this.loadEmployees();
    this.loadSignedLeads();
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
      this.setData({ leads });
    });
  },

  loadEmployees() {
    const db = wx.cloud.database();
    db.collection('users').get().then(res => {
      const managers = [{ id: '', name: '无' }];
      
      res.data.forEach(u => {
        if (u.role === 'manager') managers.push({ id: u._id, name: u.name });
      });

      this.setData({ managers });
    });
  },

  onLeadChange(e) {
    this.setData({ leadIndex: parseInt(e.detail.value) });
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`formData.${field}`]: e.detail.value
    });
  },

  onPickerChange(e) {
    const field = e.currentTarget.dataset.field;
    const idx = parseInt(e.detail.value);
    const arr = this.data[`${field}s`];
    this.setData({
      [`${field}Index`]: idx,
      [`formData.${field}Id`]: arr[idx].id
    });
  },

  saveProject() {
    const d = this.data.formData;
    if (this.data.leadIndex === -1) return wx.showToast({ title: '请选择关联客户', icon: 'none' });
    if (this.data.managerIndex === 0) return wx.showToast({ title: '请选择项目经理', icon: 'none' });
    if (!d.startDate) return wx.showToast({ title: '请选择开工时间', icon: 'none' });
    
    wx.showLoading({ title: '保存中' });
    
    // 自动计算状态逻辑
    let status = '未开工';
    const now = new Date();
    const startDate = new Date(d.startDate.replace(/-/g, '/'));
    
    // 消除时分秒影响，仅按天比较
    now.setHours(0,0,0,0);
    startDate.setHours(0,0,0,0);

    if (now.getTime() >= startDate.getTime()) {
      status = '施工中';
    }
    
    const health = '正常';
    const currentNode = 1; // 默认从第1阶段(开工)开始

    const db = wx.cloud.database();
    const managerName = this.data.managers[this.data.managerIndex].name;
    const selectedLead = this.data.leads[this.data.leadIndex];

    const projectData = {
      leadId: selectedLead._id,
      customer: selectedLead.name,
      address: selectedLead.address || '',
      manager: managerName === '无' ? '' : managerName,
      managerId: d.managerId,
      designer: selectedLead.designer || '',
      designerId: selectedLead.designerId || '',
      sales: selectedLead.sales || '',
      salesId: selectedLead.salesId || '',
      signDate: selectedLead.signDate || '',
      signer: selectedLead.signer || '',
      startDate: d.startDate,
      status: status,
      currentNode: currentNode,
      health: health,
      createdAt: db.serverDate()
    };

    db.collection('projects').add({
      data: projectData
    }).then(() => {
      wx.hideLoading();
      wx.showToast({ title: '创建成功', icon: 'success' });
      setTimeout(() => {
        wx.navigateBack();
      }, 1000);
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '创建失败', icon: 'none' });
    });
  }
});