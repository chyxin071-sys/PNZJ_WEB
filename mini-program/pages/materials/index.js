Page({
  data: {
    materials: [],
    filteredMaterials: [],
    loading: true,
    activeCategory: '全部',
    categories: ['全部', '主材', '辅材', '软装', '家电', '人工', '定制', '套餐'],
    searchQuery: '',
    selectMode: false,
    quoteId: null
  },
  onLoad(options) {
    if (options.selectMode) {
      this.setData({ selectMode: true, quoteId: options.quoteId });
      wx.setNavigationBarTitle({ title: '选择材料' });
    }
  },
  onShow() {
    this.fetchData();
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 4 }); // 假设 4 是材料菜单
    }
  },
  onPullDownRefresh() {
    this.fetchData().then(() => wx.stopPullDownRefresh());
  },
  fetchData() {
    return new Promise((resolve) => {
      this.setData({ loading: true });
      wx.showNavigationBarLoading();
      const db = wx.cloud.database();
      db.collection('materials').get()
        .then(res => {
          const sorted = res.data.sort((a, b) => {
            const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return tb - ta;
          });
          this.setData({ materials: sorted, loading: false }, () => {
            this.filterData();
          });
          wx.hideNavigationBarLoading();
          resolve();
        })
        .catch(err => {
          this.setData({ loading: false });
          wx.hideNavigationBarLoading();
          resolve();
        });
    });
  },
  switchCategory(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({ activeCategory: category }, () => {
      this.filterData();
    });
  },
  onSearch(e) {
    this.setData({ searchQuery: e.detail.value }, () => {
      this.filterData();
    });
  },
  filterData() {
    let list = this.data.materials;
    
    if (this.data.activeCategory !== '全部') {
      list = list.filter(m => m.category === this.data.activeCategory);
    }
    
    if (this.data.searchQuery) {
      const sq = this.data.searchQuery.toLowerCase();
      list = list.filter(m => 
        (m.name && m.name.toLowerCase().includes(sq)) || 
        (m.brand && m.brand.toLowerCase().includes(sq)) ||
        (m.sku && m.sku.toLowerCase().includes(sq))
      );
    }
    
    this.setData({ filteredMaterials: list });
  },
  createMaterial() {
    wx.navigateTo({ url: '/pages/materialForm/index' });
  },
  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (this.data.selectMode) {
      wx.showModal({
        title: '添加数量',
        editable: true,
        placeholderText: '请输入添加数量',
        success: (res) => {
          if (res.confirm && res.content) {
            const qty = parseInt(res.content, 10);
            if (qty > 0) {
              this.addItemToQuote(id, qty);
            } else {
              wx.showToast({ title: '数量必须大于0', icon: 'none' });
            }
          }
        }
      });
    } else {
      wx.navigateTo({ url: `/pages/materialForm/index?id=${id}` });
    }
  },

  addItemToQuote(materialId, qty) {
    wx.showLoading({ title: '添加中' });
    const material = this.data.materials.find(m => m._id === materialId);
    if (!material) return wx.hideLoading();

    const db = wx.cloud.database();
    db.collection('quotes').doc(this.data.quoteId).get().then(res => {
      const quote = res.data;
      const items = quote.items || [];
      items.push({
        name: material.name,
        price: material.price,
        quantity: qty,
        total: material.price * qty,
        category: material.category,
        sku: material.sku
      });
      const total = items.reduce((sum, item) => sum + (item.total || 0), 0);
      
      db.collection('quotes').doc(this.data.quoteId).update({
        data: { items, total, updatedAt: db.serverDate() }
      }).then(() => {
        wx.hideLoading();
        wx.showToast({ title: '添加成功', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 1000);
      });
    });
  }
});