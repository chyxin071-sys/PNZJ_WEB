Page({
  data: {
    materials: [],
    filteredMaterials: [],
    loading: true,
    activeCategory: '全部',
    categories: ['全部', '主材', '辅材', '软装', '家电', '人工', '定制', '套餐'],
    searchQuery: '',
    selectMode: false,
    quoteId: null,
    quote: null
  },
  onLoad(options) {
    if (options.selectMode) {
      this.setData({ selectMode: true, quoteId: options.quoteId });
      wx.setNavigationBarTitle({ title: '选择材料' });
    }
  },
  onShow() {
    this.fetchData();
    if (this.data.selectMode && this.data.quoteId) {
      this.loadQuote();
    }
    if (!this.data.selectMode && typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 4 });
    }
  },
  loadQuote() {
    const db = wx.cloud.database();
    db.collection('quotes').doc(this.data.quoteId).get().then(res => {
      this.setData({ quote: res.data }, () => {
        this.filterData();
      });
    });
  },
  onPullDownRefresh() {
    this.fetchData().then(() => wx.stopPullDownRefresh());
  },
  fetchData() {
    return new Promise((resolve) => {
      this.setData({ loading: true });
      wx.showNavigationBarLoading();
      const db = wx.cloud.database();
      const MAX_LIMIT = 20; // 每次最多拉取20条
      
      // 为了支持较多材料，这里做个简单的多次拉取（最多拉取100条作为展示）
      const fetchBatch = (skip) => {
        return db.collection('materials')
          .orderBy('createdAt', 'desc')
          .skip(skip)
          .limit(MAX_LIMIT)
          .get();
      };

      Promise.all([
        fetchBatch(0),
        fetchBatch(20),
        fetchBatch(40),
        fetchBatch(60),
        fetchBatch(80)
      ]).then(results => {
        let allData = [];
        results.forEach(res => {
          allData = allData.concat(res.data);
        });
        
        // 去重（以防在拉取过程中有新数据插入导致重复）
        const uniqueData = [];
        const ids = new Set();
        allData.forEach(item => {
          if (!ids.has(item._id)) {
            ids.add(item._id);
            uniqueData.push(item);
          }
        });

        this.setData({ materials: uniqueData, loading: false }, () => {
          this.filterData();
        });
        wx.hideNavigationBarLoading();
        resolve();
      }).catch(err => {
        console.error('Fetch materials error:', err);
        this.setData({ loading: false });
        wx.hideNavigationBarLoading();
        wx.showToast({ title: '加载失败，请检查权限', icon: 'none' });
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

    if (this.data.selectMode && this.data.quote && this.data.quote.items) {
      const quoteItems = this.data.quote.items.map(i => i.name);
      list = list.map(m => ({
        ...m,
        added: quoteItems.includes(m.name)
      }));
    }
    
    this.setData({ filteredMaterials: list });
  },
  createMaterial() {
    wx.navigateTo({ url: '/pages/materialForm/index' });
  },
  goToDetail(e) {
    if (this.data.selectMode) return;
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/materialForm/index?id=${id}` });
  },

  toggleItem(e) {
    if (!this.data.selectMode) return;
    const materialId = e.currentTarget.dataset.id;
    const material = this.data.materials.find(m => m._id === materialId);
    if (!material || !this.data.quote) return;

    let items = this.data.quote.items || [];
    const isAdded = items.some(i => i.name === material.name);

    if (isAdded) {
      // Remove
      items = items.filter(i => i.name !== material.name);
    } else {
      // Add with default qty 1
      items.push({
        name: material.name,
        price: material.price,
        quantity: 1,
        total: material.price * 1,
        category: material.category,
        sku: material.sku
      });
    }

    const total = items.reduce((sum, item) => sum + (item.total || 0), 0);
    const newQuote = { ...this.data.quote, items, total };
    
    this.setData({ quote: newQuote }, () => {
      this.filterData();
    });

    // Update DB
    const db = wx.cloud.database();
    db.collection('quotes').doc(this.data.quoteId).update({
      data: { items, total, updatedAt: db.serverDate() }
    });
  },

  goBack() {
    wx.navigateBack();
  }
});