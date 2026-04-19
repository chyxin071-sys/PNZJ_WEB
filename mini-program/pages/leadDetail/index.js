import { maskName, maskPhone, maskAddress } from '../../utils/format.js';

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

Page({
  data: {
    leadId: '',
    lead: null,
    activeTab: 'info',
    followUps: [],
    quoteId: null,
    hasProject: false,
    isAdmin: false,
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
      console.error('获取客户失败详情:', err);
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
      
      // 确保是倒序排列（最新的在最上面），使用严格校验
      formattedList.sort((a, b) => {
        const timeA = a && a.createdAt ? String(a.createdAt) : '';
        const timeB = b && b.createdAt ? String(b.createdAt) : '';
        return timeB.localeCompare(timeA);
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

  goToProjectFiles() {
    wx.navigateTo({ url: `/pages/projectFiles/index?leadId=${this.data.leadId}` });
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
        createdAt: db.serverDate(),
        displayTime: nowStr,
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

      // 签单通知 (全员)
      const db2 = wx.cloud.database();
      const lead = this.data.lead;
      db2.collection('employees').get().then(res => {
        const users = res.data;
        users.forEach(u => {
          db2.collection('notifications').add({
            data: {
              type: 'lead', title: '🎉 恭喜开单',
              content: `好消息！客户【${lead.name}】已成功签单，大家再接再厉！`,
              targetUser: u.name, isRead: false, createTime: db2.serverDate(),
              link: `/pages/leadDetail/index?id=${this.data.leadId}`
            }
          });
        });
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

  confirmStartDesign() {
    if (!this.data.designStartDate) return wx.showToast({ title: '请选择日期', icon: 'none' });
    
    let nodes = this.data.editDesignNodes;
    if (nodes.length === 0) return wx.showToast({ title: '请至少保留一个节点', icon: 'none' });

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
      this.addSystemFollowUp(`开启了设计出图工作流，预计从 ${this.data.designStartDate} 开始`);
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '操作失败', icon: 'none' });
    });
  },

  openEditDesignModal() {
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
    nodes[idx].duration = parseInt(e.detail.value) || 1;
    
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
      this.addSystemFollowUp(`修改并重算了设计出图排期`);
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
    });
  },

  completeDesignNode(e) {
    const idx = e.currentTarget.dataset.index;
    let nodes = JSON.parse(JSON.stringify(this.data.lead.designNodes));
    const nowStr = new Date().toISOString().split('T')[0];
    
    nodes[idx].status = 'completed';
    nodes[idx].actualEndDate = nowStr;
    const nodeName = nodes[idx].name;

    if (idx + 1 < nodes.length) {
      nodes[idx + 1].status = 'current';
      nodes[idx + 1].startDate = nowStr;
    }

    nodes = recalculateDesignGantt(nodes, this.data.lead.designStartDate || nowStr);

    wx.showLoading({ title: '处理中...' });
    const db = wx.cloud.database();
    db.collection('leads').doc(this.data.leadId).update({
      data: { designNodes: nodes }
    }).then(() => {
      this.setData({ 'lead.designNodes': nodes });
      wx.hideLoading();
      wx.showToast({ title: '节点已完成', icon: 'success' });
      
      // 联动1：系统跟进记录
      this.addSystemFollowUp(`已完成设计出图节点：【${nodeName}】`);
      
      // 联动2：消息通知
      this.notifyDesignComplete(nodeName);
      
    }).catch(() => {
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
    if (!this.data.isAdmin) notifyUsers.add('admin');

    notifyUsers.forEach(u => {
      if (!u) return;
      db.collection('notifications').add({
        data: {
          type: 'lead',
          title: '设计进度更新',
          content: `${operatorName} 已完成客户【${lead.name}】的【${nodeName}】出图工作。`,
          targetUser: u,
          isRead: false,
          createTime: db.serverDate(),
          link: `/pages/leadDetail/index?id=${this.data.leadId}`
        }
      });
    });
  }
});