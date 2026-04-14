Page({
  data: {
    leadId: '',
    lead: null,
    activeTab: 'info',
    followUps: [],
    quoteId: null
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ leadId: options.id });
      this.loadLeadData(options.id);
    }
  },

  onShow() {
    if (this.data.leadId) {
      this.loadLeadData(this.data.leadId);
    }
  },

  loadLeadData(id) {
    wx.showNavigationBarLoading();
    const db = wx.cloud.database();
    db.collection('leads').doc(id).get().then(res => {
      this.setData({ lead: res.data });
      this.loadFollowUps(id);
      this.checkQuoteStatus(id);
    }).catch(err => {
      wx.hideNavigationBarLoading();
      wx.showToast({ title: '获取客户失败', icon: 'none' });
    });
  },

  checkQuoteStatus(leadId) {
    const db = wx.cloud.database();
    db.collection('quotes').where({ leadId }).limit(1).get().then(res => {
      if (res.data && res.data.length > 0) {
        this.setData({ quoteId: res.data[0]._id });
      } else {
        this.setData({ quoteId: null });
      }
    }).catch(() => {});
  },

  loadFollowUps(leadId) {
    const db = wx.cloud.database();
    db.collection('followUps').where({ leadId }).orderBy('createdAt', 'desc').get().then(res => {
      wx.hideNavigationBarLoading();
      
      // 格式化时间显示
      const formattedList = res.data.map(item => {
        if (item.createdAt) {
          const d = new Date(item.createdAt);
          if (!isNaN(d.getTime())) {
            item.displayTime = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
          } else {
            item.displayTime = item.createdAt;
          }
        }
        return item;
      });
      
      this.setData({ followUps: formattedList });
    }).catch(err => {
      wx.hideNavigationBarLoading();
    });
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },

  callPhone() {
    if (this.data.lead && this.data.lead.phone) {
      wx.makePhoneCall({ phoneNumber: this.data.lead.phone });
    }
  },

  goToQuote() {
    if (this.data.quoteId) {
      wx.navigateTo({ url: `/pages/quoteDetail/index?id=${this.data.quoteId}` });
    } else {
      wx.navigateTo({ url: `/pages/quoteDetail/index?leadId=${this.data.leadId}` });
    }
  },

  goToProject() {
    // 检查是否有工地，如果有则跳详情，没有则跳列表（列表带有 filter）
    const db = wx.cloud.database();
    db.collection('projects').where({ leadId: this.data.leadId }).limit(1).get().then(res => {
      if (res.data && res.data.length > 0) {
        wx.navigateTo({ url: `/pages/projectDetail/index?id=${res.data[0]._id}` });
      } else {
        wx.navigateTo({ url: `/pages/projects/index?leadId=${this.data.leadId}` });
      }
    }).catch(() => {
      wx.navigateTo({ url: `/pages/projects/index?leadId=${this.data.leadId}` });
    });
  },

  addFollowUp() {
    if (this.data.leadId) {
      wx.navigateTo({ url: `/pages/addFollowUp/index?leadId=${this.data.leadId}` });
    }
  },

  editFollowUp(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/addFollowUp/index?leadId=${this.data.leadId}&id=${id}` });
  },

  deleteFollowUp(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除确认',
      content: '确定要删除这条跟进记录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中' });
          const db = wx.cloud.database();
          db.collection('followUps').doc(id).remove().then(() => {
            wx.hideLoading();
            wx.showToast({ title: '删除成功', icon: 'success' });
            this.loadFollowUps(this.data.leadId);
          }).catch(() => {
            wx.hideLoading();
            wx.showToast({ title: '删除失败', icon: 'none' });
          });
        }
      }
    });
  },

  goToEdit() {
    if (this.data.leadId) {
      wx.navigateTo({ url: `/pages/leadForm/index?id=${this.data.leadId}` });
    }
  },

  deleteLead() {
    wx.showModal({
      title: '删除线索',
      content: '删除后无法恢复，确定要删除这个客户吗？',
      confirmColor: '#e11d48',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中' });
          const db = wx.cloud.database();
          // 删除客户
          db.collection('leads').doc(this.data.leadId).remove().then(() => {
            wx.hideLoading();
            wx.showToast({ title: '已删除', icon: 'success' });
            setTimeout(() => {
              wx.navigateBack();
            }, 1000);
          }).catch(err => {
            wx.hideLoading();
            wx.showToast({ title: '删除失败', icon: 'none' });
          });
        }
      }
    });
  }
});