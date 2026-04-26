// pages/shareAccessManage/index.js
import { TEMPLATE_IDS } from '../../utils/subscribe';

Page({
  data: {
    projectId: null,
    project: null,
    requests: [],
    loading: true
  },

  onLoad(options) {
    if (options.projectId) {
      this.setData({ projectId: options.projectId });
      this.loadData(options.projectId);
    } else {
      this.setData({ loading: false });
    }
  },

  loadData(projectId) {
    const db = wx.cloud.database();
    Promise.all([
      db.collection('projects').doc(projectId).get(),
      db.collection('shareAccess').where({ projectId }).orderBy('createdAt', 'desc').limit(50).get()
    ]).then(([projRes, accessRes]) => {
      // 格式化时间显示
      const requests = accessRes.data.map(r => {
        let displayTime = r.displayTime;
        if (!displayTime && r.createdAt) {
          // 兼容处理 serverDate
          const date = r.createdAt.$date ? new Date(r.createdAt.$date) : new Date(r.createdAt);
          displayTime = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
        }
        let displayApprovedTime = '';
        if (r.approvedAt) {
          const d2 = r.approvedAt.$date ? new Date(r.approvedAt.$date) : new Date(r.approvedAt);
          displayApprovedTime = `${d2.getFullYear()}-${String(d2.getMonth()+1).padStart(2,'0')}-${String(d2.getDate()).padStart(2,'0')} ${String(d2.getHours()).padStart(2,'0')}:${String(d2.getMinutes()).padStart(2,'0')}`;
        }
        return { ...r, displayTime, displayApprovedTime };
      });
      this.setData({
        project: projRes.data,
        requests,
        loading: false
      });
    }).catch(() => {
      this.setData({ loading: false });
    });
  },

  addSystemFollowUp(content) {
    const leadId = this.data.project?.leadId;
    if (!leadId) return;
    
    const userInfo = wx.getStorageSync('userInfo');
    const operatorName = userInfo ? userInfo.name : '管理员';
    const operatorRole = userInfo ? userInfo.role : 'admin';
    const now = new Date();
    const nowStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    
    const db = wx.cloud.database();
    db.collection('followUps').add({
      data: {
        leadId: leadId,
        content: `【系统自动记录】\n${content}`,
        method: '系统记录',
        createdBy: operatorName,
        creatorRole: operatorRole,
        createdAt: db.serverDate(),
        displayTime: nowStr,
        timestamp: db.serverDate(),
        type: 'system',
        location: null
      }
    }).catch(err => console.error('添加系统跟进记录失败', err));
  },

  approve(e) {
    const { id, name } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认通过',
      content: `允许「${name}」查看该工地进度？`,
      success: (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '处理中...' });
        const db = wx.cloud.database();
        
        const userInfo = wx.getStorageSync('userInfo');
        const operatorName = userInfo ? userInfo.name : '管理员';
        
        db.collection('shareAccess').doc(id).update({
          data: { 
            status: 'approved',
            approvedAt: db.serverDate(),
            approvedBy: operatorName
          }
        }).then(() => {
          const now = new Date();
          const displayApprovedTime = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
          const requests = this.data.requests.map(r =>
            r._id === id ? { 
              ...r, 
              status: 'approved',
              approvedAt: now,
              approvedBy: operatorName,
              displayApprovedTime
            } : r
          );
          this.setData({ requests });
          wx.hideLoading();
          wx.showToast({ title: '已通过', icon: 'success' });
          // 通知申请人
          this._notifyApplicant(id, name, 'approved');
          // 写跟进记录
          this.addSystemFollowUp(`已同意访客「${name}」的工地进度查看申请。`);
        }).catch(() => {
          wx.hideLoading();
          wx.showToast({ title: '操作失败', icon: 'error' });
        });
      }
    });
  },

  reject(e) {
    const { id, name } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认拒绝',
      content: `拒绝「${name}」的查看申请？`,
      success: (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '处理中...' });
        const db = wx.cloud.database();
        db.collection('shareAccess').doc(id).update({
          data: { status: 'rejected' }
        }).then(() => {
          const requests = this.data.requests.map(r =>
            r._id === id ? { ...r, status: 'rejected' } : r
          );
          this.setData({ requests });
          wx.hideLoading();
          wx.showToast({ title: '已拒绝', icon: 'none' });
          // 通知申请人
          this._notifyApplicant(id, name, 'rejected');
          // 写跟进记录
          this.addSystemFollowUp(`已拒绝访客「${name}」的工地进度查看申请。`);
        }).catch(() => {
          wx.hideLoading();
          wx.showToast({ title: '操作失败', icon: 'error' });
        });
      }
    });
  },

  _notifyApplicant(requestId, applicantName, result) {
    const db = wx.cloud.database();
    db.collection('shareAccess').doc(requestId).get().then(res => {
      const request = res.data;
      if (!request || !request.openid) return;

      const address = (this.data.project.address || '工地').substring(0, 20);
      const statusText = result === 'approved' ? '已通过' : '已拒绝';
      const now = new Date();
      const nowStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      const { TEMPLATE_IDS } = require('../../utils/subscribe.js');
      const envVersion = wx.getAccountInfoSync().miniProgram.envVersion || 'release';
      const miniprogramState = envVersion === 'release' ? 'formal' : (envVersion === 'trial' ? 'trial' : 'developer');

      // 无论外部用户是否有 users 记录，都直接通过 openId 下发微信订阅消息
      wx.cloud.callFunction({
        name: 'sendSubscribeMessage',
        data: {
          openIds: [request.openid],
          templateId: TEMPLATE_IDS.SHARE_ACCESS_REQUEST,
          page: `/pages/projectShare/index?id=${this.data.projectId}`,
          miniprogramState,
          data: {
            thing1: { value: address.substring(0, 20) },
            time2: { value: nowStr },
            thing4: { value: '系统' },
            thing6: { value: '查看申请' },
            thing7: { value: `您的查看申请${statusText}`.substring(0, 20) }
          }
        }
      }).catch(console.error);

      // 查找该 openid 对应的 user（如果有），下发站内信
      db.collection('users').where({ openid: request.openid }).limit(1).get().then(userRes => {
        if (userRes.data.length === 0) return; // 外部用户没有 users 记录，则只发微信通知，不发站内信

        const userId = userRes.data[0]._id;
        const operatorName = wx.getStorageSync('userInfo')?.name || '管理员';
        db.collection('notifications').add({
          data: {
            userId: userId,
            targetUser: userRes.data[0].name || '未知',
            type: 'system',
            title: '查看申请结果',
            content: `【${operatorName}】${statusText}了您查看工地【${address}】的申请。`,
            senderName: operatorName,
            senderRole: wx.getStorageSync('userInfo')?.role || 'admin',
            link: `/pages/projectShare/index?id=${this.data.projectId}`,
            isRead: false,
            createTime: db.serverDate()
          }
        }).catch(() => {});
      }).catch(() => {});
    }).catch(() => {});
  }
});
