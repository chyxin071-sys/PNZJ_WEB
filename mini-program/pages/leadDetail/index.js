import { maskName, maskPhone, maskAddress } from '../../utils/format.js';
import { requestSubscribe, TEMPLATE_IDS } from '../../utils/subscribe.js';

function getNextWorkingDay(date) {
  let d = new Date(date);
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function calculateEndDate(startStr, durationDays) {
  let d = new Date(startStr.replace(/-/g, '/'));
  if (d.getDay() === 0 || d.getDay() === 6) d = getNextWorkingDay(d);
  let daysAdded = 0;
  while (daysAdded < durationDays - 1) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) daysAdded++;
  }
  return formatDate(d);
}

function recalculateDesignGantt(nodes, startDateStr) {
  if (!nodes || nodes.length === 0) return nodes;
  let currentStart = startDateStr;
  for (let i = 0; i < nodes.length; i++) {
    let node = nodes[i];
    if (node.status === 'completed') {
      currentStart = formatDate(getNextWorkingDay(new Date((node.actualEndDate || node.endDate).replace(/-/g, '/'))));
      node._displayDate = (node.actualEndDate || node.endDate).substring(5);
      continue;
    }

    // 如果用户手动指定了此节点的开始时间，且该时间晚于顺延的时间，则以此时间为准
    let startToUse = currentStart;
    if (node.manualStartDate) {
      startToUse = node.manualStartDate;
    }

    node.startDate = startToUse;
    // 增加短日期用于显示 (去掉年份)
    node._displayDate = startToUse ? startToUse.substring(5) : '';
    node.endDate = calculateEndDate(startToUse, Number(node.duration) || 1);
    currentStart = formatDate(getNextWorkingDay(new Date(node.endDate.replace(/-/g, '/'))));
  }
  return nodes;
}

// 统一的时间解析函数，兼容三种格式
function parseCreatedAtTime(createdAt) {
  if (!createdAt) return 0;

  // 格式1: { $date: 毫秒数 } - Web端写入
  if (typeof createdAt === 'object' && createdAt.$date) {
    const timestamp = typeof createdAt.$date === 'number' ? createdAt.$date : Number(createdAt.$date);
    if (!isNaN(timestamp)) return timestamp;
  }

  // 格式2: 纯数字时间戳 - 小程序 db.serverDate() 写入后读出
  if (typeof createdAt === 'number') {
    return createdAt;
  }

  // 格式3: 字符串格式 - 手动写入或 displayTime
  if (typeof createdAt === 'string') {
    const d = new Date(createdAt.replace(/-/g, '/'));
    if (!isNaN(d.getTime())) return d.getTime();
  }

  // 格式4: Date 对象
  if (createdAt instanceof Date) {
    return createdAt.getTime();
  }

  // 无法解析，返回0
  return 0;
}

