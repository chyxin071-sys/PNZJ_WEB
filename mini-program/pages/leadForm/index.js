const employeesData = require('../../mock/employees.js');

Page({
  data: {
    id: null,
    isEdit: false,
    formData: {
      name: '',
      phone: '',
      address: '',
      area: '',
      rating: 'C',
      status: '待分配',
      requirementType: '全案',
      budget: '暂无',
      source: '自然进店',
      salesId: '',
      designerId: ''
    },
    
    ratingOptions: ['A', 'B', 'C', 'D'],
    statusOptions: ['沟通中', '已量房', '方案阶段', '已交定金', '已签单', '已流失'],
    reqOptions: ['全案', '半包', '局改', '软装'],
    budgetOptions: ['暂无', '10-20万', '20-30万', '30-50万', '50万以上'],
    sourceOptions: ['自然进店', '老介新', '抖音', '小红书', '大众点评', '自有关系', '其他'],
    
    salesList: [],
    designerList: [],
    salesIndex: -1,
    designerIndex: -1
  },

  onLoad(options) {
    const sales = employeesData.filter(e => e.role === 'sales' || e.role === 'admin');
    const designers = employeesData.filter(e => e.role === 'designer' || e.role === 'admin');
    this.setData({ salesList: sales, designerList: designers });

    if (options.id) {
      wx.setNavigationBarTitle({ title: '编辑客户' });
      this.setData({ id: options.id, isEdit: true });
      this.loadLeadData(options.id);
    }
  },

  loadLeadData(id) {
    const leadsData = require('../../mock/leads.js');
    const lead = leadsData.find(l => l.id === id);
    if (lead) {
      const salesIdx = this.data.salesList.findIndex(s => s.name === lead.sales);
      const designerIdx = this.data.designerList.findIndex(d => d.name === lead.designer);
      
      this.setData({
        formData: {
          name: lead.name,
          phone: lead.phone,
          address: lead.address,
          area: lead.area || '',
          rating: lead.rating,
          status: lead.status,
          requirementType: lead.requirementType,
          budget: lead.budget || '暂无',
          source: lead.source || '自然进店',
          salesId: salesIdx !== -1 ? this.data.salesList[salesIdx].id : '',
          designerId: designerIdx !== -1 ? this.data.designerList[designerIdx].id : ''
        },
        salesIndex: salesIdx,
        designerIndex: designerIdx
      });
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`formData.${field}`]: e.detail.value
    });
  },

  onPickerChange(e) {
    const field = e.currentTarget.dataset.field;
    const optionsName = e.currentTarget.dataset.options;
    const val = this.data[optionsName][e.detail.value];
    this.setData({
      [`formData.${field}`]: val
    });
  },

  onEmpChange(e) {
    const field = e.currentTarget.dataset.field; // salesId or designerId
    const listName = e.currentTarget.dataset.list; // salesList or designerList
    const indexName = e.currentTarget.dataset.index;
    
    const idx = e.detail.value;
    const emp = this.data[listName][idx];
    
    this.setData({
      [indexName]: idx,
      [`formData.${field}`]: emp.id
    });
  },

  saveLead() {
    const d = this.data.formData;
    if (!d.name.trim()) return wx.showToast({ title: '请输入姓名', icon: 'none' });
    if (!d.phone.trim()) return wx.showToast({ title: '请输入电话', icon: 'none' });
    if (!d.address.trim()) return wx.showToast({ title: '请输入小区地址', icon: 'none' });

    wx.showLoading({ title: '保存中...' });
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({ title: this.data.isEdit ? '修改成功' : '客户已创建', icon: 'success' });
      setTimeout(() => {
        wx.navigateBack();
      }, 1000);
    }, 800);
  },

  goBack() {
    wx.navigateBack();
  }
});