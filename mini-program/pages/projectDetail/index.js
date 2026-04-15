Page({
  data: {
    id: null,
    project: null,
    loading: true,
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
    subNodePhotos: []
  },

  onLoad(options) {
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
        { name: "开工", duration: 3, subNodes: ["开工仪式", "现场交底", "成品保护", "墙体拆除", "垃圾清运", "设备定位(空调/新风)", "砌筑新建", "墙体批荡"] },
        { name: "水电", duration: 7, subNodes: ["水电交底", "开槽布管", "排污下水", "线管敷设", "打压测试", "水电验收"] },
        { name: "木工", duration: 10, subNodes: ["木工交底", "吊顶龙骨", "石膏板封样", "背景墙打底", "隔墙制作", "木工验收"] },
        { name: "瓦工", duration: 15, subNodes: ["瓦工交底", "下水管包管", "防水涂刷", "闭水试验", "地面找平", "瓷砖铺贴", "瓷砖美缝", "瓦工验收"] },
        { name: "墙面", duration: 12, subNodes: ["墙面交底", "基层找平", "挂网防裂", "腻子批刮", "乳胶漆涂刷", "墙面验收"] },
        { name: "定制", duration: 20, subNodes: ["复尺测量", "厨卫吊顶", "木地板铺装", "木门安装", "柜体安装", "台面安装", "五金挂件"] },
        { name: "软装", duration: 7, subNodes: ["窗帘壁纸", "灯具安装", "开关面板", "卫浴安装", "大家电进场", "家具进场"] },
        { name: "交付", duration: 3, subNodes: ["拓荒保洁", "室内空气治理", "竣工验收", "钥匙移交", "合影留念"] }
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
            subNodes: template.subNodes.map(s => ({ name: s, status: "pending", records: [] })),
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
          subNodes: (n.subNodes || []).map(s => typeof s === 'string' ? { name: s, status: "pending", records: [] } : s),
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
    let currentStart = new Date(baseDate.replace(/-/g, '/'));
    
    return nodes.map(node => {
      if (node.status === 'completed') {
        if (node.endDate) currentStart = new Date(node.endDate.replace(/-/g, '/'));
        return node; 
      }
      
      const delayDays = (node.delayRecords || []).reduce((sum, r) => sum + (Number(r.days) || 0), 0);
      const nodeDuration = (Number(node.duration) || 0) + delayDays;
      
      const sd = new Date(currentStart);
      const ed = new Date(sd);
      ed.setDate(ed.getDate() + nodeDuration);
      
      currentStart = new Date(ed); 

      return {
        ...node,
        startDate: `${sd.getFullYear()}-${String(sd.getMonth()+1).padStart(2,'0')}-${String(sd.getDate()).padStart(2,'0')}`,
        endDate: `${ed.getFullYear()}-${String(ed.getMonth()+1).padStart(2,'0')}-${String(ed.getDate()).padStart(2,'0')}`
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

  // ==== 子工序验收 ====
  openSubNodeModal(e) {
    const { major, sub } = e.currentTarget.dataset;
    const node = this.data.nodesList[major];
    if (this.data.isEditingNodes) return;
    if (node.status === 'pending') return wx.showToast({ title: '阶段未解锁', icon: 'none' });

    this.setData({ 
      showSubNodeModal: true, 
      subNodeMajorIdx: major, 
      subNodeIdx: sub,
      subNodeRemark: '',
      subNodePhotos: []
    });
  },
  closeSubNodeModal() {
    this.setData({ showSubNodeModal: false });
  },
  onSubRemarkInput(e) {
    this.setData({ subNodeRemark: e.detail.value });
  },
  chooseSubPhotos() {
    wx.chooseMedia({
      count: 9 - this.data.subNodePhotos.length,
      mediaType: ['image'],
      success: (res) => {
        const photos = res.tempFiles.map(f => f.tempFilePath);
        this.setData({ subNodePhotos: [...this.data.subNodePhotos, ...photos] });
      }
    });
  },
  submitSubNode(e) {
    const result = e.currentTarget.dataset.result; // 'approved' or 'rejected'
    if (this.data.subNodePhotos.length === 0) return wx.showToast({ title: '请上传现场照片', icon: 'none' });
    
    wx.showLoading({ title: '提交中' });
    const { subNodeMajorIdx, subNodeIdx, subNodeRemark, subNodePhotos } = this.data;
    const nodes = [...this.data.nodesList];
    const subNode = nodes[subNodeMajorIdx].subNodes[subNodeIdx];
    
    // 模拟上传后直接保存（实际应先传云存储）
    subNode.status = result;
    subNode.records.push({
      result,
      remark: subNodeRemark,
      photos: subNodePhotos,
      createdAt: new Date().toISOString().split('T')[0]
    });

    const db = wx.cloud.database();
    db.collection('projects').doc(this.data.id).update({
      data: { nodesData: nodes }
    }).then(() => {
      this.setData({ nodesList: nodes, showSubNodeModal: false });
      wx.hideLoading();
      wx.showToast({ title: '验收已提交', icon: 'success' });
    });
  },

  showComingSoon() {
    wx.showToast({ title: '模块正在开发中', icon: 'none' });
  }
});