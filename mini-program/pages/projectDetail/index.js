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
    uploadFiles: []
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
      
      // 生成或恢复 11 个大节点数据
      const templateNodes = [
        "施工准备", "拆除工程", "水电工程", "泥瓦工程", "木作工程", "油漆工程", 
        "安装工程", "定制安装", "软装进场", "预验收", "竣工交付"
      ];
      
      let projectNodes = p.nodesData || [];
      if (!projectNodes || projectNodes.length === 0) {
        projectNodes = templateNodes.map((name, index) => {
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
            name,
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

  showComingSoon() {
    wx.showToast({ title: '模块正在开发中', icon: 'none' });
  }
});