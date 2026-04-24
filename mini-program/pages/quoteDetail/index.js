Page({
  data: {
    id: null,
    leadId: null,
    quote: null,
    loading: true,
    isNewQuote: false,
    isEditMode: false,
    groupedItems: [],
    showCustomModal: false,
    customItem: {
      name: '',
      category: '主材',
      price: '',
      quantity: '1',
      unit: '项'
    },
    categories: ['主材', '辅材', '软装', '家电', '人工', '定制', '套餐', '其他']
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ id: options.id });
      this.loadQuote(options.id);
    } else if (options.leadId) {
      this.setData({ leadId: options.leadId });
      this.createQuote(options.leadId);
    } else {
      wx.showToast({ title: '参数错误', icon: 'none' });
    }
  },

  onShow() {
    if (this.data.id) {
      this.loadQuote(this.data.id);
    }
  },

  loadQuote(id) {
    wx.showLoading({ title: '加载中' });
    const db = wx.cloud.database();
    db.collection('quotes').doc(id).get().then(res => {
      let quote = res.data;
      // 兼容老数据：如果没有面积等字段但有客户ID，尝试获取
      if (!quote.area && quote.leadId) {
        db.collection('leads').doc(quote.leadId).get().then(leadRes => {
          const lead = leadRes.data;
          this.setData({
            'quote.area': lead.area,
            'quote.requirementType': lead.requirementType,
            'quote.budget': lead.budget
          });
        }).catch(()=>{});
      }
      if (quote.discount === undefined) quote.discount = 0;
      if (quote.final === undefined) quote.final = (quote.total || 0) - quote.discount;

      if (quote.updatedAt) {
        const d = new Date(quote.updatedAt);
        if (!isNaN(d.getTime())) {
          quote.displayTime = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        }
      } else if (quote.createdAt) {
        const d = new Date(quote.createdAt);
        if (!isNaN(d.getTime())) {
          quote.displayTime = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        }
      }

      this.setData({ quote, loading: false });
      this.processGroupedItems(quote.items || []);
      wx.hideLoading();
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '加载失败', icon: 'none' });
    });
  },

  createQuote(leadId) {
    wx.showLoading({ title: '正在生成' });
    const db = wx.cloud.database();
    db.collection('leads').doc(leadId).get().then(res => {
      const lead = res.data;
      const newQuote = {
        leadId: lead._id,
        customerNo: lead.customerNo || lead._id,
        customer: lead.name,
        phone: lead.phone,
        address: lead.address,
        area: lead.area,
        requirementType: lead.requirementType,
        budget: lead.budget,
        sales: lead.sales,
        designer: lead.designer,
        status: '初步',
        total: 0,
        discount: 0,
        final: 0,
        items: [],
        version: 1,
        modifier: wx.getStorageSync('userInfo')?.name || '未知',
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      };
      
      db.collection('quotes').add({ data: newQuote }).then(addRes => {
        newQuote._id = addRes._id;
        this.setData({ id: addRes._id, quote: newQuote, loading: false, isNewQuote: true, isEditMode: true });
        wx.hideLoading();
        // 取消提示，直接让用户停留在空白报价单编辑页面
      }).catch(() => {
        wx.hideLoading();
        wx.showToast({ title: '生成失败', icon: 'none' });
      });
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '获取客户信息失败', icon: 'none' });
    });
  },

  processGroupedItems(items) {
    const groupsMap = {};
    items.forEach((item, index) => {
      const cat = item.category || '其他';
      if (!groupsMap[cat]) groupsMap[cat] = { category: cat, items: [], subtotal: 0 };
      groupsMap[cat].items.push({ ...item, _originalIndex: index });
      groupsMap[cat].subtotal += (item.total || 0);
    });

    const groupedItems = this.data.categories
      .filter(cat => groupsMap[cat])
      .map(cat => groupsMap[cat]);
      
    // Add any categories not in the predefined list
    Object.keys(groupsMap).forEach(cat => {
      if (!this.data.categories.includes(cat)) {
        groupedItems.push(groupsMap[cat]);
      }
    });

    this.setData({ groupedItems });
  },

  goToSelectMaterial() {
    wx.navigateTo({ url: `/pages/materials/index?selectMode=true&quoteId=${this.data.id}` });
  },

  deleteItem(e) {
    const idx = e.currentTarget.dataset.index;
    const items = this.data.quote.items || [];
    items.splice(idx, 1);
    this.saveQuoteData(items);
  },

  updateQty(e) {
    const idx = e.currentTarget.dataset.index;
    const delta = parseInt(e.currentTarget.dataset.delta, 10);
    const items = this.data.quote.items || [];
    const item = items[idx];
    
    let newQty = item.quantity + delta;
    if (newQty < 1) newQty = 1;
    
    item.quantity = newQty;
    item.total = item.price * newQty;
    this.saveQuoteData(items);
  },

  onQtyInput(e) {
    const idx = e.currentTarget.dataset.index;
    let val = e.detail.value;
    
    // Allow empty string temporarily while typing
    if (val === '') {
      return; 
    }
    
    let newQty = parseFloat(val);
    if (isNaN(newQty)) return;
    
    const items = this.data.quote.items || [];
    const item = items[idx];
    
    item.quantity = newQty;
    item.total = item.price * newQty;
    this.saveQuoteData(items);
  },

  onQtyBlur(e) {
    const idx = e.currentTarget.dataset.index;
    let val = e.detail.value;
    const items = this.data.quote.items || [];
    const item = items[idx];
    
    let newQty = parseFloat(val);
    if (isNaN(newQty) || newQty < 1) {
      newQty = 1; // Fallback to 1 if invalid or < 1
    }
    
    item.quantity = newQty;
    item.total = item.price * newQty;
    this.saveQuoteData(items);
  },

  onStatusChange(e) {
    const statuses = ['初步', '确认版', '最终版'];
    const newStatus = statuses[e.detail.value];
    this.setData({ 'quote.status': newStatus });
    this.saveQuoteData(this.data.quote.items || []);
  },

  onDiscountBlur(e) {
    this.saveQuoteData(this.data.quote.items || []);
  },

  onDiscountInput(e) {
    let val = e.detail.value;
    if (val === '') {
      this.setData({ 'quote.discount': 0, 'quote.final': this.data.quote.total });
      return;
    }
    const discount = parseFloat(val);
    if (!isNaN(discount)) {
      const final = Math.max(0, this.data.quote.total - discount);
      this.setData({ 'quote.discount': discount, 'quote.final': final });
    }
  },

  saveQuoteData(items) {
    const total = items.reduce((sum, item) => sum + (item.total || 0), 0);
    const discount = parseFloat(this.data.quote.discount) || 0;
    const final = Math.max(0, total - discount);
    const status = this.data.quote.status || '初步';
    
    this.setData({ 
      'quote.items': items, 
      'quote.total': total, 
      'quote.discount': discount, 
      'quote.final': final, 
      'quote.status': status 
    });
    this.processGroupedItems(items);
  },

  saveQuote() {
    const { quote, id, isNewQuote } = this.data;
    const userInfo = wx.getStorageSync('userInfo');
    const modifierName = userInfo ? (userInfo.name || '未知') : '未知';
    const db = wx.cloud.database();
    
    const updateData = {
      items: quote.items || [],
      total: quote.total || 0,
      discount: quote.discount || 0,
      final: quote.final || 0,
      status: quote.status || '初步',
      modifier: modifierName,
      updatedAt: db.serverDate()
    };

    const doUpdate = () => {
      wx.showLoading({ title: '保存中', mask: true });
      db.collection('quotes').doc(id).update({
        data: updateData
      }).then(() => {
        wx.hideLoading();
        wx.showToast({ title: '保存成功', icon: 'success' });
        this.setData({ isNewQuote: false, isEditMode: false });
        this.addSystemFollowUpToLead(`已更新报价单，总价${updateData.final}元`);
      }).catch(() => {
        wx.hideLoading();
        wx.showToast({ title: '保存失败', icon: 'none' });
      });
    };

    const doSaveAsNew = () => {
      wx.showLoading({ title: '保存中', mask: true });
      const newQuote = {
        ...quote,
        ...updateData,
        createdAt: db.serverDate(),
        version: (quote.version || 1) + 1
      };
      delete newQuote._id;
      delete newQuote._openid;
      
      db.collection('quotes').add({ data: newQuote }).then((addRes) => {
        wx.hideLoading();
        wx.showToast({ title: '已存为新版本', icon: 'success' });
        this.setData({ id: addRes._id, quote: { ...newQuote, _id: addRes._id }, isNewQuote: false, isEditMode: false });
        this.addSystemFollowUpToLead(`已生成报价单，总价${newQuote.final}元`);
      }).catch(() => {
        wx.hideLoading();
        wx.showToast({ title: '保存失败', icon: 'none' });
      });
    };

    if (isNewQuote) {
      doUpdate();
    } else {
      wx.showModal({
        title: '保存报价单',
        content: '请选择保存方式',
        cancelText: '覆盖当前',
        confirmText: '存为新版',
        confirmColor: '#992933',
        success: (res) => {
          if (res.confirm) {
            doSaveAsNew();
          } else if (res.cancel) {
            doUpdate();
          }
        }
      });
    }
  },

  deleteQuote() {
    wx.showModal({
      title: '删除报价单',
      content: '确定要永久删除这份报价单吗？此操作不可恢复。',
      confirmColor: '#992933',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中', mask: true });
          const db = wx.cloud.database();
          db.collection('quotes').doc(this.data.id).remove().then(() => {
            wx.hideLoading();
            wx.showToast({ title: '删除成功', icon: 'success' });
            setTimeout(() => {
              wx.navigateBack();
            }, 1500);
          }).catch(() => {
            wx.hideLoading();
            wx.showToast({ title: '删除失败', icon: 'none' });
          });
        }
      }
    });
  },

  toggleEditMode() {
    this.setData({ isEditMode: !this.data.isEditMode });
  },

  openCustomModal() {
    this.setData({
      showCustomModal: true,
      customItem: { name: '', category: '主材', price: '', quantity: '1', unit: '项' }
    });
  },

  closeCustomModal() {
    this.setData({ showCustomModal: false });
  },

  onCustomInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`customItem.${field}`]: e.detail.value });
  },

  onCustomPickerChange(e) {
    const cat = this.data.categories[e.detail.value];
    this.setData({ 'customItem.category': cat });
  },

  saveCustomItem() {
    const { name, category, price, quantity, unit } = this.data.customItem;
    if (!name.trim()) return wx.showToast({ title: '请输入名称', icon: 'none' });
    if (!price || isNaN(price)) return wx.showToast({ title: '请输入有效单价', icon: 'none' });

    const qty = parseInt(quantity, 10) || 1;
    const priceNum = parseFloat(price);
    
    const newItem = {
      name,
      category,
      unit: unit || '项',
      price: priceNum,
      quantity: qty,
      total: priceNum * qty,
      sku: '非标项'
    };

    const items = this.data.quote.items || [];
    items.push(newItem);
    
    this.saveQuoteData(items);
    this.closeCustomModal();
  },

  openHistoryModal() {
    wx.showLoading({ title: '加载历史版本' });
    const db = wx.cloud.database();
    db.collection('quotes').where({
      leadId: this.data.quote.leadId
    }).orderBy('createdAt', 'asc').get().then(res => {
      const historyQuotes = res.data.map((q, index) => {
        // 动态按时间顺序编号
        q.displayVersion = index + 1;
        
        // 如果是当前正在查看的报价单，使用本地最新状态覆盖数据库数据，以便显示未保存的价格
        if (q._id === this.data.quote._id) {
          q = { ...q, ...this.data.quote, displayVersion: index + 1 };
          this.setData({ 'quote.displayVersion': index + 1 });
        }
        
        let fmt = '最近';
        if (q.updatedAt) {
          const d = new Date(q.updatedAt);
          fmt = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        }
        return { ...q, slideOffset: 0, _updatedAtFormatted: fmt };
      });
      // 这里可选择对 historyQuotes 反转以倒序显示，如果用户更喜欢最新的在最上面，不过之前已改成升序显示。按用户"V1 V2 V3"自上而下的描述，保持原数组顺序（即升序）。
      this.setData({ showHistoryModal: true, historyQuotes });
      wx.hideLoading();
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '加载失败', icon: 'none' });
    });
  },

  closeHistoryModal() {
    this.setData({ showHistoryModal: false });
  },

  onHistoryTouchStart(e) {
    if (e.touches.length === 1) {
      this.setData({
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY
      });
    }
  },

  onHistoryTouchMove(e) {
    if (e.touches.length === 1) {
      const moveX = e.touches[0].clientX;
      const moveY = e.touches[0].clientY;
      const disX = this.data.startX - moveX;
      const disY = this.data.startY - moveY;
      
      // if scrolling vertically, do not slide
      if (Math.abs(disY) > Math.abs(disX)) return;
      
      const index = e.currentTarget.dataset.index;
      const historyQuotes = this.data.historyQuotes;
      
      if (disX > 20) {
        historyQuotes[index].slideOffset = -280; // show actions (2 buttons * 140rpx)
      } else if (disX < -20) {
        historyQuotes[index].slideOffset = 0; // hide actions
      }
      this.setData({ historyQuotes });
    }
  },

  switchQuote(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ showHistoryModal: false });
    wx.redirectTo({ url: `/pages/quoteDetail/index?id=${id}` });
  },

  deleteHistoryQuote(e) {
    const id = e.currentTarget.dataset.id;
    const index = e.currentTarget.dataset.index;
    
    wx.showModal({
      title: '删除版本',
      content: '确定要永久删除这个历史版本吗？',
      confirmColor: '#992933',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中' });
          const db = wx.cloud.database();
          db.collection('quotes').doc(id).remove().then(() => {
            wx.hideLoading();
            const historyQuotes = this.data.historyQuotes;
            historyQuotes.splice(index, 1);
            this.setData({ historyQuotes });
            wx.showToast({ title: '删除成功', icon: 'success' });
            
            if (id === this.data.id) {
              setTimeout(() => { wx.navigateBack(); }, 1500);
            }
          }).catch(() => {
            wx.hideLoading();
            wx.showToast({ title: '删除失败', icon: 'none' });
          });
        }
      }
    });
  },

  addSystemFollowUpToLead(content) {
    const db = wx.cloud.database();
    const userInfo = wx.getStorageSync('userInfo');
    const operatorName = userInfo ? (userInfo.name || '未知') : '未知';
    const now = new Date();
    const nowStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    db.collection('followUps').add({
      data: {
        leadId: this.data.quote.leadId,
        content: content,
        method: '系统记录',
        createdBy: operatorName,
        createdAt: db.serverDate(),
        displayTime: nowStr,
        timestamp: db.serverDate()
      }
    }).catch(() => {});
    
    // 更新 lead lastFollowUp 和 lastFollowUpAt
    db.collection('leads').doc(this.data.quote.leadId).update({
      data: { lastFollowUp: nowStr, lastFollowUpAt: Date.now() }
    }).catch(() => {});

    // 通知相关人员
    const q = this.data.quote;
    const notifyUsers = new Set();
    
    // 如果 quote 数据里没存全人员，最好去查 lead，但为了简单直接存或使用现有
    db.collection('leads').doc(q.leadId).get().then(res => {
      const lead = res.data;
      if (lead) {
        if (lead.sales && lead.sales !== operatorName) notifyUsers.add(lead.sales);
        if (lead.designer && lead.designer !== operatorName) notifyUsers.add(lead.designer);
        if (lead.manager && lead.manager !== operatorName) notifyUsers.add(lead.manager);
        if (lead.creatorName && lead.creatorName !== operatorName) notifyUsers.add(lead.creatorName);
      }
      
      if (userInfo?.role !== 'admin') notifyUsers.add('admin');

      notifyUsers.forEach(u => {
        if (!u) return;
        db.collection('notifications').add({
          data: {
            type: 'quote',
            title: '报价单已更新',
            content: `${operatorName} 更新了客户【${q.customer || '未知'}】的报价单。`,
            senderName: operatorName,
            senderRole: userInfo.role || 'default',
            targetUser: u,
            isRead: false,
            createTime: db.serverDate(),
            link: `/pages/quoteDetail/index?leadId=${q.leadId}`
          }
        });
      });
    }).catch(() => {});
  }
});