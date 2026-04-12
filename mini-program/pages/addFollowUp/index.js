Page({
  data: {
    leadId: '',
    methods: ['电话沟通', '微信沟通', '客户到店', '上门量房', '其他'],
    activeMethod: '电话沟通',
    content: ''
  },

  onLoad(options) {
    if (options.leadId) {
      this.setData({ leadId: options.leadId });
    }
  },

  selectMethod(e) {
    const method = e.currentTarget.dataset.method;
    this.setData({ activeMethod: method });
  },

  onInput(e) {
    this.setData({ content: e.detail.value });
  },

  saveFollowUp() {
    if (!this.data.content.trim()) {
      return wx.showToast({ title: '请输入跟进内容', icon: 'none' });
    }

    wx.showLoading({ title: '保存中...' });
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({ title: '添加成功', icon: 'success' });
      setTimeout(() => {
        wx.navigateBack();
      }, 1000);
    }, 800);
  }
});