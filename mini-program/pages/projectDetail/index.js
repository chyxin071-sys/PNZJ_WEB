import { getNextWorkingDay, calculateEndDate, formatDate } from '../../utils/date';
import { maskName, maskAddress } from '../../utils/format.js';

Page({
  data: {
    id: null,
    project: null,
    loading: true,
    isAdmin: false,
    isRelated: false,
    nodesList: [],
    currentNodeIndex: 0,
    showUploadModal: false,
    currentUploadNodeIndex: null,
    uploadDesc: '',
    uploadFiles: [],
    showFilesModal: false,
    // 新增
    isEditingNodes: false,
    isStartingProject: false,
    baseStartDate: '',
    showDelayModal: false,
    delayNodeIdx: null,
    delayDays: 1,
    delayReason: '',
    showSubNodeModal: false,
    subNodeMajorIdx: null,
    subNodeIdx: null,
    subNodeRemark: '',
    subNodePhotos: [],
    userRole: 'admin',
    userName: '未知',
    showEditDurationModal: false,
    editDurationMajorIdx: 0,
    editDurationSubIdx: 0,
    editDurationValue: '',
    // 子工序浮窗
    showSubNodePopup: false,
    popupMajorIdx: null,
    popupSubIdx: null,
    popupSub: {},
    popupMajorNode: {},
    // 编辑排期弹窗
    showSubNodeEdit: false,
    editSubStartDate: '',
    editSubDuration: '',
    editSubEndDate: '',
    // 验收弹窗
    showAcceptanceModal: false,
    acceptanceMode: 'new', // 'new' | 'edit'
    acceptanceRemark: '',
    acceptancePhotos: [],
    
    showEditProjectModal: false,
    editProjectStartDate: '',
    editProjectManager: ''
  },

  openEditProjectModal() {
    this.setData({
      showEditProjectModal: true,
      editProjectStartDate: this.data.project.startDate || '',
      editProjectManager: this.data.project.manager || ''
    });
  },

  closeEditProjectModal() {
    this.setData({ showEditProjectModal: false });
  },

  onEditProjectStartDateChange(e) {
    this.setData({ editProjectStartDate: e.detail.value });
  },

  onEditProjectManagerInput(e) {
    this.setData({ editProjectManager: e.detail.value });
  },

  confirmEditProject() {
    const { editProjectStartDate, editProjectManager, project } = this.data;
    if (!editProjectStartDate || !editProjectManager) {
      return wx.showToast({ title: '开工日期和项目经理不能为空', icon: 'none' });
    }

    let newNodes = [...project.nodesData];
    newNodes = this.recalculateGantt(newNodes, editProjectStartDate);
    const expectedEndDate = newNodes[newNodes.length - 1].endDate;

    wx.showLoading({ title: '保存中...' });
    wx.cloud.callFunction({
      name: 'quickEdit',
      data: {
        collection: 'projects',
        id: this.data.id,
        data: { 
          startDate: editProjectStartDate, 
          manager: editProjectManager, 
          nodesData: newNodes, 
          expectedEndDate 
        }
      }
    }).then(() => {
      wx.hideLoading();
      wx.showToast({ title: '修改成功', icon: 'success' });
      this.setData({
        'project.startDate': editProjectStartDate,
        'project.manager': editProjectManager,
        'project.nodesData': newNodes,
        'project.expectedEndDate': expectedEndDate,
        nodesList: newNodes,
        showEditProjectModal: false
      });
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({ title: '修改失败', icon: 'error' });
    });
  },

  deleteProject() {
    wx.showModal({
      title: '警告',
      content: '确定要永久删除该工地记录吗？此操作不可恢复！',
      confirmColor: '#e11d48',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' });
          const db = wx.cloud.database();
          db.collection('projects').doc(this.data.id).remove().then(() => {
            wx.hideLoading();
            wx.showToast({ title: '删除成功', icon: 'success' });
            setTimeout(() => {
              wx.navigateBack();
            }, 1500);
          }).catch(() => {
            wx.hideLoading();
            wx.showToast({ title: '删除失败', icon: 'error' });
          });
        }
      }
    });
  },

  onLoad(options) {
    const userInfo = wx.getStorageSync('userInfo') || {};
    this.setData({ 
      userRole: userInfo.role || 'admin',
      userName: userInfo.name || '未知'
    });
    if (options.id) {
      this.setData({ id: options.id });
      this.loadProject(options.id);
    } else {
      wx.showToast({ title: '参数错误', icon: 'none' });
    }
  },

  onShow() {
    if (this.data.id && !this.data.loading) {
      this.loadProject(this.data.id);
    }
  },

  loadProject(id) {
    wx.showLoading({ title: '加载中' });
    const db = wx.cloud.database();
    db.collection('projects').doc(id).get().then(res => {
      const p = res.data;
      const userInfo = wx.getStorageSync('userInfo');
      const myName = userInfo ? userInfo.name : '';
      const isAdmin = userInfo && userInfo.role === 'admin';
      const isRelated = isAdmin || p.manager === myName || p.sales === myName || p.designer === myName || p.creatorName === myName;

      if (!isRelated) {
        p._isMasked = true;
        if (p.customer) p.customer = maskName(p.customer);
        if (p.address) p.address = maskAddress(p.address);
      }

      const currentNode = p.currentNode || 1;
      
      let daysElapsed = 0;
      if (p.startDate && p.status !== '未开工') {
        daysElapsed = Math.ceil((new Date().getTime() - new Date(p.startDate.replace(/-/g, '/')).getTime()) / (1000 * 60 * 60 * 24));
        if (daysElapsed < 0) daysElapsed = 0;
      }
      
      let expectedEndDate = '-';
      if (p.startDate) {
        const sd = new Date(p.startDate.replace(/-/g, '/'));
        sd.setDate(sd.getDate() + 90);
        expectedEndDate = `${sd.getFullYear()}-${String(sd.getMonth()+1).padStart(2,'0')}-${String(sd.getDate()).padStart(2,'0')}`;
      }
      
      // 生成或恢复 8 个大节点数据
      const templateNodes = [
        { name: "开工", duration: 10, subNodes: [{name: "开工仪式", duration: 1}, {name: "现场交底", duration: 1}, {name: "成品保护", duration: 1}, {name: "墙体拆除", duration: 2}, {name: "垃圾清运", duration: 1}, {name: "设备定位(空调/新风)", duration: 1}, {name: "砌筑新建", duration: 2}, {name: "墙体批荡", duration: 1}] },
        { name: "水电", duration: 9, subNodes: [{name: "水电交底", duration: 1}, {name: "开槽布管", duration: 3}, {name: "排污下水", duration: 1}, {name: "线管敷设", duration: 2}, {name: "打压测试", duration: 1}, {name: "水电验收", duration: 1}] },
        { name: "木工", duration: 10, subNodes: [{name: "木工交底", duration: 1}, {name: "吊顶龙骨", duration: 3}, {name: "石膏板封样", duration: 2}, {name: "背景墙打底", duration: 2}, {name: "隔墙制作", duration: 1}, {name: "木工验收", duration: 1}] },
        { name: "瓦工", duration: 16, subNodes: [{name: "瓦工交底", duration: 1}, {name: "下水管包管", duration: 1}, {name: "防水涂刷", duration: 2}, {name: "闭水试验", duration: 2}, {name: "地面找平", duration: 2}, {name: "瓷砖铺贴", duration: 6}, {name: "瓷砖美缝", duration: 1}, {name: "瓦工验收", duration: 1}] },
        { name: "墙面", duration: 14, subNodes: [{name: "墙面交底", duration: 1}, {name: "基层找平", duration: 2}, {name: "挂网防裂", duration: 1}, {name: "腻子批刮", duration: 4}, {name: "乳胶漆涂刷", duration: 5}, {name: "墙面验收", duration: 1}] },
        { name: "定制", duration: 12, subNodes: [{name: "复尺测量", duration: 1}, {name: "厨卫吊顶", duration: 1}, {name: "木地板铺装", duration: 2}, {name: "木门安装", duration: 1}, {name: "柜体安装", duration: 4}, {name: "台面安装", duration: 1}, {name: "五金挂件", duration: 2}] },
        { name: "软装", duration: 6, subNodes: [{name: "窗帘壁纸", duration: 1}, {name: "灯具安装", duration: 1}, {name: "开关面板", duration: 1}, {name: "卫浴安装", duration: 1}, {name: "大家电进场", duration: 1}, {name: "家具进场", duration: 1}] },
        { name: "交付", duration: 4, subNodes: [{name: "拓荒保洁", duration: 1}, {name: "室内空气治理", duration: 1}, {name: "竣工验收", duration: 1}, {name: "钥匙移交/合影留念", duration: 1}] }
      ];
      
      let projectNodes = p.nodesData || [];
      if (!projectNodes || projectNodes.length === 0) {
        projectNodes = templateNodes.map((template, index) => {
          let status = 'pending';
          let startDate = '', endDate = '';
          if (index < currentNode - 1) {
            status = 'completed';
            const sd = new Date(p.startDate ? p.startDate.replace(/-/g, '/') : new Date());
            sd.setDate(sd.getDate() + index * 5);
            startDate = `${sd.getFullYear()}-${String(sd.getMonth()+1).padStart(2,'0')}-${String(sd.getDate()).padStart(2,'0')}`;
            const ed = new Date(sd);
            ed.setDate(ed.getDate() + 3);
            endDate = `${ed.getFullYear()}-${String(ed.getMonth()+1).padStart(2,'0')}-${String(ed.getDate()).padStart(2,'0')}`;
          } else if (index === currentNode - 1) {
            status = 'current';
            const sd = new Date(p.startDate ? p.startDate.replace(/-/g, '/') : new Date());
            sd.setDate(sd.getDate() + index * 5);
            startDate = `${sd.getFullYear()}-${String(sd.getMonth()+1).padStart(2,'0')}-${String(sd.getDate()).padStart(2,'0')}`;
            const ed = new Date(sd);
            ed.setDate(ed.getDate() + 5);
            endDate = `${ed.getFullYear()}-${String(ed.getMonth()+1).padStart(2,'0')}-${String(ed.getDate()).padStart(2,'0')}`;
          } else {
            status = 'pending';
            const sd = new Date(p.startDate ? p.startDate.replace(/-/g, '/') : new Date());
            sd.setDate(sd.getDate() + index * 5);
            startDate = `${sd.getFullYear()}-${String(sd.getMonth()+1).padStart(2,'0')}-${String(sd.getDate()).padStart(2,'0')}`;
            const ed = new Date(sd);
            ed.setDate(ed.getDate() + 5);
            endDate = `${ed.getFullYear()}-${String(ed.getMonth()+1).padStart(2,'0')}-${String(ed.getDate()).padStart(2,'0')}`;
          }
          return {
            name: template.name,
            duration: template.duration,
            subNodes: template.subNodes.map(s => ({ name: s.name, duration: s.duration, status: "pending", startDate: "", endDate: "", records: [] })),
            status,
            startDate,
            endDate,
            expanded: index === currentNode - 1,
            records: [],
            delayRecords: []
          };
        });
      } else {
        projectNodes = projectNodes.map((n, idx) => ({
          ...n,
          expanded: n.expanded || idx === currentNode - 1,
          duration: n.duration || templateNodes[idx]?.duration || 5,
          subNodes: (n.subNodes || []).map(s => typeof s === 'string' ? { name: s, duration: 1, status: "pending", startDate: "", endDate: "", records: [] } : s),
          delayRecords: n.delayRecords || []
        }));
      }

      this.setData({ 
        project: { ...p, daysElapsed, expectedEndDate },
        nodesList: projectNodes,
        currentNodeIndex: currentNode - 1,
        loading: false 
      });
      wx.hideLoading();
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '加载失败', icon: 'none' });
    });
  },

  toggleNode(e) {
    const idx = e.currentTarget.dataset.index;
    const nodes = this.data.nodesList;
    nodes[idx].expanded = !nodes[idx].expanded;
    this.setData({ nodesList: nodes });
  },

  openEditDurationModal(e) {
    const { major, sub, duration } = e.currentTarget.dataset;
    this.setData({
      showEditDurationModal: true,
      editDurationMajorIdx: major,
      editDurationSubIdx: sub,
      editDurationValue: duration
    });
  },

  closeEditDurationModal() {
    this.setData({ showEditDurationModal: false });
  },

  onEditDurationInput(e) {
    this.setData({ editDurationValue: e.detail.value });
  },

  confirmEditDuration() {
    const { editDurationMajorIdx, editDurationSubIdx, editDurationValue, project } = this.data;
    const newDuration = Number(editDurationValue);
    if (isNaN(newDuration) || newDuration < 0) {
      return wx.showToast({ title: '请输入有效天数', icon: 'none' });
    }

    let newNodes = [...project.nodesData];
    newNodes[editDurationMajorIdx].subNodes[editDurationSubIdx].duration = newDuration;
    
    // 重算排期
    newNodes = this.recalculateGantt(newNodes, project.startDate);
    const expectedEndDate = newNodes[newNodes.length - 1].endDate;

    wx.showLoading({ title: '重算排期中...' });
    wx.cloud.callFunction({
      name: 'quickEdit',
      data: {
        collection: 'projects',
        id: this.data.id,
        data: { nodesData: newNodes, expectedEndDate }
      }
    }).then(() => {
      wx.hideLoading();
      wx.showToast({ title: '重算成功', icon: 'success' });
      this.setData({ 
        'project.nodesData': newNodes,
        'project.expectedEndDate': expectedEndDate,
        nodesList: newNodes,
        showEditDurationModal: false
      });
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({ title: '操作失败', icon: 'error' });
    });
  },

  openUpload(e) {
    const idx = e.currentTarget.dataset.index;
    this.setData({ 
      showUploadModal: true, 
      currentUploadNodeIndex: idx,
      uploadDesc: '',
      uploadFiles: []
    });
  },

  closeUpload() {
    this.setData({ showUploadModal: false });
  },

  onDescInput(e) {
    this.setData({ uploadDesc: e.detail.value });
  },

  chooseMedia() {
    wx.chooseMedia({
      count: 9,
      mediaType: ['image', 'video'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newFiles = res.tempFiles.map(f => ({
          url: f.tempFilePath,
          type: f.fileType
        }));
        this.setData({ uploadFiles: [...this.data.uploadFiles, ...newFiles] });
      }
    });
  },

  recalculateGantt(nodes, baseDate) {
    let currentStartStr = baseDate;
    
    return nodes.map(node => {
      // 如果大节点已完成，其下一节点的起始日为大节点实际结束日的下一个工作日
      if (node.status === 'completed' && node.endDate) {
        currentStartStr = formatDate(getNextWorkingDay(new Date(node.endDate.replace(/-/g, '/'))));
        return node; 
      }
      
      let nodeStartDate = currentStartStr;
      let nodeEndDate = currentStartStr;
      
      const updatedSubNodes = (node.subNodes || []).map((sub) => {
        if (sub.status === 'completed' && sub.actualEndDate) {
           currentStartStr = formatDate(getNextWorkingDay(new Date(sub.actualEndDate.replace(/-/g, '/'))));
           return sub;
        }
        
        const subStart = currentStartStr;
        const subEnd = calculateEndDate(subStart, Number(sub.duration) || 0);
        
        // 下一个子节点起始时间为当前子节点结束后的下一个工作日
        if ((Number(sub.duration) || 0) > 0) {
          currentStartStr = formatDate(getNextWorkingDay(new Date(subEnd.replace(/-/g, '/'))));
        }
        
        nodeEndDate = subEnd; // 大节点的预计结束日更新为最后一个子节点的结束日
        
        return {
          ...sub,
          startDate: subStart,
          endDate: subEnd
        };
      });
      
      // 处理大节点的异常延误
      const delayDays = (node.delayRecords || []).reduce((sum, r) => sum + (Number(r.days) || 0), 0);
      if (delayDays > 0) {
         nodeEndDate = calculateEndDate(nodeEndDate, delayDays + 1); 
         currentStartStr = formatDate(getNextWorkingDay(new Date(nodeEndDate.replace(/-/g, '/'))));
      }
      
      return {
        ...node,
        startDate: updatedSubNodes.length > 0 ? updatedSubNodes[0].startDate : nodeStartDate,
        endDate: nodeEndDate,
        subNodes: updatedSubNodes
      };
    });
  },

  completeNode(e) {
    const idx = e.currentTarget.dataset.index;
    wx.showModal({
      title: '验收确认',
      content: `确认完成【${this.data.nodesList[idx].name}】节点验收并推进到下一阶段吗？`,
      success: (res) => {
        if (res.confirm) {
          this.processCompleteNode(idx);
        }
      }
    });
  },

  processCompleteNode(nodeIndex) {
    // 校验子节点
    const unapprovedSubs = this.data.nodesList[nodeIndex].subNodes.filter(s => s.status !== 'approved');
    if (unapprovedSubs.length > 0) {
      wx.showToast({ title: `还有 ${unapprovedSubs.length} 个子工序未验收通过`, icon: 'none' });
      return;
    }

    wx.showLoading({ title: '处理中' });
    let nodes = [...this.data.nodesList];
    const nowStr = new Date().toISOString().split('T')[0];
    
    nodes[nodeIndex].status = 'completed';
    nodes[nodeIndex].endDate = nowStr;

    let newCurrentNode = this.data.currentNodeIndex + 1;

    if (nodeIndex + 1 < nodes.length) {
      nodes[nodeIndex + 1].status = 'current';
      nodes[nodeIndex + 1].startDate = nowStr;
      newCurrentNode = nodeIndex + 2;
    }

    nodes = this.recalculateGantt(nodes, this.data.project.startDate);

    const isFinished = nodeIndex + 1 >= nodes.length;
    const newProjectStatus = isFinished ? '已竣工' : this.data.project.status;
    const newExpectedEndDate = nodes[nodes.length - 1].endDate;

    const db = wx.cloud.database();
    db.collection('projects').doc(this.data.id).update({
      data: {
        nodesData: nodes,
        currentNode: newCurrentNode,
        status: newProjectStatus,
        expectedEndDate: newExpectedEndDate
      }
    }).then(() => {
      this.setData({ 
        nodesList: nodes, 
        currentNodeIndex: newCurrentNode - 1,
        'project.status': newProjectStatus,
        'project.expectedEndDate': newExpectedEndDate
      });
      if (!isFinished) {
        this.setData({ [`nodesList[${nodeIndex + 1}].expanded`]: true });
      }
      wx.hideLoading();
      wx.showToast({ title: '节点已推进', icon: 'success' });
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '处理失败', icon: 'none' });
    });
  },

  submitUpload() {
    if (this.data.uploadFiles.length === 0 && !this.data.uploadDesc.trim()) {
      return wx.showToast({ title: '请添加文字或图片', icon: 'none' });
    }

    wx.showLoading({ title: '保存中' });
    const idx = this.data.currentUploadNodeIndex;
    const nodes = this.data.nodesList;
    const userInfo = wx.getStorageSync('userInfo') || { name: '未知人员' };
    
    const now = new Date();
    const timeStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    // 这里由于是本地模拟，没有真正上传云存储。实际项目需要先 wx.cloud.uploadFile
    const record = {
      desc: this.data.uploadDesc,
      files: this.data.uploadFiles,
      uploader: userInfo.name,
      time: timeStr
    };

    if (!nodes[idx].records) nodes[idx].records = [];
    nodes[idx].records.unshift(record);

    const db = wx.cloud.database();
    db.collection('projects').doc(this.data.id).update({
      data: { nodesData: nodes }
    }).then(() => {
      this.setData({ nodesList: nodes, showUploadModal: false });
      wx.hideLoading();
      wx.showToast({ title: '提交成功', icon: 'success' });
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '提交失败', icon: 'none' });
    });
  },

  goToQuote() {
    if (this.data.project && this.data.project.leadId) {
      wx.navigateTo({ url: `/pages/quoteDetail/index?leadId=${this.data.project.leadId}` });
    } else {
      wx.showToast({ title: '暂无报价信息', icon: 'none' });
    }
  },

  viewFiles() {
    this.setData({ showFilesModal: true });
  },

  closeFiles() {
    this.setData({ showFilesModal: false });
  },

  previewFile(e) {
    const { url, type } = e.currentTarget.dataset;
    if (type === 'image') {
      wx.previewImage({ urls: [url], current: url });
    } else {
      wx.showToast({ title: '视频请在相册或电脑端查看', icon: 'none' });
    }
  },

  uploadProjectFile() {
    wx.chooseMedia({
      count: 1,
      success: (res) => {
        wx.showLoading({ title: '上传中' });
        const file = res.tempFiles[0];
        const userInfo = wx.getStorageSync('userInfo') || { name: '未知人员' };
        const now = new Date();
        const timeStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

        const newFile = {
          name: '项目资料附件',
          url: file.tempFilePath,
          type: file.fileType,
          uploader: userInfo.name,
          time: timeStr
        };

        const projectFiles = this.data.project.files || [];
        projectFiles.unshift(newFile);

        const db = wx.cloud.database();
        db.collection('projects').doc(this.data.id).update({
          data: { files: projectFiles }
        }).then(() => {
          this.setData({ 'project.files': projectFiles });
          wx.hideLoading();
          wx.showToast({ title: '上传成功', icon: 'success' });
        }).catch(() => {
          wx.hideLoading();
          wx.showToast({ title: '上传失败', icon: 'none' });
        });
      }
    });
  },

  // ==== 节点裁剪与开工 ====
  startProjectModal() {
    this.setData({ 
      isStartingProject: true, 
      baseStartDate: new Date().toISOString().split('T')[0]
    });
  },
  closeStartModal() {
    this.setData({ isStartingProject: false, isEditingNodes: false });
  },
  toggleEditNodes() {
    this.setData({ isEditingNodes: !this.data.isEditingNodes });
  },
  removeSubNode(e) {
    const { major, sub } = e.currentTarget.dataset;
    const nodes = [...this.data.nodesList];
    nodes[major].subNodes.splice(sub, 1);
    this.setData({ nodesList: nodes });
  },
  onStartDateChange(e) {
    this.setData({ baseStartDate: e.detail.value });
  },
  confirmStartProject() {
    if (!this.data.baseStartDate) return wx.showToast({ title: '请选择日期', icon: 'none' });
    wx.showLoading({ title: '处理中' });
    
    let nodes = [...this.data.nodesList];
    nodes[0].status = 'current';
    nodes = this.recalculateGantt(nodes, this.data.baseStartDate);

    const expectedEndDate = nodes[nodes.length - 1].endDate;

    const db = wx.cloud.database();
    db.collection('projects').doc(this.data.id).update({
      data: {
        status: '施工中',
        startDate: this.data.baseStartDate,
        expectedEndDate: expectedEndDate,
        nodesData: nodes,
        currentNode: 1
      }
    }).then(() => {
      this.setData({ 
        'project.status': '施工中',
        'project.startDate': this.data.baseStartDate,
        'project.expectedEndDate': expectedEndDate,
        nodesList: nodes,
        currentNodeIndex: 0,
        isStartingProject: false,
        isEditingNodes: false
      });
      wx.hideLoading();
      wx.showToast({ title: '正式开工', icon: 'success' });
    });
  },

  // ==== 延期记录 ====
  openDelayModal(e) {
    this.setData({ showDelayModal: true, delayNodeIdx: e.currentTarget.dataset.index, delayDays: 1, delayReason: '' });
  },
  closeDelayModal() {
    this.setData({ showDelayModal: false });
  },
  onDelayDaysInput(e) {
    this.setData({ delayDays: parseInt(e.detail.value) || 1 });
  },
  onDelayReasonInput(e) {
    this.setData({ delayReason: e.detail.value });
  },
  confirmDelay() {
    if (!this.data.delayReason) return wx.showToast({ title: '请填写原因', icon: 'none' });
    wx.showLoading({ title: '重算中' });

    let nodes = [...this.data.nodesList];
    nodes[this.data.delayNodeIdx].delayRecords.push({
      days: this.data.delayDays,
      reason: this.data.delayReason,
      createdAt: new Date().toISOString()
    });

    nodes = this.recalculateGantt(nodes, this.data.project.startDate);
    const expectedEndDate = nodes[nodes.length - 1].endDate;

    const db = wx.cloud.database();
    db.collection('projects').doc(this.data.id).update({
      data: { nodesData: nodes, expectedEndDate }
    }).then(() => {
      this.setData({ nodesList: nodes, 'project.expectedEndDate': expectedEndDate, showDelayModal: false });
      wx.hideLoading();
      wx.showToast({ title: '已记录延误', icon: 'success' });
    });
  },

  // ==== 子工序浮窗 ====
  openSubNodePopup(e) {
    const { major, sub } = e.currentTarget.dataset;
    if (this.data.isEditingNodes) return;
    const node = this.data.nodesList[major];
    const subNode = node.subNodes[sub];
    this.setData({
      showSubNodePopup: true,
      popupMajorIdx: major,
      popupSubIdx: sub,
      popupSub: { ...subNode },
      popupMajorNode: { ...node }
    });
  },

  closeSubNodePopup() {
    this.setData({ showSubNodePopup: false });
  },

  // ==== 编辑排期弹窗 ====
  openSubNodeEdit() {
    const sub = this.data.popupSub;
    this.setData({
      showSubNodeEdit: true,
      editSubStartDate: sub.startDate || '',
      editSubDuration: String(sub.duration || 1),
      editSubEndDate: sub.endDate || ''
    });
  },

  closeSubNodeEdit() {
    this.setData({ showSubNodeEdit: false });
  },

  onEditSubStartDateChange(e) {
    const startDate = e.detail.value;
    const duration = Number(this.data.editSubDuration) || 1;
    const endDate = calculateEndDate(startDate, duration);
    this.setData({ editSubStartDate: startDate, editSubEndDate: endDate });
  },

  onEditSubDurationInput(e) {
    const duration = Number(e.detail.value) || 0;
    const startDate = this.data.editSubStartDate;
    let endDate = this.data.editSubEndDate;
    if (startDate && duration > 0) {
      endDate = calculateEndDate(startDate, duration);
    }
    this.setData({ editSubDuration: e.detail.value, editSubEndDate: endDate });
  },

  onEditSubEndDateChange(e) {
    // 只改完工日期，开工和工期不变
    this.setData({ editSubEndDate: e.detail.value });
  },

  confirmSubNodeEdit() {
    const { popupMajorIdx, popupSubIdx, editSubStartDate, editSubDuration, editSubEndDate } = this.data;
    if (!editSubStartDate || !editSubEndDate) {
      return wx.showToast({ title: '请填写完整日期', icon: 'none' });
    }
    wx.showLoading({ title: '重算排期中...' });

    let nodes = JSON.parse(JSON.stringify(this.data.nodesList));
    const sub = nodes[popupMajorIdx].subNodes[popupSubIdx];
    sub.startDate = editSubStartDate;
    sub.duration = Number(editSubDuration) || sub.duration;
    sub.endDate = editSubEndDate;

    // 从该子节点之后顺延所有后续工序
    nodes = this._recalculateFromSubNode(nodes, popupMajorIdx, popupSubIdx);
    const expectedEndDate = nodes[nodes.length - 1].endDate;

    const db = wx.cloud.database();
    db.collection('projects').doc(this.data.id).update({
      data: { nodesData: nodes, expectedEndDate }
    }).then(() => {
      this.setData({
        nodesList: nodes,
        'project.expectedEndDate': expectedEndDate,
        showSubNodeEdit: false,
        showSubNodePopup: false
      });
      wx.hideLoading();
      wx.showToast({ title: '排期已更新', icon: 'success' });
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
    });
  },

  // 从指定子节点之后重算所有后续排期
  _recalculateFromSubNode(nodes, majorIdx, subIdx) {
    // 找到该子节点的结束日期，作为下一个工序的起始
    const changedSub = nodes[majorIdx].subNodes[subIdx];
    let nextStart = formatDate(getNextWorkingDay(new Date(changedSub.endDate.replace(/-/g, '/'))));

    // 更新同大节点内后续子节点
    for (let si = subIdx + 1; si < nodes[majorIdx].subNodes.length; si++) {
      const s = nodes[majorIdx].subNodes[si];
      if (s.status === 'completed') {
        nextStart = formatDate(getNextWorkingDay(new Date((s.actualEndDate || s.endDate).replace(/-/g, '/'))));
        continue;
      }
      s.startDate = nextStart;
      s.endDate = calculateEndDate(nextStart, Number(s.duration) || 1);
      nextStart = formatDate(getNextWorkingDay(new Date(s.endDate.replace(/-/g, '/'))));
    }

    // 更新大节点的 endDate 为最后一个子节点的 endDate
    const subs = nodes[majorIdx].subNodes;
    if (subs.length > 0) {
      nodes[majorIdx].endDate = subs[subs.length - 1].endDate;
    }

    // 更新后续大节点
    for (let mi = majorIdx + 1; mi < nodes.length; mi++) {
      const node = nodes[mi];
      if (node.status === 'completed') {
        nextStart = formatDate(getNextWorkingDay(new Date(node.endDate.replace(/-/g, '/'))));
        continue;
      }
      node.startDate = nextStart;
      for (let si = 0; si < node.subNodes.length; si++) {
        const s = node.subNodes[si];
        if (s.status === 'completed') {
          nextStart = formatDate(getNextWorkingDay(new Date((s.actualEndDate || s.endDate).replace(/-/g, '/'))));
          continue;
        }
        s.startDate = nextStart;
        s.endDate = calculateEndDate(nextStart, Number(s.duration) || 1);
        nextStart = formatDate(getNextWorkingDay(new Date(s.endDate.replace(/-/g, '/'))));
      }
      if (node.subNodes.length > 0) {
        node.endDate = node.subNodes[node.subNodes.length - 1].endDate;
      }
    }
    return nodes;
  },

  // ==== 验收弹窗 ====
  openAcceptance() {
    const sub = this.data.popupSub;
    const isEdit = sub.status === 'completed' && sub.acceptanceRecord;
    this.setData({
      showAcceptanceModal: true,
      showSubNodePopup: false,
      acceptanceMode: isEdit ? 'edit' : 'new',
      acceptanceRemark: isEdit ? (sub.acceptanceRecord.remark || '') : '',
      acceptancePhotos: isEdit ? (sub.acceptanceRecord.photos || []) : []
    });
  },

  closeAcceptance() {
    this.setData({ showAcceptanceModal: false });
  },

  onAcceptanceRemarkInput(e) {
    this.setData({ acceptanceRemark: e.detail.value });
  },

  chooseAcceptanceMedia() {
    wx.chooseMedia({
      count: 9 - this.data.acceptancePhotos.length,
      mediaType: ['image', 'video'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newFiles = res.tempFiles.map(f => ({ url: f.tempFilePath, type: f.fileType || 'image' }));
        this.setData({ acceptancePhotos: [...this.data.acceptancePhotos, ...newFiles] });
      }
    });
  },

  removeAcceptancePhoto(e) {
    const idx = e.currentTarget.dataset.index;
    const photos = [...this.data.acceptancePhotos];
    photos.splice(idx, 1);
    this.setData({ acceptancePhotos: photos });
  },

  previewAcceptancePhoto(e) {
    const idx = e.currentTarget.dataset.index;
    const photos = this.data.acceptancePhotos;
    const urls = photos.filter(p => !p.type || p.type === 'image').map(p => p.url || p);
    wx.previewImage({ urls, current: photos[idx].url || photos[idx] });
  },

  submitAcceptance() {
    if (this.data.acceptancePhotos.length === 0) {
      return wx.showToast({ title: '请上传现场照片或视频', icon: 'none' });
    }
    wx.showLoading({ title: '提交中' });

    const { popupMajorIdx, popupSubIdx, acceptanceRemark, acceptancePhotos, acceptanceMode, userName } = this.data;
    const nowStr = new Date().toISOString().split('T')[0];
    const nowFull = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    })();

    // 上传图片到云存储
    const uploadTasks = acceptancePhotos.map((item, index) => {
      const path = item.url || item;
      if (path.startsWith('cloud://')) return Promise.resolve({ fileID: path });
      const ext = path.split('.').pop() || 'jpg';
      const cloudPath = `acceptance/${this.data.id}/${popupMajorIdx}_${popupSubIdx}_${Date.now()}_${index}.${ext}`;
      return wx.cloud.uploadFile({ cloudPath, filePath: path });
    });

    Promise.all(uploadTasks).then(resList => {
      const fileIDs = resList.map((res, i) => ({
        url: res.fileID,
        type: acceptancePhotos[i].type || 'image'
      }));

      let nodes = JSON.parse(JSON.stringify(this.data.nodesList));
      const sub = nodes[popupMajorIdx].subNodes[popupSubIdx];

      const record = {
        remark: acceptanceRemark,
        photos: fileIDs,
        inspector: userName,
        createdAt: acceptanceMode === 'new' ? nowFull : (sub.acceptanceRecord?.createdAt || nowFull),
        editedAt: acceptanceMode === 'edit' ? nowFull : undefined,
        editedBy: acceptanceMode === 'edit' ? userName : undefined
      };

      sub.acceptanceRecord = record;

      if (acceptanceMode === 'new') {
        sub.status = 'completed';
        if (!sub.actualStartDate) sub.actualStartDate = nowStr;
        sub.actualEndDate = nowStr;
      }

      // 检查大节点是否全部完成
      let newCurrentNode = this.data.currentNodeIndex + 1;
      let newProjectStatus = this.data.project.status;
      let newExpectedEndDate = this.data.project.expectedEndDate;

      const allCompleted = nodes[popupMajorIdx].subNodes.every(s => s.status === 'completed');
      if (allCompleted && acceptanceMode === 'new') {
        nodes[popupMajorIdx].status = 'completed';
        nodes[popupMajorIdx].endDate = nowStr;
        if (popupMajorIdx + 1 < nodes.length) {
          nodes[popupMajorIdx + 1].status = 'current';
          nodes[popupMajorIdx + 1].startDate = nowStr;
          newCurrentNode = popupMajorIdx + 2;
        }
        nodes = this.recalculateGantt(nodes, this.data.project.startDate);
        const isFinished = popupMajorIdx + 1 >= nodes.length;
        newProjectStatus = isFinished ? '已竣工' : this.data.project.status;
        newExpectedEndDate = nodes[nodes.length - 1].endDate;
      }

      const db = wx.cloud.database();
      return db.collection('projects').doc(this.data.id).update({
        data: { nodesData: nodes, currentNode: newCurrentNode, status: newProjectStatus, expectedEndDate: newExpectedEndDate }
      }).then(() => {
        this.setData({
          nodesList: nodes,
          showAcceptanceModal: false,
          currentNodeIndex: newCurrentNode - 1,
          'project.status': newProjectStatus,
          'project.expectedEndDate': newExpectedEndDate
        });
        wx.hideLoading();
        wx.showToast({ title: acceptanceMode === 'edit' ? '记录已更新' : '验收通过', icon: 'success' });
      });
    }).catch(err => {
      console.error('验收提交失败', err);
      wx.hideLoading();
      wx.showToast({ title: '提交失败，请重试', icon: 'none' });
    });
  },

  // ==== 子工序验收 (旧方法保留兼容) ====
  openSubNodeModal(e) {
    this.openSubNodePopup(e);
  },

  onNodeStartDateChange(e) {
    const idx = e.currentTarget.dataset.index;
    const date = e.detail.value;
    const nodes = [...this.data.nodesList];
    nodes[idx].startDate = date;
    
    wx.showLoading({ title: '保存中' });
    const db = wx.cloud.database();
    db.collection('projects').doc(this.data.id).update({
      data: { nodesData: nodes }
    }).then(() => {
      this.setData({ nodesList: nodes });
      wx.hideLoading();
    });
  },

  onNodeEndDateChange(e) {
    const idx = e.currentTarget.dataset.index;
    const date = e.detail.value;
    const nodes = [...this.data.nodesList];
    nodes[idx].endDate = date;
    
    wx.showLoading({ title: '保存中' });
    const db = wx.cloud.database();
    db.collection('projects').doc(this.data.id).update({
      data: { nodesData: nodes }
    }).then(() => {
      this.setData({ nodesList: nodes });
      wx.hideLoading();
    });
  },

  showComingSoon() {
    wx.showToast({ title: '模块正在开发中', icon: 'none' });
  }
});