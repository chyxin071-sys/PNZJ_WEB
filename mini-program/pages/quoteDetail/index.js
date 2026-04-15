Page({
  data: {
    id: null,
    leadId: null,
    quote: null,
    loading: true,
    groupedItems: [],
    showCustomModal: false,
    customItem: {
      name: '',
      category: '主材',
      price: '',
      quantity: '1',
      unit: '项'
    },
    categories: ['主材', '辅材', '软装', '家电', '人工', '定制', '套餐', '其他']
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
      this.processGroupedItems(res.data.items || []);
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

  processGroupedItems(items) {
    const groupsMap = {};
    items.forEach((item, index) => {
      const cat = item.category || '其他';
      if (!groupsMap[cat]) groupsMap[cat] = { category: cat, items: [], subtotal: 0 };
      groupsMap[cat].items.push({ ...item, _originalIndex: index });
      groupsMap[cat].subtotal += (item.total || 0);
    });

    const groupedItems = this.data.categories
      .filter(cat => groupsMap[cat])
      .map(cat => groupsMap[cat]);
      
    // Add any categories not in the predefined list
    Object.keys(groupsMap).forEach(cat => {
      if (!this.data.categories.includes(cat)) {
        groupedItems.push(groupsMap[cat]);
      }
    });

    this.setData({ groupedItems });
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
      this.processGroupedItems(items);
      wx.hideLoading();
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
    });
  },

  saveQuote() {
    wx.showToast({ title: '保存成功', icon: 'success' });
    setTimeout(() => wx.navigateBack(), 1500);
  },

  openCustomModal() {
    this.setData({
      showCustomModal: true,
      customItem: { name: '', category: '主材', price: '', quantity: '1', unit: '项' }
    });
  },

  closeCustomModal() {
    this.setData({ showCustomModal: false });
  },

  onCustomInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`customItem.${field}`]: e.detail.value });
  },

  onCustomPickerChange(e) {
    const cat = this.data.categories[e.detail.value];
    this.setData({ 'customItem.category': cat });
  },

  saveCustomItem() {
    const { name, category, price, quantity, unit } = this.data.customItem;
    if (!name.trim()) return wx.showToast({ title: '请输入名称', icon: 'none' });
    if (!price || isNaN(price)) return wx.showToast({ title: '请输入有效单价', icon: 'none' });

    const qty = parseInt(quantity, 10) || 1;
    const priceNum = parseFloat(price);
    
    const newItem = {
      name,
      category,
      unit: unit || '项',
      price: priceNum,
      quantity: qty,
      total: priceNum * qty,
      sku: '非标项'
    };

    const items = this.data.quote.items || [];
    items.push(newItem);
    
    this.saveQuoteData(items);
    this.closeCustomModal();
  }
});