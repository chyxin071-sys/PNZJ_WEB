import { maskName, maskPhone, maskAddress } from '../../utils/format.js';
import { requestSubscribe, TEMPLATE_IDS } from '../../utils/subscribe.js';

function getNextWorkingDay(date) {
  let d = new Date(date);
  d.setDate(d.getDate() + 1);
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
  let daysAdded = 0;
  while (daysAdded < durationDays - 1) {
    d.setDate(d.getDate() + 1);
    daysAdded++;
  }
  return formatDate(d);
}

function recalculateDesignGantt(nodes) {
  if (!nodes || nodes.length === 0) return nodes;
  for (let i = 0; i < nodes.length; i++) {
    let node = nodes[i];
    
    // 如果没有预计开始时间，则不显示短日期
    let startToUse = node.startDate || '';
    node._displayDate = startToUse ? startToUse.substring(5) : '';
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
    editDesignNodes: [],
    designNodeOptions: ['平面布局', '效果图渲染', '施工图深化', '定制图纸绘制', '自定义'],
    
    // 文件夹上传相关状态
    showFolderSelectModal: false,
    tempUploadFiles: [],
    currentUploadNodeIndex: 0,
    uploadSourceType: '',
    folders: ['默认文件夹'],
    selectedFolderIndex: 0,
    newFolderName: '',
    uploadVisibility: 'internal'
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
      { name: "平面布局", isCustom: false, nameIndex: 0 },
    ];

    const todayStr = new Date().toISOString().split('T')[0];

    // 初始化节点
    let initialNodes = defaultNodes.map((n, i) => ({
      id: Date.now() + i,
      name: n.name,
      isCustom: n.isCustom,
      nameIndex: n.nameIndex,
      startDate: todayStr,
      endDate: todayStr,
      status: 'pending'
    }));
    
    // 自动计算一次时间，让界面有初始默认值展示
    initialNodes = recalculateDesignGantt(initialNodes);

    this.setData({
      showStartDesignModal: true,
      editDesignNodes: initialNodes
    });
  },

  onEditNodeNamePicker(e) {
    const idx = e.currentTarget.dataset.index;
    const valIdx = e.detail.value;
    const valStr = this.data.designNodeOptions[valIdx];
    let nodes = this.data.editDesignNodes;
    
    if (valStr === '自定义') {
      nodes[idx].isCustom = true;
      nodes[idx].name = '';
    } else {
      nodes[idx].isCustom = false;
      nodes[idx].name = valStr;
    }
    nodes[idx].nameIndex = valIdx;
    
    this.setData({ editDesignNodes: nodes });
  },

  onEditNodeName(e) {
    const idx = e.currentTarget.dataset.index;
    this.setData({ [`editDesignNodes[${idx}].name`]: e.detail.value });
  },

  onEditNodeStartDate(e) {
    const idx = e.currentTarget.dataset.index;
    const selectedDate = e.detail.value;
    let nodes = this.data.editDesignNodes;
    nodes[idx].startDate = selectedDate;
    nodes = recalculateDesignGantt(nodes);
    this.setData({ editDesignNodes: nodes });
  },

  onEditNodeEndDate(e) {
    const idx = e.currentTarget.dataset.index;
    const selectedDate = e.detail.value;
    let nodes = this.data.editDesignNodes;
    nodes[idx].endDate = selectedDate;
    nodes = recalculateDesignGantt(nodes);
    this.setData({ editDesignNodes: nodes });
  },

  onDesignStartDateChange(e) {
    const selectedDate = e.detail.value;
    let nodes = this.data.editDesignNodes;
    this.setData({ designStartDate: selectedDate, editDesignNodes: nodes });
  },

  closeStartDesignModal() {
    this.setData({ showStartDesignModal: false });
  },

  async confirmStartDesign() {
    let nodes = this.data.editDesignNodes;
    if (nodes.length === 0) return wx.showToast({ title: '请至少保留一个节点', icon: 'none' });

    // 检查自定义名称是否为空
    const hasEmptyName = nodes.some(n => !n.name || n.name.trim() === '');
    if (hasEmptyName) return wx.showToast({ title: '节点名称不能为空', icon: 'none' });

    // 检查日期是否填写
    const hasEmptyDate = nodes.some(n => !n.startDate || !n.endDate);
    if (hasEmptyDate) return wx.showToast({ title: '请选择预计开始和完成日期', icon: 'none' });

    // 检查日期是否合理
    const hasInvalidDate = nodes.some(n => new Date(n.startDate) > new Date(n.endDate));
    if (hasInvalidDate) return wx.showToast({ title: '开始时间不能晚于结束时间', icon: 'none' });

    // 静默请求订阅授权
    await requestSubscribe();

    nodes.forEach(n => n.status = 'pending');

    nodes = recalculateDesignGantt(nodes);
    const designStartDate = nodes[0].startDate;

    wx.showLoading({ title: '正在开启...' });
    const db = wx.cloud.database();
    db.collection('leads').doc(this.data.leadId).update({
      data: { designNodes: nodes, designStartDate: designStartDate }
    }).then(() => {
      this.setData({
        'lead.designNodes': nodes,
        'lead.designStartDate': designStartDate,
        showStartDesignModal: false
      });
      wx.hideLoading();
      wx.showToast({ title: '工作流已设定', icon: 'success' });
      const startNode = nodes[0];
      const endNode = nodes[nodes.length - 1];
      this.addSystemFollowUp(`设定设计出图工作流\n预计开始：${startNode.startDate}\n预计结束：${endNode.endDate}`);

      // 发送通知给关联设计师和所有管理员
      this.notifyDesignStart();
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '操作失败', icon: 'none' });
    });
  },

  openAddDesignNodeModal() {
    const userInfo = wx.getStorageSync('userInfo');
    const userRole = userInfo ? userInfo.role : '';
    if (userRole !== 'designer' && userRole !== 'admin') {
      return wx.showToast({ title: '仅设计师可添加设计节点', icon: 'none' });
    }
    if (!this.data.lead || !this.data.lead.designNodes) return;
    
    const todayStr = new Date().toISOString().split('T')[0];
    this.setData({
      showAddDesignNodeModal: true,
      addNodeData: {
        name: this.data.designNodeOptions[0],
        isCustom: false,
        nameIndex: 0,
        startDate: todayStr,
        endDate: todayStr
      }
    });
  },

  closeAddDesignNodeModal() {
    this.setData({ showAddDesignNodeModal: false });
  },

  onAddNodeNamePicker(e) {
    const valIdx = e.detail.value;
    const valStr = this.data.designNodeOptions[valIdx];
    let nodeData = this.data.addNodeData;
    
    if (valStr === '自定义') {
      nodeData.isCustom = true;
      nodeData.name = '';
    } else {
      nodeData.isCustom = false;
      nodeData.name = valStr;
    }
    nodeData.nameIndex = valIdx;
    
    this.setData({ addNodeData: nodeData });
  },

  onAddNodeName(e) {
    this.setData({ 'addNodeData.name': e.detail.value });
  },

  onAddNodeStartDate(e) {
    this.setData({ 'addNodeData.startDate': e.detail.value });
  },

  onAddNodeEndDate(e) {
    this.setData({ 'addNodeData.endDate': e.detail.value });
  },

  async confirmAddDesignNode() {
    let nodeData = this.data.addNodeData;
    
    if (nodeData.isCustom && (!nodeData.name || nodeData.name.trim() === '')) {
      return wx.showToast({ title: '节点名称不能为空', icon: 'none' });
    }
    if (!nodeData.startDate || !nodeData.endDate) {
      return wx.showToast({ title: '请选择预计开始和完成日期', icon: 'none' });
    }
    if (new Date(nodeData.startDate) > new Date(nodeData.endDate)) {
      return wx.showToast({ title: '开始时间不能晚于结束时间', icon: 'none' });
    }

    // 静默请求订阅授权
    await requestSubscribe();

    let nodes = JSON.parse(JSON.stringify(this.data.lead.designNodes || []));
    nodes.push({
      id: Date.now() + Math.random(),
      name: nodeData.name,
      isCustom: nodeData.isCustom,
      nameIndex: nodeData.nameIndex,
      startDate: nodeData.startDate,
      endDate: nodeData.endDate,
      status: 'pending'
    });

    nodes = recalculateDesignGantt(nodes);

    wx.showLoading({ title: '正在添加...' });
    const db = wx.cloud.database();
    db.collection('leads').doc(this.data.leadId).update({
      data: { designNodes: nodes }
    }).then(res => {
      this.setData({
        'lead.designNodes': nodes,
        showAddDesignNodeModal: false
      });
      wx.hideLoading();
      wx.showToast({ title: '节点已添加', icon: 'success' });
      this.addSystemFollowUp(`添加了设计节点：${nodeData.name}\n排期：${nodeData.startDate} 至 ${nodeData.endDate}`);
      this.notifyDesignAction(`为客户【${this.data.lead.name}】添加了设计节点：【${nodeData.name}】(排期：${nodeData.startDate} 至 ${nodeData.endDate})。`);
    }).catch((err) => {
      console.error('Add design node failed:', err);
      wx.hideLoading();
      wx.showToast({ title: '添加失败，请重试', icon: 'none' });
    });
  },

  async deleteDesignNode(e) {
    const userInfo = wx.getStorageSync('userInfo');
    const userRole = userInfo ? userInfo.role : '';
    if (userRole !== 'designer' && userRole !== 'admin') {
      return wx.showToast({ title: '仅设计师可删除节点', icon: 'none' });
    }

    const idx = e.currentTarget.dataset.index;
    let nodes = JSON.parse(JSON.stringify(this.data.lead.designNodes));
    
    if (nodes[idx].status !== 'pending') {
      return wx.showToast({ title: '只能删除未开始的节点', icon: 'none' });
    }

    const nodeName = nodes[idx].name;

    wx.showModal({
      title: '删除确认',
      content: `确定要删除节点【${nodeName}】吗？`,
      success: async (res) => {
        if (res.confirm) {
          // 静默请求订阅授权
          await requestSubscribe();

          nodes.splice(idx, 1);
          nodes = recalculateDesignGantt(nodes);

          wx.showLoading({ title: '正在删除...' });
          const db = wx.cloud.database();
          db.collection('leads').doc(this.data.leadId).update({
            data: { designNodes: nodes }
          }).then(updateRes => {
            this.setData({ 'lead.designNodes': nodes });
            wx.hideLoading();
            wx.showToast({ title: '节点已删除', icon: 'success' });
            this.addSystemFollowUp(`删除了设计节点：${nodeName}`);
            this.notifyDesignAction(`删除了客户【${this.data.lead.name}】的设计节点：【${nodeName}】。`);
          }).catch((err) => {
            console.error('Delete design node failed:', err);
            wx.hideLoading();
            wx.showToast({ title: '删除失败，请重试', icon: 'none' });
          });
        }
      }
    });
  },

  openEditDesignNodeModal(e) {
    const userInfo = wx.getStorageSync('userInfo');
    const userRole = userInfo ? userInfo.role : '';
    if (userRole !== 'designer' && userRole !== 'admin') {
      return wx.showToast({ title: '仅设计师可编辑节点', icon: 'none' });
    }

    const idx = e.currentTarget.dataset.index;
    let nodes = this.data.lead.designNodes;
    
    if (nodes[idx].status !== 'pending') {
      return wx.showToast({ title: '只能编辑未开始的节点', icon: 'none' });
    }

    this.setData({
      showEditDesignNodeModal: true,
      editSingleNodeIndex: idx,
      editSingleNodeData: {
        name: nodes[idx].name,
        startDate: nodes[idx].startDate,
        endDate: nodes[idx].endDate
      }
    });
  },

  closeEditDesignNodeModal() {
    this.setData({ showEditDesignNodeModal: false });
  },

  onEditSingleNodeStartDate(e) {
    this.setData({ 'editSingleNodeData.startDate': e.detail.value });
  },

  onEditSingleNodeEndDate(e) {
    this.setData({ 'editSingleNodeData.endDate': e.detail.value });
  },

  async confirmEditDesignNode() {
    let nodeData = this.data.editSingleNodeData;
    let idx = this.data.editSingleNodeIndex;
    
    if (!nodeData.startDate || !nodeData.endDate) {
      return wx.showToast({ title: '请选择预计开始和完成日期', icon: 'none' });
    }
    if (new Date(nodeData.startDate) > new Date(nodeData.endDate)) {
      return wx.showToast({ title: '开始时间不能晚于结束时间', icon: 'none' });
    }

    // 静默请求订阅授权
    await requestSubscribe();

    let nodes = JSON.parse(JSON.stringify(this.data.lead.designNodes || []));
    
    const oldStartDate = nodes[idx].startDate;
    const oldEndDate = nodes[idx].endDate;
    
    nodes[idx].startDate = nodeData.startDate;
    nodes[idx].endDate = nodeData.endDate;

    nodes = recalculateDesignGantt(nodes);

    wx.showLoading({ title: '正在保存...' });
    const db = wx.cloud.database();
    db.collection('leads').doc(this.data.leadId).update({
      data: { designNodes: nodes }
    }).then(res => {
      this.setData({
        'lead.designNodes': nodes,
        showEditDesignNodeModal: false
      });
      wx.hideLoading();
      wx.showToast({ title: '节点已更新', icon: 'success' });
      this.addSystemFollowUp(`编辑了设计节点【${nodeData.name}】的排期时间\n由 ${oldStartDate} 至 ${oldEndDate}\n改为 ${nodeData.startDate} 至 ${nodeData.endDate}`);
      this.notifyDesignAction(`编辑了客户【${this.data.lead.name}】的设计节点：【${nodeData.name}】的排期时间。`);
    }).catch((err) => {
      console.error('Edit design node failed:', err);
      wx.hideLoading();
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
    });
  },

  async openFillDelayReason(e) {
    const idx = e.currentTarget.dataset.index;
    const existingReason = this.data.lead.designNodes[idx].delayReason || '';
    
    wx.showModal({
      title: '填写逾期原因',
      content: existingReason,
      editable: true,
      placeholderText: '请填写逾期原因',
      success: (res) => {
        if (res.confirm) {
          const reason = res.content;
          if (!reason || reason.trim() === '') {
            return wx.showToast({ title: '逾期原因不能为空', icon: 'none' });
          }
          
          let nodes = JSON.parse(JSON.stringify(this.data.lead.designNodes));
          nodes[idx].delayReason = reason;
          
          wx.showLoading({ title: '保存中...' });
          const db = wx.cloud.database();
          db.collection('leads').doc(this.data.leadId).update({
            data: { designNodes: nodes }
          }).then(() => {
            this.setData({ 'lead.designNodes': nodes });
            wx.hideLoading();
            wx.showToast({ title: '已保存', icon: 'success' });
          }).catch(err => {
            wx.hideLoading();
            wx.showToast({ title: '保存失败', icon: 'none' });
          });
        }
      }
    });
  },

  async startDesignNode(e) {
    const userInfo = wx.getStorageSync('userInfo');
    const userRole = userInfo ? userInfo.role : '';
    if (userRole !== 'designer' && userRole !== 'admin') {
      return wx.showToast({ title: '仅设计师可开始设计节点', icon: 'none' });
    }
    
    const idx = e.currentTarget.dataset.index;
    let nodes = this.data.lead.designNodes;
    if (!nodes || !nodes[idx]) return;

    // 静默请求订阅授权
    await requestSubscribe();
    
    const nowStr = new Date().toISOString().split('T')[0];
    nodes[idx].status = 'current';
    nodes[idx].actualStartDate = nowStr;

    wx.showLoading({ title: '正在开始...' });
    const db = wx.cloud.database();
    db.collection('leads').doc(this.data.leadId).update({
      data: { designNodes: nodes }
    }).then((res) => {
      this.setData({ 'lead.designNodes': nodes });
      wx.hideLoading();
      wx.showToast({ title: '已开始', icon: 'success' });
      this.addSystemFollowUp(`开始设计工作：${nodes[idx].name}`);
      this.notifyDesignAction(`开始进行客户【${this.data.lead.name}】的设计工作：【${nodes[idx].name}】。`);
    }).catch((err) => {
      console.error('Start design node failed:', err);
      wx.hideLoading();
      wx.showToast({ title: '操作失败', icon: 'none' });
    });
  },

  async completeDesignNode(e) {
    const userInfo = wx.getStorageSync('userInfo');
    const userRole = userInfo ? userInfo.role : '';
    if (userRole !== 'designer' && userRole !== 'admin') {
      return wx.showToast({ title: '仅设计师可完成设计节点', icon: 'none' });
    }

    await requestSubscribe();

    const idx = e.currentTarget.dataset.index;
    let nodes = this.data.lead.designNodes;
    if (!nodes || !nodes[idx]) return;

    const node = nodes[idx];
    const todayStr = new Date().toISOString().split('T')[0];
    const expectedEndDate = new Date((node.endDate || '').replace(/-/g, '/'));
    const actualEnd = new Date(todayStr.replace(/-/g, '/'));

    const isLate = actualEnd > expectedEndDate;

    if (isLate) {
      wx.showModal({
        title: '节点已逾期',
        content: '',
        editable: true,
        placeholderText: '请填写逾期原因（必填）',
        success: (res) => {
          if (res.confirm) {
            const reason = res.content;
            if (!reason || reason.trim() === '') {
              return wx.showToast({ title: '请填写逾期原因', icon: 'none' });
            }
            this.processCompleteNode(idx, true, reason);
          }
        }
      });
    } else {
      // 没逾期，直接完成
      this.processCompleteNode(idx, false, '');
    }
  },

  processCompleteNode(idx, isLate, reason) {
    let nodes = JSON.parse(JSON.stringify(this.data.lead.designNodes));
    const node = nodes[idx];
    const nodeName = node.name;
    const todayStr = new Date().toISOString().split('T')[0];

    node.status = 'completed';
    node.actualEndDate = todayStr;
    if (isLate) {
      node.delayReason = reason;
    }

    nodes = recalculateDesignGantt(nodes);

    wx.showLoading({ title: '处理中...' });
    const db = wx.cloud.database();
    db.collection('leads').doc(this.data.leadId).update({
      data: { designNodes: nodes }
    }).then((res) => {
      this.setData({
        'lead.designNodes': nodes
      });
      wx.hideLoading();
      wx.showToast({ title: '节点已完成', icon: 'success' });

      // 联动1：系统跟进记录
      let followContent = `已完成设计出图节点：【${nodeName}】（实际完成：${todayStr}）`;
      if (isLate) followContent += `\n【逾期原因】：${reason}`;
      this.addSystemFollowUp(followContent);

      // 联动2：发送通知给管理员和其他关联人员
      this.notifyDesignAction(`完成了客户【${this.data.lead.name}】的设计工作：【${nodeName}】。`);

    }).catch((err) => {
      console.error('Complete design node failed:', err);
      wx.hideLoading();
      wx.showToast({ title: '操作失败', icon: 'none' });
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
    db.collection('users').where({ isActive: true }).get().then(res => {
      const users = res.data;
      users.forEach(u => {
        if (u.role === 'admin' && u.name !== operatorName) notifyUsers.add(u.name);
      });
      // 发送通知
      const nowStr = new Date().toISOString().split('T')[0];
      
      notifyUsers.forEach(uName => {
        if (!uName) return;
        const targetUserObj = users.find(user => user.name === uName);
        db.collection('notifications').add({
          data: {
            type: 'lead',
            title: '设计进度更新',
            content: `${operatorName} 已设定客户【${lead.name}】的设计工作流。`,
            senderName: operatorName,
            senderRole: userInfo.role || 'default',
            targetUser: uName,
            isRead: false,
            createTime: db.serverDate(),
            link: `/pages/leadDetail/index?id=${this.data.leadId}`
          }
        });

        // 发送微信订阅消息
        if (targetUserObj) {
          wx.cloud.callFunction({
            name: 'sendSubscribeMessage',
            data: {
              receiverUserId: targetUserObj._id,
              templateId: TEMPLATE_IDS.PROJECT_UPDATE,
              page: `/pages/leadDetail/index?id=${this.data.leadId}`,
              data: {
                thing1: { value: (lead.name || '未知客户').substring(0, 20) },
                time2: { value: nowStr },
                thing4: { value: (operatorName || '系统').substring(0, 20) },
                thing6: { value: '设计进度更新' },
                thing7: { value: '已设定设计工作流' }
              }
            }
          }).catch(console.error);
        }
      });
    }).catch(err => {
      console.error('发送设计开启通知失败', err);
    });
  },

  notifyDesignAction(actionDesc) {
    const db = wx.cloud.database();
    const lead = this.data.lead;
    const userInfo = wx.getStorageSync('userInfo');
    const operatorName = userInfo ? (userInfo.name || '未知') : '未知';
    
    const notifyUsers = new Set();
    if (lead.sales && lead.sales !== operatorName) notifyUsers.add(lead.sales);
    if (lead.designer && lead.designer !== operatorName) notifyUsers.add(lead.designer);
    if (lead.creatorName && lead.creatorName !== operatorName) notifyUsers.add(lead.creatorName);

    db.collection('users').where({ isActive: true }).get().then(res => {
      const users = res.data;
      users.forEach(u => {
        if (u.role === 'admin' && u.name !== operatorName) notifyUsers.add(u.name);
      });
      const nowStr = new Date().toISOString().split('T')[0];

      notifyUsers.forEach(uName => {
        if (!uName) return;
        const targetUserObj = users.find(user => user.name === uName);
        db.collection('notifications').add({
          data: {
            type: 'lead',
            title: '设计进度更新',
            content: `${operatorName} ${actionDesc}`,
            senderName: operatorName,
            senderRole: userInfo.role || 'default',
            targetUser: uName,
            isRead: false,
            createTime: db.serverDate(),
            link: `/pages/leadDetail/index?id=${this.data.leadId}`
          }
        });

        // 发送微信订阅消息
        if (targetUserObj) {
          wx.cloud.callFunction({
            name: 'sendSubscribeMessage',
            data: {
              receiverUserId: targetUserObj._id,
              templateId: TEMPLATE_IDS.PROJECT_UPDATE,
              page: `/pages/leadDetail/index?id=${this.data.leadId}`,
              data: {
                thing1: { value: (lead.name || '未知客户').substring(0, 20) },
                time2: { value: nowStr },
                thing4: { value: (operatorName || '系统').substring(0, 20) },
                thing6: { value: '设计进度更新' },
                thing7: { value: actionDesc.replace(/为客户【.*?】/, '').substring(0, 20) }
              }
            }
          }).catch(console.error);
        }
      });
    }).catch(err => {
      console.error('发送设计更新通知失败', err);
    });
  },

  // ==========================================
  // 设计节点附件上传与管理功能
  // ==========================================

  // 格式化文件大小
  formatSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // 获取文件扩展名或类型
  getFileType(filename) {
    const ext = (filename.split('.').pop() || '').toLowerCase();
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const videoExts = ['mp4', 'mov', 'avi'];
    const docExts = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'pdf'];
    
    if (imageExts.includes(ext)) return 'image';
    if (videoExts.includes(ext)) return 'video';
    if (docExts.includes(ext)) return 'doc';
    return 'file';
  },

  // 上传设计节点附件
  uploadDesignFile(e) {
    const { index } = e.currentTarget.dataset;
    const node = this.data.lead.designNodes[index];
    const nodeName = node.name; // 默认使用节点名称作为文件夹
    
    wx.showActionSheet({
      itemList: ['上传图片/视频', '上传微信文件'],
      success: (res) => {
        const isMedia = res.tapIndex === 0;
        
        if (isMedia) {
          wx.chooseMedia({
            count: 9,
            mediaType: ['image', 'video'],
            sourceType: ['album', 'camera'],
            sizeType: ['compressed'],
            success: (mediaRes) => {
              const tempFiles = mediaRes.tempFiles.map(f => ({
                path: f.tempFilePath || f.path,
                name: f.name || `upload_${Date.now()}_${Math.floor(Math.random() * 1000)}.${(f.tempFilePath || f.path).split('.').pop() || 'jpg'}`,
                size: f.size,
                fileType: f.fileType || 'image'
              }));
              this.showDesignFolderSelect(tempFiles, index, nodeName, 'media');
            }
          });
        } else {
          wx.chooseMessageFile({
            count: 9,
            type: 'all',
            success: (msgRes) => {
              const tempFiles = msgRes.tempFiles.map(f => ({
                path: f.path,
                name: f.name,
                size: f.size,
                type: f.type
              }));
              this.showDesignFolderSelect(tempFiles, index, nodeName, 'file');
            }
          });
        }
      }
    });
  },

  showDesignFolderSelect(tempFiles, nodeIndex, defaultFolderName, source) {
    const folders = this.data.lead.fileFolders || ['默认文件夹'];
    let selectedFolderIndex = folders.indexOf(defaultFolderName);
    
    // 如果没有对应的文件夹，可以把它加到列表最后或让用户新建。
    // 这里我们默认如果不存在就帮他准备新建
    let newFolderName = '';
    if (selectedFolderIndex === -1) {
      selectedFolderIndex = folders.length; // 选中"新建文件夹"
      newFolderName = defaultFolderName;
    }

    this.setData({
      showFolderSelectModal: true,
      tempUploadFiles: tempFiles,
      currentUploadNodeIndex: nodeIndex,
      uploadSourceType: source,
      folders: folders,
      folderOptions: [...folders, '新建文件夹...'],
      selectedFolderIndex: selectedFolderIndex,
      newFolderName: newFolderName,
      uploadVisibility: 'internal'
    });
  },

  onVisibilityChange(e) {
    this.setData({ uploadVisibility: e.currentTarget.dataset.val });
  },

  closeFolderSelectModal() {
    this.setData({
      showFolderSelectModal: false,
      tempUploadFiles: [],
      newFolderName: ''
    });
  },

  onFolderChange(e) {
    this.setData({ selectedFolderIndex: e.detail.value });
  },

  onNewFolderInput(e) {
    this.setData({ newFolderName: e.detail.value });
  },

  async confirmUpload() {
    const { selectedFolderIndex, folders, newFolderName, tempUploadFiles, currentUploadNodeIndex, uploadSourceType, uploadVisibility } = this.data;
    
    let targetFolder = '';
    let newFolders = [...folders];
    
    if (selectedFolderIndex == folders.length) {
      if (!newFolderName.trim()) {
        return wx.showToast({ title: '请输入文件夹名称', icon: 'none' });
      }
      targetFolder = newFolderName.trim();
      if (!folders.includes(targetFolder)) {
        newFolders.push(targetFolder);
        // 更新数据库中的 folders
        const db = wx.cloud.database();
        await db.collection('leads').doc(this.data.leadId).update({
          data: { fileFolders: newFolders }
        });
        this.setData({ 'lead.fileFolders': newFolders });
      }
    } else {
      targetFolder = folders[selectedFolderIndex];
    }

    this.setData({ showFolderSelectModal: false });
    this.processAndUploadDesignFiles(tempUploadFiles, currentUploadNodeIndex, targetFolder, uploadSourceType, uploadVisibility);
  },

  async processAndUploadDesignFiles(tempFiles, nodeIndex, targetFolder, source, uploadVisibility) {
    if (!tempFiles || tempFiles.length === 0) return;
    
    const lead = this.data.lead;
    const nodes = lead.designNodes || [];
    const node = nodes[nodeIndex];
    if (!node) return;

    wx.showLoading({ title: '处理图片...', mask: true });
    
    try {
      // 1. 如果是图片需要压缩处理
      const processPromises = tempFiles.map(f => {
        return new Promise((resolve) => {
          const originalPath = f.tempFilePath || f.path;
          const originalName = f.name || `upload_${Date.now()}_${Math.floor(Math.random() * 1000)}.${originalPath.split('.').pop() || 'jpg'}`;
          const isImage = (source === 'media' && f.fileType === 'image') || (source === 'file' && f.type === 'image');
          
          const fileInfo = {
            name: originalName,
            size: f.size
          };
          
          if (isImage) {
            wx.compressImage({
              src: originalPath,
              quality: 60,
              success: (compRes) => {
                fileInfo.path = compRes.tempFilePath;
                resolve(fileInfo);
              },
              fail: () => {
                fileInfo.path = originalPath;
                resolve(fileInfo);
              }
            });
          } else {
            fileInfo.path = originalPath;
            resolve(fileInfo);
          }
        });
      });

      const processedFiles = await Promise.all(processPromises);
      
      const userInfo = wx.getStorageSync('userInfo');
      const uploaderName = userInfo ? userInfo.name : '未知人员';
      
      const totalFiles = processedFiles.length;
      
      // 2. 上传到云存储 (逐个上传以显示进度)
      const uploadedFiles = [];
      for (let i = 0; i < processedFiles.length; i++) {
        const file = processedFiles[i];
        wx.showLoading({ title: `上传中 (${i + 1}/${totalFiles})`, mask: true });
        
        const ext = file.name.split('.').pop();
        const cloudPath = `design_files/${this.data.leadId}_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
        
        await new Promise((resolve, reject) => {
          wx.cloud.uploadFile({
            cloudPath,
            filePath: file.path,
            success: res => {
              const uploadDate = new Date();
              uploadedFiles.push({
                fileID: res.fileID,
                name: file.name,
                size: file.size,
                sizeStr: this.formatSize(file.size),
                type: this.getFileType(file.name),
                uploader: uploaderName,
                uploadTime: uploadDate.toISOString(),
                uploadTimeStr: `${uploadDate.getFullYear()}-${String(uploadDate.getMonth()+1).padStart(2,'0')}-${String(uploadDate.getDate()).padStart(2,'0')}`,
                folderName: targetFolder,
                isVisible: uploadVisibility === 'public',
                category: '设计资料'
              });
              resolve();
            },
            fail: err => reject(err)
          });
        });
      }
      
      wx.showLoading({ title: '更新数据...', mask: true });
      
      // 3. 更新数据库
      const currentFiles = node.files || [];
      const newFiles = [...currentFiles, ...uploadedFiles];
      
      // 同步到 lead.files
      const currentLeadFiles = lead.files || [];
      const newLeadFiles = [...currentLeadFiles, ...uploadedFiles];
      
      const updateData = {};
      updateData[`designNodes.${nodeIndex}.files`] = newFiles;
      updateData['files'] = newLeadFiles;

      const db = wx.cloud.database();
      await db.collection('leads').doc(this.data.leadId).update({
        data: updateData
      });

      // 4. 更新本地数据
      nodes[nodeIndex].files = newFiles;
      this.setData({
        'lead.designNodes': nodes,
        'lead.files': newLeadFiles
      });

      wx.hideLoading();
      wx.showToast({ title: '上传成功', icon: 'success' });
      
      const fileNames = uploadedFiles.map(f => f.name).join('、');
      this.addSystemFollowUp(`上传了 ${uploadedFiles.length} 个附件至设计节点：${node.name} (文件夹：${targetFolder})，文件：${fileNames}`);
      this.notifyDesignAction(`为客户【${this.data.lead.name}】的设计节点【${node.name}】上传了附件：${fileNames}`);
      
    } catch (err) {
      console.error('上传附件失败', err);
      wx.hideLoading();
      wx.showToast({ title: '上传失败，请重试', icon: 'none' });
    }
  },

  // 预览/下载附件
  previewDesignFile(e) {
    const { index, fileidx } = e.currentTarget.dataset;
    const node = this.data.lead.designNodes[index];
    if (!node || !node.files) return;
    
    const fileObj = node.files[fileidx];
    const fileID = fileObj.fileID;
    
    if (fileObj.type === 'image') {
      const imageFiles = node.files.filter(f => f.type === 'image').map(f => f.fileID);
      wx.previewImage({
        urls: imageFiles.length > 0 ? imageFiles : [fileID],
        current: fileID,
        showmenu: true
      });
    } else if (fileObj.type === 'video') {
      wx.previewMedia({
        sources: [{ url: fileID, type: 'video' }]
      });
    } else {
      wx.showLoading({ title: '下载文件...', mask: true });
      wx.cloud.downloadFile({
        fileID: fileID,
        success: res => {
          wx.hideLoading();
          const filePath = res.tempFilePath;
          wx.openDocument({
            filePath: filePath,
            showMenu: true,
            success: function () {
              console.log('打开文档成功');
            }
          });
        },
        fail: err => {
          console.error('下载文件失败', err);
          wx.hideLoading();
          wx.showToast({ title: '下载失败', icon: 'none' });
        }
      });
    }
  },

  // 预览旧版图片
  previewDesignImage(e) {
    const { index, imgurl } = e.currentTarget.dataset;
    const node = this.data.lead.designNodes[index];
    if (!node || !node.images || node.images.length === 0) return;
    wx.previewImage({ current: imgurl, urls: node.images });
  },

  // 删除旧版图片
  deleteDesignImage(e) {
    const { index, imgidx } = e.currentTarget.dataset;
    const lead = this.data.lead;
    const nodes = lead.designNodes || [];
    const node = nodes[index];
    if (!node || !node.images) return;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这张图片吗？',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...', mask: true });
          try {
            const currentImages = [...node.images];
            const deletedImage = currentImages.splice(imgidx, 1)[0];
            const updateData = {};
            updateData[`designNodes.${index}.images`] = currentImages;

            const db = wx.cloud.database();
            await db.collection('leads').doc(this.data.leadId).update({
              data: updateData
            });

            if (deletedImage.startsWith('cloud://')) {
              wx.cloud.deleteFile({ fileList: [deletedImage] }).catch(console.error);
            }

            nodes[index].images = currentImages;
            this.setData({ 'lead.designNodes': nodes });
            wx.hideLoading();
            wx.showToast({ title: '删除成功', icon: 'success' });
          } catch (err) {
            console.error('删除图片失败', err);
            wx.hideLoading();
            wx.showToast({ title: '删除失败，请重试', icon: 'none' });
          }
        }
      }
    });
  },

  // 切换附件可见性
  async toggleDesignFileVisibility(e) {
    const { index, fileidx } = e.currentTarget.dataset;
    const lead = this.data.lead;
    const nodes = lead.designNodes || [];
    const node = nodes[index];
    if (!node || !node.files || !node.files[fileidx]) return;

    const file = node.files[fileidx];
    const newIsVisible = file.isVisible === false ? true : false;
    
    wx.showLoading({ title: '正在设置...' });
    try {
      const db = wx.cloud.database();
      const leadFiles = lead.files || [];
      const globalFileIndex = leadFiles.findIndex(f => f.fileID === file.fileID);
      
      const updateData = {};
      updateData[`designNodes.${index}.files.${fileidx}.isVisible`] = newIsVisible;
      if (globalFileIndex !== -1) {
        updateData[`files.${globalFileIndex}.isVisible`] = newIsVisible;
      }

      await db.collection('leads').doc(this.data.leadId).update({
        data: updateData
      });

      this.setData({
        [`lead.designNodes[${index}].files[${fileidx}].isVisible`]: newIsVisible
      });
      
      if (globalFileIndex !== -1) {
        this.setData({
          [`lead.files[${globalFileIndex}].isVisible`]: newIsVisible
        });
      }

      wx.hideLoading();
      wx.showToast({ title: newIsVisible ? '已设为公开' : '已设为仅内部', icon: 'success' });
    } catch (err) {
      console.error('修改可见性失败', err);
      wx.hideLoading();
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  // 删除附件
  deleteDesignFile(e) {
    const { index, fileidx } = e.currentTarget.dataset;
    const lead = this.data.lead;
    const nodes = lead.designNodes || [];
    const node = nodes[index];
    if (!node || !node.files) return;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个附件吗？（仅从当前进度中移除）',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...', mask: true });
          try {
            const currentFiles = [...node.files];
            const deletedFile = currentFiles.splice(fileidx, 1)[0];

            const updateData = {};
            updateData[`designNodes.${index}.files`] = currentFiles;

            const db = wx.cloud.database();
            await db.collection('leads').doc(this.data.leadId).update({
              data: updateData
            });

            nodes[index].files = currentFiles;
            this.setData({ 
              'lead.designNodes': nodes
            });
            wx.hideLoading();
            wx.showToast({ title: '删除成功', icon: 'success' });
            
            this.addSystemFollowUp(`从设计节点【${node.name}】移除了附件：${deletedFile.name}`);
            this.notifyDesignAction(`从客户【${this.data.lead.name}】的设计节点【${node.name}】移除了附件：${deletedFile.name}`);
          } catch (err) {
            console.error('删除附件失败', err);
            wx.hideLoading();
            wx.showToast({ title: '删除失败，请重试', icon: 'none' });
          }
        }
      }
    });
  }
});