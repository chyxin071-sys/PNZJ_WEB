import { maskName, maskPhone, maskAddress } from '../../utils/format.js';

Page({
  data: {
    leadId: '',
    lead: null,
    activeTab: 'info',
    followUps: [],
    quoteId: null,
    hasProject: false,
    isAdmin: false,
    isRelated: false
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
      const userInfo = wx.getStorageSync('userInfo');
      const myName = userInfo ? userInfo.name : '';
      const isAdmin = userInfo && userInfo.role === 'admin';
      
      let lead = res.data;
      const isRelated = isAdmin || lead.creatorName === myName || lead.sales === myName || lead.designer === myName || lead.signer === myName;

      if (!isRelated) {
        lead._isMasked = true;
        lead.name = maskName(lead.name);
        lead.phone = maskPhone(lead.phone);
        lead.address = maskAddress(lead.address);
        if (lead.community) lead.community = maskAddress(lead.community);
      }

      this.setData({ 
        lead: lead,
        isAdmin,
        isRelated
      });
      this.loadFollowUps(id);
      this.checkQuoteStatus(id);
      this.checkProjectStatus(id);
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

  checkProjectStatus(leadId) {
    const db = wx.cloud.database();
    db.collection('projects').where({ leadId }).limit(1).get().then(res => {
      if (res.data && res.data.length > 0) {
        this.setData({ hasProject: true, projectId: res.data[0]._id });
      } else {
        this.setData({ hasProject: false, projectId: null });
      }
    }).catch(() => {
      this.setData({ hasProject: false, projectId: null });
    });
  },

  loadFollowUps(leadId) {
    if (!this.data.isAdmin && !this.data.isRelated) {
      this.setData({ followUps: [] });
      return;
    }
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
    if (!this.data.isAdmin && !this.data.isRelated) {
      return wx.showToast({ title: '无权限查看', icon: 'none' });
    }
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

  onRatingChange(e) {
    if (!this.data.isAdmin && !this.data.isRelated) {
      return wx.showToast({ title: '无修改权限', icon: 'none' });
    }
    const ratings = ['A', 'B', 'C', 'D'];
    const newRating = ratings[e.detail.value];
    if (newRating === this.data.lead.rating) return;
    this.updateLeadField('rating', newRating);
  },

  onStatusChange(e) {
    if (!this.data.isAdmin && !this.data.isRelated) {
      return wx.showToast({ title: '无修改权限', icon: 'none' });
    }
    const statuses = ['待跟进', '沟通中', '已量房', '方案阶段', '已交定金', '已签单', '已流失'];
    const newStatus = statuses[e.detail.value];
    if (newStatus === this.data.lead.status) return;

    if (newStatus === '已签单') {
      const userInfo = wx.getStorageSync('userInfo');
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const signDate = `${yyyy}-${mm}-${dd}`;
      
      const db = wx.cloud.database();
      db.collection('users').get().then(res => {
        const emps = res.data || [];
        const signersList = emps.map(e => e.name);
        
        let signerIndex = 0;
        const currentUserName = userInfo ? (userInfo.name || '未知') : '未知';
        const foundIndex = signersList.indexOf(currentUserName);
        if (foundIndex !== -1) {
          signerIndex = foundIndex;
        }
        
        this.setData({
          showSignModal: true,
          signDate: signDate,
          signersList: signersList,
          signerIndex: signerIndex,
          signer: signersList.length > 0 ? signersList[signerIndex] : currentUserName
        });
        if (typeof this.getTabBar === 'function' && this.getTabBar()) {
          this.getTabBar().setData({ hidden: true });
        }
      }).catch(err => {
        // Fallback
        this.setData({
          showSignModal: true,
          signDate: signDate,
          signersList: [userInfo ? userInfo.name : '未知'],
          signerIndex: 0,
          signer: userInfo ? userInfo.name : '未知'
        });
        if (typeof this.getTabBar === 'function' && this.getTabBar()) {
          this.getTabBar().setData({ hidden: true });
        }
      });

      return;
    }

    this.updateLeadField('status', newStatus);
    this.addSystemFollowUp(`将客户状态更改为：${newStatus}`);
  },

  showNoPermissionToast() {
    wx.showToast({ title: '无权限修改', icon: 'none' });
  },

  addSystemFollowUp(content) {
    const db = wx.cloud.database();
    const userInfo = wx.getStorageSync('userInfo');
    const operatorName = userInfo ? (userInfo.name || '未知') : '未知';
    const now = new Date();
    const nowStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    db.collection('followUps').add({
      data: {
        leadId: this.data.leadId,
        content: content,
        method: '系统记录',
        createdBy: operatorName,
        createdAt: nowStr,
        timestamp: db.serverDate()
      }
    }).then(() => {
      this.loadFollowUps(this.data.leadId);
    });
  },

  onSignDateChange(e) {
    this.setData({ signDate: e.detail.value });
  },

  onSignerChange(e) {
    const idx = e.detail.value;
    const name = this.data.signersList[idx];
    this.setData({ 
      signerIndex: idx,
      signer: name 
    });
  },

  closeSignModal() {
    this.setData({ showSignModal: false });
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ hidden: false });
    }
  },

  confirmSign() {
    const { signDate, signer } = this.data;
    if (!signDate || !signer) {
      return wx.showToast({ title: '请填写签单时间和签单人', icon: 'none' });
    }

    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ hidden: false });
    }
    wx.showLoading({ title: '正在处理...' });
    const db = wx.cloud.database();
    db.collection('leads').doc(this.data.leadId).update({
      data: {
        status: '已签单',
        signDate: signDate,
        signer: signer,
        updatedAt: db.serverDate()
      }
    }).then(() => {
      wx.hideLoading();
      this.setData({ 
        'lead.status': '已签单',
        'lead.signDate': signDate,
        'lead.signer': signer,
        showSignModal: false 
      });
      
      this.addSystemFollowUp(`将客户状态更改为：已签单 (签单人: ${signer}, 日期: ${signDate})`);

      // 弹出全屏庆祝动画或提示
      wx.showToast({
        title: '恭喜签单！',
        icon: 'success',
        duration: 2000
      });
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '操作失败', icon: 'none' });
    });
  },

  updateLeadField(field, value) {
    wx.showLoading({ title: '修改中...' });
    const db = wx.cloud.database();
    db.collection('leads').doc(this.data.leadId).update({
      data: {
        [field]: value,
        updatedAt: db.serverDate()
      }
    }).then(() => {
      wx.hideLoading();
      wx.showToast({ title: '修改成功', icon: 'success' });
      this.setData({ [`lead.${field}`]: value });
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '修改失败', icon: 'none' });
    });
  }
});