Page({
  data: {
    leadId: '',
    lead: null,
    activeTab: 'info',
    followUps: [],
    quoteId: null,
    hasProject: false,
    isAdmin: false,
    isDesigner: false,
    isRelated: false,
    // 设计进度相关状态
    showStartDesignModal: false,
    designStartDate: '',
    showEditDesignModal: false,
    editDesignNodes: []
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ leadId: options.id });
      this.loadLeadData(options.id);
    }
    if (options.tab) {
      this.setData({ activeTab: options.tab });
    }
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo && userInfo.role === 'admin') {
      this.setData({ isAdmin: true });
    }
    if (userInfo && userInfo.role === 'designer') {
      this.setData({ isDesigner: true });
    }
  },

  onShow() {
    if (this.data.leadId) {
      this.loadLeadData(this.data.leadId);
      this.checkUnreadNotifications();
    }
  },

  checkUnreadNotifications() {
    if (!this.data.leadId) return;
    const db = wx.cloud.database();
    db.collection('leads').doc(this.data.leadId).get().then(res => {
      const lastFollowUpAt = res.data.lastFollowUpAt || 0;
      const lastReadAt = wx.getStorageSync('followup_read_' + this.data.leadId) || 0;
      const hasUnread = lastFollowUpAt > lastReadAt;
      this.setData({ hasUnreadFollowUp: hasUnread });
      if (this.data.activeTab === 'follow' && hasUnread) {
        this.markNotificationsAsRead();
      }
    }).catch(err => console.error('获取未读状态失败', err));
  },

  markNotificationsAsRead() {
    wx.setStorageSync('followup_read_' + this.data.leadId, Date.now());
    this.setData({ hasUnreadFollowUp: false });
  },

  loadLeadData(id) {
    wx.showNavigationBarLoading();
    const db = wx.cloud.database();
    
    // 并行发起所有独立查询以提高加载速度
    const leadPromise = db.collection('leads').doc(id).get();
    const quotePromise = db.collection('quotes').where({ leadId: id }).orderBy('createdAt', 'desc').limit(1).get().catch(() => ({ data: [] }));
    const projectPromise = db.collection('projects').where({ leadId: id }).limit(1).get().catch(() => ({ data: [] }));
    const followUpsPromise = db.collection('followUps').where({ leadId: id }).count().then(res => {
      const total = res.total;
      const MAX_LIMIT = 20;
      const batchTimes = Math.ceil(total / MAX_LIMIT);
      const tasks = [];
      for (let i = 0; i < batchTimes; i++) {
        tasks.push(db.collection('followUps').where({ leadId: id }).orderBy('createdAt', 'desc').skip(i * MAX_LIMIT).limit(MAX_LIMIT).get());
      }
      if (tasks.length === 0) return Promise.resolve({ data: [] });
      return Promise.all(tasks).then(resArr => ({ data: resArr.reduce((acc, cur) => acc.concat(cur.data), []) }));
    }).catch(() => ({ data: [] }));

    Promise.all([leadPromise, quotePromise, projectPromise, followUpsPromise]).then(([leadRes, quoteRes, projectRes, followRes]) => {
      wx.hideNavigationBarLoading();
      const userInfo = wx.getStorageSync('userInfo');
      const myName = userInfo ? userInfo.name : '';
      const isAdmin = userInfo && userInfo.role === 'admin';
      
      let lead = leadRes.data;
      const isAssignedToMe = isAdmin || lead.creatorName === myName || (lead.sales && lead.sales.includes(myName)) || (lead.designer && lead.designer.includes(myName)) || (lead.manager && lead.manager.includes(myName)) || lead.signer === myName;
      const isVisible = isAssignedToMe || lead.status === '已签单';

      // 格式化创建时间
      if (lead.createdAt) {
        const timestamp = parseCreatedAtTime(lead.createdAt);
        if (timestamp > 0) {
          const d = new Date(timestamp);
          lead.createdAt = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        }
      } else {
        lead.createdAt = '未知';
      }

      if (!isVisible) {
        lead._isMasked = true;
        lead.name = maskName(lead.name);
        lead.phone = maskPhone(lead.phone);
        lead.address = maskAddress(lead.address);
        if (lead.community) lead.community = maskAddress(lead.community);
      }

      this.setData({ 
        lead: lead,
        isAdmin,
        isRelated: isAssignedToMe,
        isVisible,
        ratingIndex: ['A', 'B', 'C', 'D'].indexOf(lead.rating) > -1 ? ['A', 'B', 'C', 'D'].indexOf(lead.rating) : 1,
        statusIndex: ['待跟进', '沟通中', '已量房', '方案阶段', '已交定金', '已签单', '已流失'].indexOf(lead.status) > -1 ? ['待跟进', '沟通中', '已量房', '方案阶段', '已交定金', '已签单', '已流失'].indexOf(lead.status) : 0
      });

      // 处理报价单
      if (quoteRes.data && quoteRes.data.length > 0) {
        this.setData({ quoteId: quoteRes.data[0]._id });
      } else {
        this.setData({ quoteId: null });
      }

      // 处理项目
      if (projectRes.data && projectRes.data.length > 0) {
        this.setData({ hasProject: true, projectId: projectRes.data[0]._id });
      } else {
        this.setData({ hasProject: false, projectId: null });
      }

      // 处理跟进记录（权限校验）
      if (!isAdmin && !isAssignedToMe) {
        this.setData({ followUps: [] });
      } else {
        const formattedList = followRes.data.map(item => {
          // 使用统一的时间解析函数
          const timestamp = parseCreatedAtTime(item.createdAt);
          if (timestamp > 0) {
            const d = new Date(timestamp);
            item.displayTime = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
            item._sortTimestamp = timestamp; // 用于排序的时间戳
          } else {
            item.displayTime = item.createdAt || '';
            item._sortTimestamp = 0;
          }
          return item;
        });

        // 使用时间戳排序，确保准确性
        formattedList.sort((a, b) => {
          return (b._sortTimestamp || 0) - (a._sortTimestamp || 0);
        });
        this.setData({ followUps: formattedList });
      }
    }).catch(err => {
      console.error('获取客户失败详情:', err);
      wx.hideNavigationBarLoading();
      wx.showToast({ title: '获取客户失败', icon: 'none' });
    });
  },

  checkQuoteStatus(leadId) {
    // 兼容保留该空方法以防别处调用
  },

  checkProjectStatus(leadId) {
    // 兼容保留该空方法以防别处调用
  },

  loadFollowUps(leadId) {
    // 兼容保留该空方法以防别处调用
    if (!this.data.isAdmin && !this.data.isRelated) return;
    const db = wx.cloud.database();
    db.collection('followUps').where({ leadId }).count().then(res => {
      const total = res.total;
      const MAX_LIMIT = 20;
      const batchTimes = Math.ceil(total / MAX_LIMIT);
      const tasks = [];
      for (let i = 0; i < batchTimes; i++) {
        tasks.push(db.collection('followUps').where({ leadId }).orderBy('createdAt', 'desc').skip(i * MAX_LIMIT).limit(MAX_LIMIT).get());
      }
      if (tasks.length === 0) return Promise.resolve([]);
      return Promise.all(tasks);
    }).then(resArr => {
      if (resArr.length === 0) {
        this.setData({ followUps: [] });
        return;
      }
      const allData = resArr.reduce((acc, cur) => acc.concat(cur.data), []);
      const formattedList = allData.map(item => {
        // 使用统一的时间解析函数
        const timestamp = parseCreatedAtTime(item.createdAt);
        if (timestamp > 0) {
          const d = new Date(timestamp);
          item.displayTime = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
          item._sortTimestamp = timestamp;
        } else {
          item.displayTime = item.createdAt || '';
          item._sortTimestamp = 0;
        }
        return item;
      });

      // 使用时间戳排序
      formattedList.sort((a, b) => {
        return (b._sortTimestamp || 0) - (a._sortTimestamp || 0);
      });
      this.setData({ followUps: formattedList });
    }).catch(() => {});
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
    
    if (tab === 'follow') {
      this.markNotificationsAsRead();
    }
  },

  callPhone() {
    if (this.data.lead && this.data.lead.phone) {
      wx.makePhoneCall({ phoneNumber: this.data.lead.phone });
    }
  },

  goToQuote() {
    if (!this.data.isVisible) {
      return wx.showToast({ title: '无权限查看', icon: 'none' });
    }
    if (this.data.quoteId) {
      wx.navigateTo({ url: `/pages/quoteDetail/index?id=${this.data.quoteId}` });
    } else {
      if (!this.data.isAdmin && !this.data.isRelated) {
        return wx.showToast({ title: '暂无报价单', icon: 'none' });
      }
      wx.navigateTo({ url: `/pages/quoteDetail/index?leadId=${this.data.leadId}` });
    }
  },

  goToProjectFiles() {
    if (!this.data.isVisible) {
      return wx.showToast({ title: '无权限查看', icon: 'none' });
    }
    wx.navigateTo({ url: `/pages/projectFiles/index?leadId=${this.data.leadId}` });
  },

  goToProject() {
    if (!this.data.isVisible) {
      return wx.showToast({ title: '无权限查看', icon: 'none' });
    }
    // 检查是否有工地，如果有则跳详情，没有则跳列表（列表带有 filter）
    const db = wx.cloud.database();
    db.collection('projects').where({ leadId: this.data.leadId }).limit(1).get().then(res => {
      if (res.data && res.data.length > 0) {
        wx.navigateTo({ url: `/pages/projectDetail/index?id=${res.data[0]._id}` });
      } else {
        if (!this.data.isAdmin && !this.data.isRelated) {
          return wx.showToast({ title: '暂无工地', icon: 'none' });
        }
        // 如果没有工地，跳转到工地列表并带有创建指令，自动弹出新建浮窗
        wx.navigateTo({ url: `/pages/projects/index?leadId=${this.data.leadId}&action=create` });
      }
    }).catch(() => {
      if (!this.data.isAdmin && !this.data.isRelated) {
        return wx.showToast({ title: '暂无工地', icon: 'none' });
      }
      wx.navigateTo({ url: `/pages/projects/index?leadId=${this.data.leadId}&action=create` });
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

  async onStatusChange(e) {
    if (!this.data.isAdmin && !this.data.isRelated) {
      return wx.showToast({ title: '无修改权限', icon: 'none' });
    }
    const statuses = ['待跟进', '沟通中', '已量房', '方案阶段', '已交定金', '已签单', '已流失'];
    const newStatus = statuses[e.detail.value];
    if (newStatus === this.data.lead.status) return;

    // 静默请求订阅授权
    await requestSubscribe();

    if (newStatus === '已签单') {
      const userInfo = wx.getStorageSync('userInfo');
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const hh = String(today.getHours()).padStart(2, '0');
      const min = String(today.getMinutes()).padStart(2, '0');
      const signDay = `${yyyy}-${mm}-${dd}`;
      const signTime = `${hh}:${min}`;
      
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
          signDay: signDay,
          signTime: signTime,
          signersList: signersList,
          signerIndex: signerIndex,
          signer: signersList.length > 0 ? signersList[signerIndex] : currentUserName
        });
        if (typeof this.getTabBar === 'function' && this.getTabBar()) {
          this.getTabBar().setData({ showMask: true });
        }
      }).catch(err => {
        // Fallback
        this.setData({
          showSignModal: true,
          signDay: signDay,
          signTime: signTime,
          signersList: [userInfo ? userInfo.name : '未知'],
          signerIndex: 0,
          signer: userInfo ? userInfo.name : '未知'
        });
        if (typeof this.getTabBar === 'function' && this.getTabBar()) {
          this.getTabBar().setData({ showMask: true });
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
        createdAt: db.serverDate(),
        displayTime: nowStr,
        timestamp: db.serverDate()
      }
    }).then(() => {
      this.loadFollowUps(this.data.leadId);

      // 更新客户的 lastFollowUp 和 lastFollowUpAt 字段
      db.collection('leads').doc(this.data.leadId).update({
        data: { lastFollowUp: nowStr, lastFollowUpAt: Date.now() }
      }).catch(err => {
        console.error('更新lastFollowUp失败', err);
      });

      // 发送系统记录通知
      const lead = this.data.lead;
      if (lead) {
        const notifyUsers = new Set();
        if (lead.sales && lead.sales !== operatorName) notifyUsers.add(lead.sales);
        if (lead.designer && lead.designer !== operatorName) notifyUsers.add(lead.designer);
        if (lead.manager && lead.manager !== operatorName) notifyUsers.add(lead.manager);
        if (lead.creatorName && lead.creatorName !== operatorName) notifyUsers.add(lead.creatorName);

        notifyUsers.forEach(u => {
          if (!u) return;
          db.collection('notifications').add({
            data: {
              type: 'lead',
              title: '客户进度更新',
              content: `${operatorName} 更新了客户【${lead.name}】的记录：${content.substring(0, 30)}...`,
              senderName: operatorName,
              senderRole: userInfo.role || 'default',
              targetUser: u,
              isRead: false,
              createTime: db.serverDate(),
              link: `/pages/leadDetail/index?id=${this.data.leadId}`
            }
          });
        });

        if (operatorName !== 'admin' && !this.data.isAdmin) {
          db.collection('users').where({ role: 'admin' }).get().then(res => {
            res.data.forEach(u => {
              db.collection('notifications').add({
                data: {
                  type: 'lead',
                  title: '客户进度更新',
                  content: `${operatorName} 更新了客户【${lead.name}】的记录：${content.substring(0, 30)}...`,
                  senderName: operatorName,
                  senderRole: userInfo.role || 'default',
                  targetUser: u.name,
                  isRead: false,
                  createTime: db.serverDate(),
                  link: `/pages/leadDetail/index?id=${this.data.leadId}`
                }
              });
            });
          });
        }
      }
    });
  },

  onSignDayChange(e) {
    this.setData({ signDay: e.detail.value });
  },

  onSignTimeChange(e) {
    this.setData({ signTime: e.detail.value });
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
    const tabbar = this.getTabBar();
    if (tabbar) tabbar.setData({ showMask: false });
  },

  confirmSign() {
    const { signDay, signTime, signer } = this.data;
    if (!signDay || !signTime || !signer) {
      return wx.showToast({ title: '请填写完整的签单时间和签单人', icon: 'none' });
    }
    const signDate = `${signDay} ${signTime}`;

    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ showMask: false });
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

      // 签单通知 (全员)
      const db2 = wx.cloud.database();
      const lead = this.data.lead;
      db2.collection('users').where({ isActive: true }).limit(100).get().then(res => {
        const users = res.data;
        const nowStr = new Date().toISOString().split('T')[0];
        
        users.forEach(u => {
          db2.collection('notifications').add({
            data: {
              type: 'lead', title: '🎉 恭喜开单',
              content: `好消息！客户【${lead.name}】已成功签单，大家再接再厉！`,
              targetUser: u.name, isRead: false, createTime: db2.serverDate(),
              link: `/pages/leadDetail/index?id=${this.data.leadId}`
            }
          });

          // 微信订阅消息
          wx.cloud.callFunction({
            name: 'sendSubscribeMessage',
            data: {
              receiverUserId: u._id,
              templateId: TEMPLATE_IDS.PROJECT_UPDATE,
              page: `/pages/leadDetail/index?id=${this.data.leadId}`,
              data: {
                thing1: { value: (lead.name || '未知客户').substring(0, 20) },
                time2: { value: nowStr },
                thing4: { value: (signer || '系统').substring(0, 20) },
                thing6: { value: '好消息！客户已成功签单' },
                thing7: { value: '大家再接再厉！' }
              }
            }
          }).catch(console.error);
        });
      }).catch(err => {
        console.error('发送签单通知失败', err);
      });

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
      this.setData({ [`lead.${field}`]: value });
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '修改失败', icon: 'none' });
    });
  },

  // ===================== 设计进度模块 =====================
  openStartDesignModal() {
    const userInfo = wx.getStorageSync('userInfo');
    const userRole = userInfo ? userInfo.role : '';
    if (userRole !== 'designer' && userRole !== 'admin') {
      return wx.showToast({ title: '仅设计师可开启设计工作流', icon: 'none' });
    }
    // 默认的节点列表
    const defaultNodes = [
      { name: "平面布局", duration: 2 },
      { name: "效果图渲染", duration: 5 },
      { name: "施工图深化", duration: 3 },
      { name: "定制图纸绘制", duration: 5 }
    ];

    const todayStr = new Date().toISOString().split('T')[0];

    // 初始化节点
    let initialNodes = defaultNodes.map((n, i) => ({
      id: Date.now() + i,
      name: n.name,
      duration: n.duration,
      status: i === 0 ? 'current' : 'pending'
    }));
    
    // 自动计算一次时间，让界面有初始默认值展示
    initialNodes = recalculateDesignGantt(initialNodes, todayStr);

    this.setData({
      showStartDesignModal: true,
      designStartDate: todayStr,
      editDesignNodes: initialNodes
    });
  },

  onEditNodeStartDate(e) {
    const idx = e.currentTarget.dataset.index;
    const selectedDate = e.detail.value;
    
    let nodes = this.data.editDesignNodes;
    nodes[idx].manualStartDate = selectedDate;
    
    // 选完日期后立即重算展示
    const startDateToUse = this.data.lead && this.data.lead.designStartDate ? this.data.lead.designStartDate : this.data.designStartDate;
    nodes = recalculateDesignGantt(nodes, startDateToUse);
    
    this.setData({ editDesignNodes: nodes });
  },

  onDesignStartDateChange(e) {
    const selectedDate = e.detail.value;
    let nodes = this.data.editDesignNodes;
    nodes = recalculateDesignGantt(nodes, selectedDate);
    this.setData({ designStartDate: selectedDate, editDesignNodes: nodes });
  },

  closeStartDesignModal() {
    this.setData({ showStartDesignModal: false });
  },

  async confirmStartDesign() {
    if (!this.data.designStartDate) return wx.showToast({ title: '请选择日期', icon: 'none' });

    let nodes = this.data.editDesignNodes;
    if (nodes.length === 0) return wx.showToast({ title: '请至少保留一个节点', icon: 'none' });

    // 静默请求订阅授权
    await requestSubscribe();

    // 确保第一个节点是 current
    nodes.forEach(n => n.status = 'pending');
    nodes[0].status = 'current';

    nodes = recalculateDesignGantt(nodes, this.data.designStartDate);

    wx.showLoading({ title: '正在开启...' });
    const db = wx.cloud.database();
    db.collection('leads').doc(this.data.leadId).update({
      data: { designNodes: nodes, designStartDate: this.data.designStartDate }
    }).then(() => {
      this.setData({
        'lead.designNodes': nodes,
        'lead.designStartDate': this.data.designStartDate,
        showStartDesignModal: false
      });
      wx.hideLoading();
      wx.showToast({ title: '工作流已开启', icon: 'success' });
      const startNode = nodes[0];
      const endNode = nodes[nodes.length - 1];
      this.addSystemFollowUp(`开启设计出图工作流\n预计开始：${startNode.startDate}\n预计结束：${endNode.endDate}`);

      // 发送通知给关联设计师和所有管理员
      this.notifyDesignStart();
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '操作失败', icon: 'none' });
    });
  },

  openEditDesignModal() {
    const userInfo = wx.getStorageSync('userInfo');
    const userRole = userInfo ? userInfo.role : '';
    if (userRole !== 'designer' && userRole !== 'admin') {
      return wx.showToast({ title: '仅设计师可编辑设计排期', icon: 'none' });
    }
    if (!this.data.lead || !this.data.lead.designNodes) return;
    
    let nodes = JSON.parse(JSON.stringify(this.data.lead.designNodes));
    const startDateToUse = this.data.lead.designStartDate || new Date().toISOString().split('T')[0];
    
    // 强制重算一次，补齐所有缺失的字段（如 _displayDate 等）
    nodes = recalculateDesignGantt(nodes, startDateToUse);
    
    this.setData({
      showEditDesignModal: true,
      editDesignNodes: nodes
    });
  },

  closeEditDesignModal() {
    this.setData({ showEditDesignModal: false });
  },

  onEditNodeName(e) {
    const idx = e.currentTarget.dataset.index;
    this.setData({ [`editDesignNodes[${idx}].name`]: e.detail.value });
  },

  onEditNodeDur(e) {
    const idx = e.currentTarget.dataset.index;
    let nodes = this.data.editDesignNodes;
    const val = e.detail.value;

    // 允许暂时为空，方便用户删除后重新输入
    if (val === '') {
      nodes[idx].duration = '';
      this.setData({ editDesignNodes: nodes });
      return;
    }

    const numVal = parseInt(val);
    if (isNaN(numVal) || numVal < 1) {
      nodes[idx].duration = 1;
    } else {
      nodes[idx].duration = numVal;
    }

    // 重算排期
    const startDateToUse = this.data.lead && this.data.lead.designStartDate ? this.data.lead.designStartDate : this.data.designStartDate;
    nodes = recalculateDesignGantt(nodes, startDateToUse);

    this.setData({ editDesignNodes: nodes });
  },

  addDesignNode() {
    let nodes = this.data.editDesignNodes;
    nodes.push({
      id: Date.now() + Math.random(),
      name: '新设计节点',
      duration: 1,
      status: 'pending'
    });
    
    const startDateToUse = this.data.lead && this.data.lead.designStartDate ? this.data.lead.designStartDate : this.data.designStartDate;
    nodes = recalculateDesignGantt(nodes, startDateToUse);
    
    this.setData({ editDesignNodes: nodes });
  },

  removeDesignNode(e) {
    const idx = e.currentTarget.dataset.index;
    const nodes = this.data.editDesignNodes;
    if (nodes[idx].status === 'completed') {
      return wx.showToast({ title: '已完成节点无法删除', icon: 'none' });
    }
    nodes.splice(idx, 1);
    
    // 删除后重算排期
    const startDateToUse = this.data.lead && this.data.lead.designStartDate ? this.data.lead.designStartDate : this.data.designStartDate;
    const recalculatedNodes = recalculateDesignGantt(nodes, startDateToUse);
    
    this.setData({ editDesignNodes: recalculatedNodes });
  },

  confirmEditDesign() {
    const nodes = this.data.editDesignNodes;
    if (nodes.length === 0) return wx.showToast({ title: '至少保留一个节点', icon: 'none' });
    
    // 确保如果有待办节点，至少有一个是 current
    const hasCurrent = nodes.some(n => n.status === 'current');
    if (!hasCurrent) {
      const firstPending = nodes.find(n => n.status === 'pending');
      if (firstPending) firstPending.status = 'current';
    }

    const startNode = nodes.find(n => n.status !== 'completed');
    const startDateToUse = startNode ? (startNode.startDate || this.data.lead.designStartDate || new Date().toISOString().split('T')[0]) : this.data.lead.designStartDate;

    const recalculatedNodes = recalculateDesignGantt(nodes, this.data.lead.designStartDate || startDateToUse);

    wx.showLoading({ title: '保存中...' });
    const db = wx.cloud.database();
    db.collection('leads').doc(this.data.leadId).update({
      data: { designNodes: recalculatedNodes }
    }).then(() => {
      this.setData({
        'lead.designNodes': recalculatedNodes,
        showEditDesignModal: false
      });
      wx.hideLoading();
      wx.showToast({ title: '排期已更新', icon: 'success' });
      const startNode = recalculatedNodes[0];
      const endNode = recalculatedNodes[recalculatedNodes.length - 1];
      this.addSystemFollowUp(`调整了设计出图排期\n预计开始：${startNode.startDate}\n预计结束：${endNode.endDate}`);

      // 增加通知：排期被修改时通知其他相关人员
      const userInfo = wx.getStorageSync('userInfo');
      const operatorName = userInfo ? (userInfo.name || '未知') : '未知';
      const notifyUsers = new Set();
      if (this.data.lead.sales && this.data.lead.sales !== operatorName) notifyUsers.add(this.data.lead.sales);
      if (this.data.lead.creatorName && this.data.lead.creatorName !== operatorName) notifyUsers.add(this.data.lead.creatorName);

      db.collection('users').where({ role: 'admin' }).get().then(res => {
        res.data.forEach(u => {
          if (u.name !== operatorName) notifyUsers.add(u.name);
        });
        notifyUsers.forEach(u => {
          if (!u) return;
          db.collection('notifications').add({
            data: {
              type: 'lead',
              title: '设计排期更新',
              content: `${operatorName} 调整了客户【${this.data.lead.name}】的设计出图排期。`,
              senderName: operatorName,
              senderRole: userInfo.role || 'default',
              targetUser: u,
              isRead: false,
              createTime: db.serverDate(),
              link: `/pages/leadDetail/index?id=${this.data.leadId}`
            }
          });
        });
      });
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
    });
  },

  async openFillDelayReason(e) {
    const idx = e.currentTarget.dataset.index;
    const existingReason = this.data.lead.designNodes[idx].delayReason || '';
    this.setData({
      showDesignCompleteModal: true,
      designCompleteIdx: idx,
      designDelayReason: existingReason
    });
  },

  async completeDesignNode(e) {
    const userInfo = wx.getStorageSync('userInfo');
    const userRole = userInfo ? userInfo.role : '';
    if (userRole !== 'designer' && userRole !== 'admin') {
      return wx.showToast({ title: '仅设计师可完成设计节点', icon: 'none' });
    }

    // 静默请求订阅授权
    await requestSubscribe();

    const idx = e.currentTarget.dataset.index;
    const nowStr = new Date().toISOString().split('T')[0];

    // 弹窗让用户选择实际完成日期
    this.setData({
      showDesignCompleteDateModal: true,
      designCompleteIdx: idx,
      designCompleteDate: nowStr
    });
  },

  onDesignCompleteDateChange(e) {
    this.setData({ designCompleteDate: e.detail.value });
  },

  closeDesignCompleteDateModal() {
    this.setData({ showDesignCompleteDateModal: false });
  },

  confirmDesignCompleteWithDate() {
    const idx = this.data.designCompleteIdx;
    const actualEndDate = this.data.designCompleteDate;
    let nodes = JSON.parse(JSON.stringify(this.data.lead.designNodes));
    const nodeName = nodes[idx].name;

    nodes[idx].status = 'completed';
    nodes[idx].actualEndDate = actualEndDate;

    // 设置实际开始时间（如果还没有）
    if (!nodes[idx].actualStartDate) {
      nodes[idx].actualStartDate = nodes[idx].startDate;
    }

    if (idx + 1 < nodes.length) {
      nodes[idx + 1].status = 'current';
      nodes[idx + 1].startDate = actualEndDate;
      nodes[idx + 1].actualStartDate = actualEndDate;
    }

    nodes = recalculateDesignGantt(nodes, this.data.lead.designStartDate || actualEndDate);

    wx.showLoading({ title: '处理中...' });
    const db = wx.cloud.database();
    db.collection('leads').doc(this.data.leadId).update({
      data: { designNodes: nodes }
    }).then(() => {
      this.setData({
        'lead.designNodes': nodes,
        showDesignCompleteDateModal: false
      });
      wx.hideLoading();
      wx.showToast({ title: '节点已完成', icon: 'success' });

      // 联动1：系统跟进记录
      const nextNode = idx + 1 < nodes.length ? nodes[idx + 1] : null;
      let followContent = `已完成设计出图节点：【${nodeName}】（实际完成：${actualEndDate}）`;
      if (nextNode) followContent += `\n下一阶段：【${nextNode.name}】，预计完成：${nextNode.endDate}`;
      else followContent += '\n所有设计出图节点已全部完成 🎉';
      this.addSystemFollowUp(followContent);

      // 联动2：消息通知
      this.notifyDesignComplete(nodeName);

    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '操作失败', icon: 'none' });
    });
  },

  onDesignDelayReasonInput(e) {
    this.setData({ designDelayReason: e.detail.value });
  },

  closeDesignCompleteModal() {
    this.setData({ showDesignCompleteModal: false });
  },

  confirmDesignComplete() {
    const reason = this.data.designDelayReason.trim();
    if (!reason) {
      return wx.showToast({ title: '请输入逾期原因', icon: 'none' });
    }
    
    const idx = this.data.designCompleteIdx;
    let nodes = JSON.parse(JSON.stringify(this.data.lead.designNodes));
    
    nodes[idx].delayReason = reason;

    wx.showLoading({ title: '保存中...' });
    const db = wx.cloud.database();
    db.collection('leads').doc(this.data.leadId).update({
      data: { designNodes: nodes }
    }).then(() => {
      this.setData({
        'lead.designNodes': nodes,
        showDesignCompleteModal: false
      });
      wx.hideLoading();
      wx.showToast({ title: '已补充逾期原因', icon: 'success' });
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
    });
  },

  notifyDesignComplete(nodeName) {
    const db = wx.cloud.database();
    const lead = this.data.lead;
    const userInfo = wx.getStorageSync('userInfo');
    const operatorName = userInfo ? (userInfo.name || '未知') : '未知';
    
    const notifyUsers = new Set();
    if (lead.sales && lead.sales !== operatorName) notifyUsers.add(lead.sales);
    if (lead.creatorName && lead.creatorName !== operatorName) notifyUsers.add(lead.creatorName);

    db.collection('users').where({ role: 'admin' }).get().then(res => {
      res.data.forEach(u => {
        if (u.name !== operatorName) notifyUsers.add(u.name);
      });
      notifyUsers.forEach(u => {
        if (!u) return;
        db.collection('notifications').add({
          data: {
            type: 'lead',
            title: '设计进度更新',
            content: `${operatorName} 已完成客户【${lead.name}】的【${nodeName}】出图工作。`,
            senderName: operatorName,
            senderRole: userInfo.role || 'default',
            targetUser: u,
            isRead: false,
            createTime: db.serverDate(),
            link: `/pages/leadDetail/index?id=${this.data.leadId}`
          }
        });
      });
    });
  },

  notifyDesignStart() {
    const db = wx.cloud.database();
    const lead = this.data.lead;
    const userInfo = wx.getStorageSync('userInfo');
    const operatorName = userInfo ? (userInfo.name || '未知') : '未知';
    
    const notifyUsers = new Set();
    if (lead.designer && lead.designer !== operatorName) notifyUsers.add(lead.designer);
    // 添加所有管理员
    db.collection('users').where({ role: 'admin' }).get().then(res => {
      res.data.forEach(u => {
        if (u.name !== operatorName) notifyUsers.add(u.name);
      });
      // 发送通知
      notifyUsers.forEach(u => {
        if (!u) return;
        db.collection('notifications').add({
          data: {
            type: 'lead',
            title: '设计工作流已开启',
            content: `${operatorName} 为客户【${lead.name}】开启了设计出图工作流，请及时跟进。`,
            senderName: operatorName,
            senderRole: userInfo.role || 'default',
            targetUser: u,
            isRead: false,
            createTime: db.serverDate(),
            link: `/pages/leadDetail/index?id=${this.data.leadId}`
          }
        });
      });
    }).catch(err => {
      console.error('发送设计开启通知失败', err);
    });
  }
});