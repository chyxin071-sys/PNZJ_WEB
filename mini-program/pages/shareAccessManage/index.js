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
        return { ...r, displayTime };
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

  approve(e) {
    const { id, name } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认通过',
      content: `允许「${name}」查看该工地进度？`,
      success: (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '处理中...' });
        const db = wx.cloud.database();
        db.collection('shareAccess').doc(id).update({
          data: { status: 'approved' }
        }).then(() => {
          const requests = this.data.requests.map(r =>
            r._id === id ? { ...r, status: 'approved' } : r
          );
          this.setData({ requests });
          wx.hideLoading();
          wx.showToast({ title: '已通过', icon: 'success' });
          // 通知申请人
          this._notifyApplicant(id, name, 'approved');
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

      // 查找该 openid 对应的 user（如果有）
      db.collection('users').where({ openid: request.openid }).limit(1).get().then(userRes => {
        if (userRes.data.length === 0) return; // 外部用户没有 users 记录，暂不通知

        const userId = userRes.data[0]._id;
        wx.cloud.callFunction({
          name: 'sendSubscribeMessage',
          data: {
            receiverUserId: userId,
            templateId: TEMPLATE_IDS.SHARE_ACCESS_REQUEST,
            page: `/pages/projectShare/index?id=${this.data.projectId}`,
            data: {
              time1: { value: nowStr },
              thing2: { value: `您的查看申请${statusText} | 工地：${address}` }
            }
          }
        }).catch(() => {});
      }).catch(() => {});
    }).catch(() => {});
  }
});
