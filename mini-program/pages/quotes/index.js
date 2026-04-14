Page({
  data: {
    quotes: [],
    filteredQuotes: [],
    loading: true,
    activeStatus: '全部',
    searchQuery: ''
  },
  onShow() {
    this.fetchData();
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 }); // 假设 3 是报价菜单
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
      db.collection('quotes').get()
        .then(res => {
          const sorted = res.data.sort((a, b) => {
            const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return tb - ta;
          });
          this.setData({ quotes: sorted, loading: false }, () => {
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
  switchStatus(e) {
    const status = e.currentTarget.dataset.status;
    this.setData({ activeStatus: status }, () => {
      this.filterData();
    });
  },
  onSearch(e) {
    this.setData({ searchQuery: e.detail.value }, () => {
      this.filterData();
    });
  },
  filterData() {
    let list = this.data.quotes;
    
    if (this.data.activeStatus !== '全部') {
      list = list.filter(q => q.status === this.data.activeStatus);
    }
    
    if (this.data.searchQuery) {
      const sq = this.data.searchQuery.toLowerCase();
      list = list.filter(q => 
        (q.customer && q.customer.toLowerCase().includes(sq)) || 
        (q.phone && q.phone.includes(sq))
      );
    }
    
    this.setData({ filteredQuotes: list });
  },
  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/quoteDetail/index?id=${id}` });
  },
  createQuote() {
    // wx.navigateTo({ url: `/pages/quoteForm/index` });
    wx.showToast({ title: '请在网页端创建', icon: 'none' });
  }
});