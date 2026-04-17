Page({
  data: {
    leadId: '',
    id: '', // if edit
    methods: ['电话沟通', '微信沟通', '客户到店', '上门量房', '其他'],
    activeMethod: '电话沟通',
    content: ''
  },

  onLoad(options) {
    if (options.leadId) {
      this.setData({ leadId: options.leadId });
    }
    if (options.id) {
      this.setData({ id: options.id });
      wx.setNavigationBarTitle({ title: '编辑跟进记录' });
      this.loadData(options.id);
    }
  },

  loadData(id) {
    wx.showLoading({ title: '加载中' });
    const db = wx.cloud.database();
    db.collection('followUps').doc(id).get().then(res => {
      wx.hideLoading();
      this.setData({
        activeMethod: res.data.method || '电话沟通',
        content: res.data.content || ''
      });
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({ title: '加载失败', icon: 'none' });
    });
  },

  selectMethod(e) {
    const method = e.currentTarget.dataset.method;
    this.setData({ activeMethod: method });
  },

  onInput(e) {
    this.setData({ content: e.detail.value });
  },

  saveFollowUp() {
    if (!(this.data.content || '').trim()) {
      return wx.showToast({ title: '请输入跟进内容', icon: 'none' });
    }

    wx.showLoading({ title: '保存中...' });
    const db = wx.cloud.database();
    const userInfo = wx.getStorageSync('userInfo');
    const now = new Date();
    const nowStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    if (this.data.id) {
      // Edit
      db.collection('followUps').doc(this.data.id).update({
        data: {
          method: this.data.activeMethod,
          content: (this.data.content || '').trim()
        }
      }).then(() => {
        wx.hideLoading();
        wx.showToast({ title: '保存成功', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 1000);
      }).catch(() => {
        wx.hideLoading();
        wx.showToast({ title: '保存失败', icon: 'none' });
      });
    } else {
      // Add
      db.collection('followUps').add({
        data: {
          leadId: this.data.leadId,
          method: this.data.activeMethod,
          content: (this.data.content || '').trim(),
          createdBy: userInfo.name,
          createdAt: db.serverDate(),
          displayTime: nowStr
        }
      }).then(() => {
        // --- 触发通知逻辑：新增跟进记录 ---
        const operatorName = userInfo.name || '未知人员';
        
        // 需要先查出这个线索归谁管
        db.collection('leads').doc(this.data.leadId).get().then(res => {
          const lead = res.data;
          
          // 更新线索的 lastFollowUp
          db.collection('leads').doc(this.data.leadId).update({
            data: { lastFollowUp: nowStr }
          });
          
          const notifyUsers = new Set();
          if (lead.sales && lead.sales !== operatorName) notifyUsers.add(lead.sales);
          if (lead.designer && lead.designer !== operatorName) notifyUsers.add(lead.designer);
          
          notifyUsers.forEach(userName => {
            db.collection('notifications').add({
              data: {
                type: 'lead',
                title: '客户有新跟进',
                content: `${operatorName} 对客户【${lead.name}】添加了跟进记录。`,
                targetUser: userName,
                isRead: false,
                createTime: db.serverDate(),
                link: `/pages/leadDetail/index?id=${this.data.leadId}`
              }
            });
          });

          if (userInfo.role !== 'admin') {
            db.collection('notifications').add({
              data: {
                type: 'lead',
                title: '客户有新跟进',
                content: `${operatorName} 对客户【${lead.name}】添加了跟进记录。`,
                targetUser: 'admin',
                isRead: false,
                createTime: db.serverDate(),
                link: `/pages/leadDetail/index?id=${this.data.leadId}`
              }
            });
          }
        });
        
        wx.hideLoading();
        wx.showToast({ title: '添加成功', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 1000);
      }).catch(() => {
        wx.hideLoading();
        wx.showToast({ title: '添加失败', icon: 'none' });
      });
    }
  }
});