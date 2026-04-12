const leadsData = require('../../mock/leads.js');

Page({
  data: {
    leadId: '',
    lead: null,
    activeTab: 'info'
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
    const lead = leadsData.find(l => l.id === id);
    if (lead) {
      this.setData({ lead });
    }
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
    wx.showToast({ title: '报价功能待开发', icon: 'none' });
  },

  goToProject() {
    wx.showToast({ title: '工地详情待开发', icon: 'none' });
  },

  addFollowUp() {
    if (this.data.leadId) {
      wx.navigateTo({ url: `/pages/addFollowUp/index?leadId=${this.data.leadId}` });
    }
  },

  goToEdit() {
    if (this.data.leadId) {
      wx.navigateTo({ url: `/pages/leadForm/index?id=${this.data.leadId}` });
    }
  }
});