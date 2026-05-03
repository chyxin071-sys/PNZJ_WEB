import { requestSubscribe, TEMPLATE_IDS } from '../../utils/subscribe';

Page({
  data: {
    leadId: '',
    id: '', // if edit
    methods: ['电话沟通', '微信沟通', '客户到店', '上门量房', '其他'],
    activeMethod: '', // 默认不选择
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
    // 如果点击的是已选中的方式，则取消选择
    if (this.data.activeMethod === method) {
      this.setData({ activeMethod: '' });
    } else {
      this.setData({ activeMethod: method });
    }
  },

  onInput(e) {
    this.setData({ content: e.detail.value });
  },

  sendNotification(operatorName, nowStr, isEdit) {
    const db = wx.cloud.database();
    db.collection('leads').doc(this.data.leadId).get().then(res => {
      const lead = res.data;
      
      // 新增和编辑都更新 lastFollowUp 和 lastFollowUpAt（用于红点判断）
      db.collection('leads').doc(this.data.leadId).update({
        data: {
          lastFollowUp: nowStr,
          lastFollowUpAt: Date.now()
        }
      });
      
      const notifyUsers = new Set();
      if (lead.sales) notifyUsers.add(lead.sales);
      if (lead.designer) notifyUsers.add(lead.designer);
      if (lead.manager) notifyUsers.add(lead.manager);
      if (lead.creatorName) notifyUsers.add(lead.creatorName);
      
      const actionText = isEdit ? '更新了跟进记录' : '添加了跟进记录';

      const userInfo = wx.getStorageSync('userInfo');
      db.collection('users').where({ role: 'admin' }).get().then(adminRes => {
        adminRes.data.forEach(u => {
          notifyUsers.add(u.name);
        });

        notifyUsers.forEach(userName => {
          if (!userName) return;
          db.collection('notifications').add({
            data: {
              type: 'lead',
              title: isEdit ? '客户跟进有更新' : '客户有新跟进',
              content: `${operatorName} 对客户【${lead.name}】${actionText}。`,
              senderName: operatorName,
              senderRole: (userInfo || {}).role || 'default',
              targetUser: userName,
              isRead: false,
              createTime: db.serverDate(),
              link: `/pages/leadDetail/index?id=${this.data.leadId}`
            }
          });
        });
      });

      // 发送微信订阅消息 (含管理员)
      const userNamesArray = Array.from(notifyUsers);
      const queryConds = [{ role: 'admin' }];
      if (userNamesArray.length > 0) {
        queryConds.push({ name: db.command.in(userNamesArray) });
      }

      db.collection('users').where(db.command.or(queryConds)).get().then(userRes => {
        const receiverUserIds = [];
        userRes.data.forEach(userDoc => {
          if (userDoc.name !== operatorName) {
            receiverUserIds.push(userDoc._id);
          }
        });

        if (receiverUserIds.length > 0) {
          const envVersion = wx.getAccountInfoSync().miniProgram.envVersion || 'release';
          const miniprogramState = envVersion === 'release' ? 'formal' : (envVersion === 'trial' ? 'trial' : 'developer');
          wx.cloud.callFunction({
            name: 'sendSubscribeMessage',
            data: {
              receiverUserIds,
              templateId: TEMPLATE_IDS.PROJECT_UPDATE,
              page: `/pages/leadDetail/index?id=${this.data.leadId}`,
              miniprogramState,
              data: {
                thing1: { value: (lead.name || '未知客户').substring(0, 20) },
                time2: { value: nowStr },
                thing4: { value: operatorName.substring(0, 20) },
                thing6: { value: '请及时点击进入小程序查看详情' },
                thing7: { value: actionText }
              }
            }
          }).catch(console.error);
        }
      });
    });
  },

  async saveFollowUp() {
    if (!(this.data.content || '').trim()) {
      return wx.showToast({ title: '请输入跟进内容', icon: 'none' });
    }

    // 静默请求订阅授权
    await requestSubscribe();

    wx.showLoading({ title: '保存中...' });
    const db = wx.cloud.database();
    const userInfo = wx.getStorageSync('userInfo');
    const operatorName = userInfo.name || '未知人员';
    const now = new Date();
    const nowStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    if (this.data.id) {
      // Edit
      db.collection('followUps').doc(this.data.id).update({
        data: {
          method: this.data.activeMethod,
          content: (this.data.content || '').trim(),
          editedAt: db.serverDate(),
          editedBy: operatorName
        }
      }).then(() => {
        this.sendNotification(operatorName, nowStr, true);
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
          createdBy: operatorName,
          createdAt: db.serverDate(),
          displayTime: nowStr
        }
      }).then(() => {
        this.sendNotification(operatorName, nowStr, false);
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