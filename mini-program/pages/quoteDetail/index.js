Page({
  data: {
    id: null,
    leadId: null,
    quote: null,
    loading: true,
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ id: options.id });
      this.loadQuote(options.id);
    } else if (options.leadId) {
      this.setData({ leadId: options.leadId });
      this.createQuote(options.leadId);
    } else {
      wx.showToast({ title: '参数错误', icon: 'none' });
    }
  },

  loadQuote(id) {
    wx.showLoading({ title: '加载中' });
    const db = wx.cloud.database();
    db.collection('quotes').doc(id).get().then(res => {
      this.setData({ quote: res.data, loading: false });
      wx.hideLoading();
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '加载失败', icon: 'none' });
    });
  },

  createQuote(leadId) {
    wx.showLoading({ title: '正在生成' });
    const db = wx.cloud.database();
    db.collection('leads').doc(leadId).get().then(res => {
      const lead = res.data;
      const newQuote = {
        leadId: lead._id,
        customer: lead.name,
        phone: lead.phone,
        address: lead.address,
        sales: lead.sales,
        designer: lead.designer,
        status: '初步',
        total: 0,
        final: 0,
        items: [],
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      };
      
      db.collection('quotes').add({ data: newQuote }).then(addRes => {
        newQuote._id = addRes._id;
        this.setData({ id: addRes._id, quote: newQuote, loading: false });
        wx.hideLoading();
        wx.showToast({ title: '报价单已生成', icon: 'success' });
      }).catch(() => {
        wx.hideLoading();
        wx.showToast({ title: '生成失败', icon: 'none' });
      });
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '获取客户信息失败', icon: 'none' });
    });
  }
});