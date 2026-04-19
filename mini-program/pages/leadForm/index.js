Page({
  data: {
    id: null,
    isEdit: false,
    oldSales: '',
    oldDesigner: '',
    formData: {
      name: '',
      phone: '',
      address: '',
      area: '',
      rating: 'C',
      status: '待跟进',
      requirementType: '毛坯',
      budget: '暂无',
      source: '自然进店',
      sales: '',
      designer: ''
    },
    
    ratingOptions: ['A', 'B', 'C', 'D'],
    statusOptions: ['待跟进', '沟通中', '已量房', '方案阶段', '已交定金', '已签单', '已流失'],
    reqOptions: ['毛坯', '旧改', '精装微调'],
    budgetOptions: ['暂无', '10-20万', '20-30万', '30-50万', '50万以上'],
    sourceOptions: ['自然进店', '老介新', '抖音', '小红书', '大众点评', '自有关系', '其他'],
    
    salesList: [],
    designerList: [],
    salesIndex: -1,
    designerIndex: -1
  },

  onLoad(options) {
    wx.showLoading({ title: '加载中' });
    const db = wx.cloud.database();
    
    // 获取员工列表
    db.collection('users').get().then(res => {
      const emps = res.data;
      const sales = emps.filter(e => e.role === 'sales' || e.role === 'admin');
      const designers = emps.filter(e => e.role === 'designer' || e.role === 'admin');
      
      this.setData({ salesList: sales, designerList: designers });

      if (options.id) {
        wx.setNavigationBarTitle({ title: '编辑客户' });
        this.setData({ id: options.id, isEdit: true });
        this.loadLeadData(options.id);
      } else {
        wx.hideLoading();
      }
    });
  },

  loadLeadData(id) {
    const db = wx.cloud.database();
    db.collection('leads').doc(id).get().then(res => {
      wx.hideLoading();
      const lead = res.data;
      if (lead) {
        const salesIdx = this.data.salesList.findIndex(s => s.name === lead.sales);
        const designerIdx = this.data.designerList.findIndex(d => d.name === lead.designer);
        
        this.setData({
          oldSales: lead.sales || '',
          oldDesigner: lead.designer || '',
          formData: {
            name: lead.name || '',
            phone: lead.phone || '',
            address: lead.address || '',
            area: lead.area || '',
            rating: lead.rating || 'C',
            status: lead.status || '待跟进',
            requirementType: lead.requirementType || lead.requirement || '毛坯',
            budget: lead.budget || '暂无',
            source: lead.source || '自然进店',
            sales: lead.sales || '',
            designer: lead.designer || ''
          },
          originalStatus: lead.status || '待跟进',
          salesIndex: salesIdx,
          designerIndex: designerIdx
        });
      }
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '获取数据失败', icon: 'none' });
    });
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`formData.${field}`]: e.detail.value
    });
  },

  onPickerChange(e) {
    const field = e.currentTarget.dataset.field;
    const optionsName = e.currentTarget.dataset.options;
    const val = this.data[optionsName][e.detail.value];
    this.setData({
      [`formData.${field}`]: val
    });
  },

  onEmpChange(e) {
    const field = e.currentTarget.dataset.field; // sales or designer
    const listName = e.currentTarget.dataset.list; // salesList or designerList
    const indexName = e.currentTarget.dataset.index;
    
    const idx = e.detail.value;
    const emp = this.data[listName][idx];
    
    this.setData({
      [indexName]: idx,
      [`formData.${field}`]: emp.name
    });
  },

  saveLead() {
    const d = this.data.formData;
    if (!(d.name || '').trim()) return wx.showToast({ title: '请输入姓名', icon: 'none' });
    if (!(d.phone || '').trim()) return wx.showToast({ title: '请输入电话', icon: 'none' });

    // 拦截“已签单”状态
    if (d.status === '已签单' && this.data.originalStatus !== '已签单') {
      this.setData({
        showSignModal: true,
        signDate: new Date().toISOString().split('T')[0]
      });
      return;
    }

    this.executeSave();
  },

  onSignDateChange(e) {
    this.setData({ signDate: e.detail.value });
  },

  closeSignModal() {
    this.setData({ showSignModal: false });
  },

  confirmSign() {
    this.setData({ 
      showSignModal: false,
      isSigningNow: true // 标记当前正在进行签单保存操作
    });
    
    // 震动反馈
    wx.vibrateShort();

    const app = getApp();
    app.globalData = app.globalData || {};
    app.globalData.triggerSignAnimation = true; // 标记需要在首页播放动效（右上角的 +1 可以保留，不影响页面返回）

    this.executeSave(this.data.signDate);
  },

  executeSave(signDate = null) {
    const d = this.data.formData;
    wx.showLoading({ title: '保存中...', mask: true });
    const db = wx.cloud.database();
    
    let updateData = { ...d };
    if (signDate) {
      updateData.signDate = signDate;
    }

    if (this.data.isEdit) {
      db.collection('leads').doc(this.data.id).update({
        data: updateData
      }).then(() => {
        // --- 触发通知逻辑：线索已更新 ---
        const userInfo = wx.getStorageSync('userInfo');
        const operatorName = userInfo.name || '未知人员';
        
        // --- 同步更新关联的报价单和工地数据 ---
        const syncData = {
          customer: d.name,
          phone: d.phone,
          address: d.address,
          sales: d.sales,
          designer: d.designer,
          area: d.area,
          budget: d.budget,
          requirementType: d.requirementType
        };
        
        // 微信小程序云开发不支持直接通过 where update 更新多条记录的 API 调用（除非通过云函数）
        // 在客户端直接调用需要循环，或者尽量通过云函数。这里为了快速实现，我们先查询再循环更新
        db.collection('quotes').where({ leadId: this.data.id }).get().then(res => {
          res.data.forEach(q => {
            db.collection('quotes').doc(q._id).update({ data: syncData });
          });
        });
        
        db.collection('projects').where({ leadId: this.data.id }).get().then(res => {
          res.data.forEach(p => {
            db.collection('projects').doc(p._id).update({ 
              data: {
                address: d.address,
                sales: d.sales,
                designer: d.designer
              } 
            });
          });
        });

        const notifyUsers = new Set();
        if (d.sales && d.sales !== operatorName) notifyUsers.add(d.sales);
        if (d.designer && d.designer !== operatorName) notifyUsers.add(d.designer);

        // 精准通知：分配了新销售
        if (d.sales && d.sales !== this.data.oldSales) {
          db.collection('notifications').add({
            data: {
              type: 'lead', title: '你有一条新线索',
              content: `客户【${d.name}】已分配给你跟进。`,
              targetUser: d.sales, isRead: false, createTime: db.serverDate(),
              link: `/pages/leadDetail/index?id=${this.data.id}`
            }
          });
        }
        // 精准通知：分配了新设计师
        if (d.designer && d.designer !== this.data.oldDesigner) {
          db.collection('notifications').add({
            data: {
              type: 'lead', title: '你有一条新设计任务',
              content: `客户【${d.name}】已分配给你跟进方案。`,
              targetUser: d.designer, isRead: false, createTime: db.serverDate(),
              link: `/pages/leadDetail/index?id=${this.data.id}`
            }
          });
        }

        if (userInfo.role !== 'admin') {
          db.collection('notifications').add({
            data: {
              type: 'lead', title: '客户线索已更新',
              content: `${operatorName} 更新了客户【${d.name}】的资料。`,
              targetUser: 'admin', isRead: false, createTime: db.serverDate(),
              link: `/pages/leadDetail/index?id=${this.data.id}`
            }
          });
        }
        
        wx.hideLoading();
        
        if (this.data.isSigningNow) {
          // 签单全员通知
          db.collection('employees').get().then(resEmp => {
            resEmp.data.forEach(u => {
              db.collection('notifications').add({
                data: {
                  type: 'lead', title: '🎉 恭喜开单',
                  content: `好消息！客户【${d.name}】已成功签单，大家再接再厉！`,
                  targetUser: u.name, isRead: false, createTime: db.serverDate(),
                  link: `/pages/leadDetail/index?id=${this.data.id}`
                }
              });
            });
          });
          // 如果是签单，显示开单喜报弹窗（不使用 setTimeout，等待用户手动点击返回）
          this.setData({ 
            showSuccessModal: true,
            isSigningNow: false
          });
        } else {
          // 普通修改，提示后返回
          wx.showToast({ title: '修改成功', icon: 'success' });
          this._backTimer = setTimeout(() => {
            wx.navigateBack();
            this._backTimer = null;
          }, 1000);
        }
      }).catch(() => {
        wx.hideLoading();
        wx.showToast({ title: '修改失败', icon: 'none' });
      });
    } else {
      // 新增逻辑已在其他地方处理
    }
  },

  onHide() {
    if (this._backTimer) {
      clearTimeout(this._backTimer);
      this._backTimer = null;
    }
  },

  onUnload() {
    if (this._backTimer) {
      clearTimeout(this._backTimer);
      this._backTimer = null;
    }
  },

  closeSuccessAndBack() {
    this.setData({ showSuccessModal: false });
    wx.navigateBack();
  },

  deleteLead() {
    wx.showModal({
      title: '删除线索',
      content: '删除后无法恢复，确定要删除这个客户吗？',
      confirmColor: '#e11d48',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中' });
          const db = wx.cloud.database();
          db.collection('leads').doc(this.data.id).remove().then(() => {
            wx.hideLoading();
            wx.showToast({ title: '已删除', icon: 'success' });
            setTimeout(() => {
              // 返回到列表页（返回两层：返回上一页是详情页，再上一层是列表）
              wx.navigateBack({ delta: 2 });
            }, 1000);
          }).catch(err => {
            wx.hideLoading();
            wx.showToast({ title: '删除失败', icon: 'none' });
          });
        }
      }
    });
  },

  goBack() {
    wx.navigateBack();
  }
});