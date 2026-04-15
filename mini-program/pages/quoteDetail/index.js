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

  onShow() {
    if (this.data.id) {
      this.loadQuote(this.data.id);
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
  },

  goToSelectMaterial() {
    wx.navigateTo({ url: `/pages/materials/index?selectMode=true&quoteId=${this.data.id}` });
  },

  deleteItem(e) {
    const idx = e.currentTarget.dataset.index;
    const items = this.data.quote.items || [];
    items.splice(idx, 1);
    this.saveQuoteData(items);
  },

  updateQty(e) {
    const idx = e.currentTarget.dataset.index;
    const delta = parseInt(e.currentTarget.dataset.delta, 10);
    const items = this.data.quote.items || [];
    const item = items[idx];
    
    let newQty = item.quantity + delta;
    if (newQty < 1) newQty = 1;
    
    item.quantity = newQty;
    item.total = item.price * newQty;
    this.saveQuoteData(items);
  },

  saveQuoteData(items) {
    // 重新计算总价
    const total = items.reduce((sum, item) => sum + (item.total || 0), 0);
    
    wx.showLoading({ title: '保存中', mask: true });
    const db = wx.cloud.database();
    db.collection('quotes').doc(this.data.id).update({
      data: { items, total, updatedAt: db.serverDate() }
    }).then(() => {
      this.setData({ 'quote.items': items, 'quote.total': total });
      wx.hideLoading();
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
    });
  },

  saveQuote() {
    wx.showToast({ title: '保存成功', icon: 'success' });
    setTimeout(() => wx.navigateBack(), 1500);
  }
});