const employeesData = require('../../mock/employees.js');

Page({
  data: {
    formData: {
      name: '',
      phone: '',
      address: '',
      area: '',
      rating: 'C',
      status: '待分配',
      requirementType: '全案',
      budget: '暂无',
      salesId: '',
      designerId: ''
    },
    
    ratingOptions: ['A', 'B', 'C', 'D'],
    statusOptions: ['待分配', '跟进中', '已量房', '已出图', '已报预估', '已签单', '已流失'],
    reqOptions: ['全案', '半包', '局改', '软装'],
    budgetOptions: ['暂无', '10-20万', '20-30万', '30-50万', '50万以上'],
    
    salesList: [],
    designerList: [],
    salesIndex: -1,
    designerIndex: -1
  },

  onLoad() {
    const sales = employeesData.filter(e => e.role === 'sales' || e.role === 'admin');
    const designers = employeesData.filter(e => e.role === 'designer' || e.role === 'admin');
    this.setData({ salesList: sales, designerList: designers });
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
      wx.showToast({ title: '客户已创建', icon: 'success' });
      setTimeout(() => {
        wx.navigateBack();
      }, 1000);
    }, 800);
  },

  goBack() {
    wx.navigateBack();
  }
});