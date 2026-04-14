Page({
  data: {
    id: null,
    project: null,
    loading: true,
    nodesList: ["开工", "水电", "木工", "瓦工", "墙面", "定制", "软装", "交付"],
    currentNodeIndex: 0
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ id: options.id });
      this.loadProject(options.id);
    } else {
      wx.showToast({ title: '参数错误', icon: 'none' });
    }
  },

  onShow() {
    if (this.data.id && !this.data.loading) {
      this.loadProject(this.data.id);
    }
  },

  loadProject(id) {
    wx.showLoading({ title: '加载中' });
    const db = wx.cloud.database();
    db.collection('projects').doc(id).get().then(res => {
      const p = res.data;
      const currentNode = p.currentNode || 1;
      
      let daysElapsed = 0;
      if (p.startDate && p.status !== '未开工') {
        daysElapsed = Math.ceil((new Date().getTime() - new Date(p.startDate.replace(/-/g, '/')).getTime()) / (1000 * 60 * 60 * 24));
        if (daysElapsed < 0) daysElapsed = 0;
      }
      
      let expectedEndDate = '-';
      if (p.startDate) {
        const sd = new Date(p.startDate.replace(/-/g, '/'));
        sd.setDate(sd.getDate() + 90);
        expectedEndDate = `${sd.getFullYear()}-${String(sd.getMonth()+1).padStart(2,'0')}-${String(sd.getDate()).padStart(2,'0')}`;
      }
      
      this.setData({ 
        project: { ...p, daysElapsed, expectedEndDate },
        currentNodeIndex: currentNode - 1,
        loading: false 
      });
      wx.hideLoading();
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '加载失败', icon: 'none' });
    });
  },

  goToQuote() {
    if (this.data.project && this.data.project.leadId) {
      wx.navigateTo({ url: `/pages/quoteDetail/index?leadId=${this.data.project.leadId}` });
    }
  }
});