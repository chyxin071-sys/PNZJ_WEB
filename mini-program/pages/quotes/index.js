Page({
  data: {
    quotes: [],
    filteredQuotes: [],
    loading: true,
    activeStatus: '全部',
    searchQuery: '',
    showCreateModal: false,
    leadsList: [],
    searchLeadQuery: ''
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
          const formattedData = res.data.map(q => {
            if (q.updatedAt) {
              const d = new Date(q.updatedAt);
              q._updatedAtFormatted = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
            } else if (q.createdAt) {
              const d = new Date(q.createdAt);
              q._updatedAtFormatted = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
            }
            return q;
          });
          const sorted = formattedData.sort((a, b) => {
            const timeA = a && a.createdAt ? String(a.createdAt) : '';
            const timeB = b && b.createdAt ? String(b.createdAt) : '';
            return timeB.localeCompare(timeA);
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
    this.setData({ showCreateModal: true, searchLeadQuery: '' });
    this.loadLeads();
  },
  
  closeCreateModal() {
    this.setData({ showCreateModal: false });
  },
  
  onLeadSearch(e) {
    this.setData({ searchLeadQuery: e.detail.value });
    this.loadLeads();
  },
  
  loadLeads() {
    const db = wx.cloud.database();
    const _ = db.command;
    let query = db.collection('leads');
    
    if (this.data.searchLeadQuery) {
      const sq = this.data.searchLeadQuery;
      query = query.where(_.or([
        { name: db.RegExp({ regexp: sq, options: 'i' }) },
        { phone: db.RegExp({ regexp: sq, options: 'i' }) }
      ]));
    }
    
    query.limit(20).get().then(res => {
      this.setData({ leadsList: res.data });
    });
  },
  
  selectLead(e) {
    const leadId = e.currentTarget.dataset.id;
    this.setData({ showCreateModal: false });
    wx.navigateTo({ url: `/pages/quoteDetail/index?leadId=${leadId}` });
  }
});