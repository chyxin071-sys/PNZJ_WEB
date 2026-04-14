Page({
  data: {
    materials: [],
    filteredMaterials: [],
    loading: true,
    activeCategory: '全部',
    categories: ['全部', '主材', '辅材', '软装', '家电', '人工', '定制', '套餐'],
    searchQuery: ''
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
    wx.showToast({ title: '新增及库存管理请前往网页端操作', icon: 'none', duration: 2500 });
  }
});