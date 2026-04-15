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
    showFilesModal: false
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
        { name: "开工", subNodes: ["开工仪式", "现场交底", "成品保护", "墙体拆除", "砌筑新建"] },
        { name: "水电", subNodes: ["水电交底", "开槽布管", "线管敷设", "打压测试", "水电验收"] },
        { name: "木工", subNodes: ["木工交底", "吊顶龙骨", "石膏板封样", "隔墙制作", "木工验收"] },
        { name: "瓦工", subNodes: ["瓦工交底", "防水涂刷", "闭水试验", "瓷砖铺贴", "瓦工验收"] },
        { name: "墙面", subNodes: ["墙面交底", "基层找平", "挂网防裂", "腻子批刮", "乳胶漆涂刷", "墙面验收"] },
        { name: "定制", subNodes: ["复尺测量", "柜体安装", "木门安装", "台面安装", "五金挂件"] },
        { name: "软装", subNodes: ["灯具安装", "卫浴安装", "开关面板", "家具进场", "窗帘壁纸"] },
        { name: "交付", subNodes: ["拓荒保洁", "室内空气治理", "竣工验收", "钥匙移交", "合影留念"] }
      ];
      
      let projectNodes = p.nodesData || [];
      if (!projectNodes || projectNodes.length === 0) {
        projectNodes = templateNodes.map((template, index) => {
          // 根据 currentNode 初始化状态和时间
          let status = 'pending';
          let startDate = '', endDate = '';
          if (index < currentNode - 1) {
            status = 'completed';
            // 模拟历史时间
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
            subNodes: template.subNodes,
            status,
            startDate,
            endDate,
            expanded: index === currentNode - 1, // 当前节点默认展开
            records: []
          };
        });
      } else {
        // 确保 expanded 状态正确
        projectNodes = projectNodes.map((node, index) => {
          return { ...node, expanded: node.expanded || index === currentNode - 1 };
        });
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
    wx.showLoading({ title: '处理中' });
    const nodes = [...this.data.nodesList];
    const nowStr = new Date().toISOString().split('T')[0];
    
    // 更新当前节点
    nodes[nodeIndex].status = 'completed';
    nodes[nodeIndex].endDate = nowStr;

    let newCurrentNode = this.data.currentNodeIndex + 1;

    // 如果还有下一个节点
    if (nodeIndex + 1 < nodes.length) {
      nodes[nodeIndex + 1].status = 'current';
      nodes[nodeIndex + 1].startDate = nowStr;
      
      const nextEnd = new Date();
      nextEnd.setDate(nextEnd.getDate() + 5);
      nodes[nodeIndex + 1].endDate = `${nextEnd.getFullYear()}-${String(nextEnd.getMonth()+1).padStart(2,'0')}-${String(nextEnd.getDate()).padStart(2,'0')}`;
      
      newCurrentNode = nodeIndex + 2;
    }

    const isFinished = nodeIndex + 1 >= nodes.length;
    const newProjectStatus = isFinished ? '已竣工' : this.data.project.status;

    const db = wx.cloud.database();
    db.collection('projects').doc(this.data.id).update({
      data: {
        nodesData: nodes,
        currentNode: newCurrentNode,
        status: newProjectStatus
      }
    }).then(() => {
      this.setData({ 
        nodesList: nodes, 
        currentNodeIndex: newCurrentNode - 1,
        'project.status': newProjectStatus
      });
      // 展开下一个节点
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

  showComingSoon() {
    wx.showToast({ title: '模块正在开发中', icon: 'none' });
  }
});