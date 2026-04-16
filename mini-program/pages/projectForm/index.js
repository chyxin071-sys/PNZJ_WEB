Page({
  data: {
    formData: {
      managerId: '',
      startDate: ''
    },
    leads: [],
    leadIndex: -1,
    
    managers: [{ id: '', name: '无' }],
    managerIndex: 0
  },

  onLoad() {
    this.loadEmployees();
    this.loadSignedLeads();
  },

  // 辅助函数：格式化日期为 YYYY-MM-DD
  formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  // 辅助函数：跳过周末计算结束日期
  calculateEndDate(startDateStr, durationDays) {
    if (!startDateStr || durationDays <= 0) return startDateStr;
    let current = new Date(startDateStr.replace(/-/g, '/'));
    let added = 0;
    while (added < durationDays - 1) {
      current.setDate(current.getDate() + 1);
      const day = current.getDay();
      if (day !== 0 && day !== 6) {
        added++;
      }
    }
    return this.formatDate(current);
  },

  // 辅助函数：获取下一个工作日
  getNextWorkingDay(date) {
    let next = new Date(date);
    next.setDate(next.getDate() + 1);
    while (next.getDay() === 0 || next.getDay() === 6) {
      next.setDate(next.getDate() + 1);
    }
    return next;
  },

  // 辅助函数：生成完整的甘特图排期数据
  generateGanttNodes(templateNodes, baseStartDateStr) {
    let currentStartStr = baseStartDateStr;
    
    return templateNodes.map((node, index) => {
      let nodeStartDate = currentStartStr;
      let nodeEndDate = currentStartStr;
      
      const subNodes = node.subNodes.map(sub => {
        const subStart = currentStartStr;
        const subEnd = this.calculateEndDate(subStart, Number(sub.duration) || 0);
        
        if ((Number(sub.duration) || 0) > 0) {
          currentStartStr = this.formatDate(this.getNextWorkingDay(new Date(subEnd.replace(/-/g, '/'))));
        }
        
        nodeEndDate = subEnd;
        
        return {
          name: sub.name,
          duration: sub.duration,
          status: "pending",
          startDate: subStart,
          endDate: subEnd,
          records: []
        };
      });
      
      return {
        name: node.name,
        duration: node.duration,
        subNodes: subNodes,
        status: index === 0 ? 'current' : 'pending',
        startDate: subNodes.length > 0 ? subNodes[0].startDate : nodeStartDate,
        endDate: nodeEndDate,
        expanded: index === 0,
        records: [],
        delayRecords: []
      };
    });
  },

  loadSignedLeads() {
    const db = wx.cloud.database();
    db.collection('leads').where({
      status: '已签单'
    }).get().then(res => {
      const leads = res.data.map(l => ({
        ...l,
        pickerLabel: `${l.name} (${l.address || '无地址'})`
      }));
      this.setData({ leads });
    });
  },

  loadEmployees() {
    const db = wx.cloud.database();
    db.collection('users').get().then(res => {
      const managers = [{ id: '', name: '无' }];
      
      res.data.forEach(u => {
        if (u.role === 'manager') managers.push({ id: u._id, name: u.name });
      });

      this.setData({ managers });
    });
  },

  onLeadChange(e) {
    this.setData({ leadIndex: parseInt(e.detail.value) });
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`formData.${field}`]: e.detail.value
    });
  },

  onPickerChange(e) {
    const field = e.currentTarget.dataset.field;
    const idx = parseInt(e.detail.value);
    const arr = this.data[`${field}s`];
    this.setData({
      [`${field}Index`]: idx,
      [`formData.${field}Id`]: arr[idx].id
    });
  },

  saveProject() {
    const d = this.data.formData;
    if (this.data.leadIndex === -1) return wx.showToast({ title: '请选择关联客户', icon: 'none' });
    if (this.data.managerIndex === 0) return wx.showToast({ title: '请选择项目经理', icon: 'none' });
    if (!d.startDate) return wx.showToast({ title: '请选择开工时间', icon: 'none' });
    
    wx.showLoading({ title: '保存中' });
    
    // 自动计算状态逻辑
    let status = '未开工';
    const now = new Date();
    const startDate = new Date(d.startDate.replace(/-/g, '/'));
    
    // 消除时分秒影响，仅按天比较
    now.setHours(0,0,0,0);
    startDate.setHours(0,0,0,0);

    if (now.getTime() >= startDate.getTime()) {
      status = '施工中';
    }
    
    const health = '正常';
    const currentNode = 1; // 默认从第1阶段(开工)开始

    // 自动生成8大节点的排期模板
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

    // 初始化排期数据
    let projectNodes = this.generateGanttNodes(templateNodes, d.startDate);
    if (status !== '施工中') {
      projectNodes[0].status = 'pending';
    }

    const db = wx.cloud.database();
    const managerName = this.data.managers[this.data.managerIndex].name;
    const selectedLead = this.data.leads[this.data.leadIndex];

    // 计算预计完工日期（最后一个节点的结束时间）
    const expectedEndDate = projectNodes[projectNodes.length - 1].endDate;

    const projectData = {
      leadId: selectedLead._id,
      customer: selectedLead.name,
      phone: selectedLead.phone || '',
      customerNo: selectedLead.customerNo || selectedLead._id,
      address: selectedLead.address || '',
      manager: managerName === '无' ? '' : managerName,
      managerId: d.managerId,
      designer: selectedLead.designer || '',
      designerId: selectedLead.designerId || '',
      sales: selectedLead.sales || '',
      salesId: selectedLead.salesId || '',
      signDate: selectedLead.signDate || '',
      signer: selectedLead.signer || '',
      startDate: d.startDate,
      expectedEndDate: expectedEndDate,
      status: status,
      currentNode: currentNode,
      health: health,
      nodesData: projectNodes,
      createdAt: db.serverDate()
    };

    db.collection('projects').add({
      data: projectData
    }).then(() => {
      wx.hideLoading();
      wx.showToast({ title: '创建成功', icon: 'success' });
      setTimeout(() => {
        wx.navigateBack();
      }, 1000);
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '创建失败', icon: 'none' });
    });
  }
});