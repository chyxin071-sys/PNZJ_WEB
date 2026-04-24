import { requestSubscribe, TEMPLATE_IDS } from '../../utils/subscribe';

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
      designer: '',
      manager: ''
    },
    
    ratingOptions: ['A', 'B', 'C', 'D'],
    statusOptions: ['待跟进', '沟通中', '已量房', '方案阶段', '已交定金', '已签单', '已流失'],
    reqOptions: ['毛坯', '旧改', '精装微调'],
    budgetOptions: ['暂无', '10-20万', '20-30万', '30-50万', '50万以上'],
    sourceOptions: ['自然进店', '老介新', '抖音', '自有关系', '其他'],
    customSource: '',
    
    salesList: [],
    designerList: [],
    managerList: [],
    salesIndex: -1,
    designerIndex: -1,
    managerIndex: -1
  },

  onLoad(options) {
    wx.showLoading({ title: '加载中' });
    const db = wx.cloud.database();
    
    // 获取员工列表
    db.collection('users').get().then(res => {
      const emps = res.data;
      const sales = emps.filter(e => e.role === 'sales' || e.role === 'admin').sort((a, b) => (a.role === 'admin' ? 1 : -1) - (b.role === 'admin' ? 1 : -1));
      const designers = emps.filter(e => e.role === 'designer' || e.role === 'admin').sort((a, b) => (a.role === 'admin' ? 1 : -1) - (b.role === 'admin' ? 1 : -1));
      const managers = emps.filter(e => e.role === 'manager' || e.role === 'admin').sort((a, b) => (a.role === 'admin' ? 1 : -1) - (b.role === 'admin' ? 1 : -1));
      
      this.setData({ salesList: sales, designerList: designers, managerList: managers });

      if (options.id) {
        wx.setNavigationBarTitle({ title: '编辑客户' });
        this.setData({ id: options.id, isEdit: true });
        this.loadLeadData(options.id);
      } else {
        // 新建客户，根据创建人身份自动关联
        const userInfo = wx.getStorageSync('userInfo');
        let formDataSales = '';
        let formDataDesigner = '';
        let formDataManager = '';
        let sIdx = -1;
        let dIdx = -1;
        let mIdx = -1;

        if (options.defaultSales) {
          formDataSales = options.defaultSales;
          sIdx = sales.findIndex(s => s.name === options.defaultSales);
        }
        if (options.defaultDesigner) {
          formDataDesigner = options.defaultDesigner;
          dIdx = designers.findIndex(d => d.name === options.defaultDesigner);
        }
        if (options.defaultManager) {
          formDataManager = options.defaultManager;
          mIdx = managers.findIndex(m => m.name === options.defaultManager);
        }

        this.setData({
          'formData.sales': formDataSales,
          'formData.designer': formDataDesigner,
          'formData.manager': formDataManager,
          salesIndex: sIdx,
          designerIndex: dIdx,
          managerIndex: mIdx
        });
        wx.hideLoading();
      }
    });

    wx.enableAlertBeforeUnload({
      message: '内容尚未保存，确定要返回吗？',
      success: () => {},
      fail: () => {}
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
        const managerIdx = this.data.managerList.findIndex(m => m.name === lead.manager);
        
        const leadSource = lead.source || '自然进店';
        const isStandardSource = this.data.sourceOptions.includes(leadSource);

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
            source: isStandardSource ? leadSource : '其他',
            sales: lead.sales || '',
            designer: lead.designer || '',
            manager: lead.manager || ''
          },
          customSource: isStandardSource ? '' : leadSource,
          originalStatus: lead.status || '待跟进',
          salesIndex: salesIdx,
          designerIndex: designerIdx,
          managerIndex: managerIdx
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

  inputCustomSource(e) {
    this.setData({ customSource: e.detail.value });
  },

  async saveLead() {
    const d = this.data.formData;
    if (!(d.name || '').trim()) return wx.showToast({ title: '请输入姓名', icon: 'none' });
    if (!(d.phone || '').trim()) return wx.showToast({ title: '请输入电话', icon: 'none' });

    if (d.source === '其他') {
      if (!this.data.customSource.trim()) {
        return wx.showToast({ title: '请输入客户来源', icon: 'none' });
      }
      d.source = this.data.customSource.trim();
    }

    // 拦截“已签单”状态
    if (d.status === '已签单' && this.data.originalStatus !== '已签单') {
      this.setData({
        showSignModal: true,
        signDate: new Date().toISOString().split('T')[0]
      });
      return;
    }

    const userInfo = wx.getStorageSync('userInfo');
    const operatorName = userInfo.name || '未知';
    const isAssigningOthers = (d.sales && d.sales !== operatorName) || (d.designer && d.designer !== operatorName);
    if (isAssigningOthers) {
      await requestSubscribe();
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

  async executeSave(signDate = null) {
    const d = this.data.formData;
    const db = wx.cloud.database();
    const userInfo = wx.getStorageSync('userInfo');
    const operatorName = userInfo.name || '未知';
    const now = new Date();
    const nowStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    wx.showLoading({ title: '保存中...', mask: true });
    
    let updateData = { ...d };
    if (signDate) {
      updateData.signDate = signDate;
    }

    if (this.data.isEdit) {
      // 获取旧客户数据用于对比姓名是否变化
      db.collection('leads').doc(this.data.id).get().then(oldRes => {
        const oldLead = oldRes.data;
        const oldName = oldLead ? oldLead.name : '';

        // 这是修改客户的情况
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
            manager: d.manager,
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
                  customer: d.name,
                  address: d.address,
                  sales: d.sales,
                  designer: d.designer,
                  manager: d.manager
                }
              });
            });
          });

          // --- 如果客户姓名发生变化，同步更新所有关联记录 ---
          if (oldName && d.name && oldName !== d.name) {
            const newName = d.name;

            // 1. 同步待办中的关联客户名称
            db.collection('todos').where({ 'relatedTo.id': this.data.id }).get().then(res => {
              res.data.forEach(todo => {
                if (todo.relatedTo && todo.relatedTo.type === 'lead') {
                  db.collection('todos').doc(todo._id).update({
                    data: { 'relatedTo.name': newName }
                  });
                }
              });
            }).catch(err => console.error('同步待办客户名称失败', err));

            // 2. 同步通知中的客户名称（替换内容中的客户姓名）
            db.collection('notifications').where({ link: `/pages/leadDetail/index?id=${this.data.id}` }).get().then(res => {
              res.data.forEach(notif => {
                if (notif.content && notif.content.includes(oldName)) {
                  const newContent = notif.content.replace(new RegExp(oldName, 'g'), newName);
                  db.collection('notifications').doc(notif._id).update({
                    data: { content: newContent }
                  });
                }
              });
            }).catch(err => console.error('同步通知客户名称失败', err));
          }

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
          
          db.collection('users').where({ name: d.sales }).get().then(res => {
            if (res.data && res.data.length > 0) {
              wx.cloud.callFunction({
                name: 'sendSubscribeMessage',
                data: {
                  receiverUserId: res.data[0]._id,
                  templateId: TEMPLATE_IDS.PROJECT_UPDATE,
                  page: `/pages/leadDetail/index?id=${this.data.id}`,
                  data: {
                    thing1: { value: d.name.substring(0, 20) },
                    time2: { value: nowStr },
                    thing4: { value: operatorName.substring(0, 20) },
                    thing6: { value: '请及时联系跟进' },
                    thing7: { value: '已分配给你跟进' }
                  }
                }
              }).catch(console.error);
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

          db.collection('users').where({ name: d.designer }).get().then(res => {
            if (res.data && res.data.length > 0) {
              wx.cloud.callFunction({
                name: 'sendSubscribeMessage',
                data: {
                  receiverUserId: res.data[0]._id,
                  templateId: TEMPLATE_IDS.PROJECT_UPDATE,
                  page: `/pages/leadDetail/index?id=${this.data.id}`,
                  data: {
                    thing1: { value: d.name.substring(0, 20) },
                    time2: { value: nowStr },
                    thing4: { value: operatorName.substring(0, 20) },
                    thing6: { value: '请及时出具设计方案' },
                    thing7: { value: '已分配给你跟进方案' }
                  }
                }
              }).catch(console.error);
            }
          });
          }

          if (userInfo.role !== 'admin') {
            db.collection('users').where({ role: 'admin' }).get().then(adminRes => {
              adminRes.data.forEach(u => {
                db.collection('notifications').add({
                  data: {
                    type: 'lead', title: '客户线索已更新',
                    content: `${operatorName} 更新了客户【${d.name}】的资料。`,
                    targetUser: u.name, isRead: false, createTime: db.serverDate(),
                    link: `/pages/leadDetail/index?id=${this.data.id}`
                  }
                });
              });
            });
          }

          wx.hideLoading();

          // 添加系统跟进记录
          const now = new Date();
          const nowStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
          const followContent = `更新了客户资料`;
          db.collection('followUps').add({
            data: {
              leadId: this.data.id,
              content: followContent,
              method: '系统记录',
              createdBy: operatorName,
              createdAt: db.serverDate(),
              displayTime: nowStr,
              timestamp: db.serverDate()
            }
          }).catch(err => {
            console.error('添加系统跟进记录失败', err);
          });

          // 更新客户的 lastFollowUp 和 lastFollowUpAt 字段
          db.collection('leads').doc(this.data.id).update({
            data: { lastFollowUp: nowStr, lastFollowUpAt: Date.now() }
          }).catch(err => {
            console.error('更新lastFollowUp失败', err);
          });

          // 发送红点通知给相关人
          const sysNotifyUsers = new Set();
          if (d.sales) sysNotifyUsers.add(d.sales);
          if (d.designer) sysNotifyUsers.add(d.designer);
          if (d.manager) sysNotifyUsers.add(d.manager);
          if (d.creatorName) sysNotifyUsers.add(d.creatorName);

          db.collection('users').where({ role: 'admin' }).get().then(adminRes => {
            adminRes.data.forEach(u => {
              sysNotifyUsers.add(u.name);
            });

            sysNotifyUsers.forEach(u => {
              if (!u) return;
              db.collection('notifications').add({
                data: {
                  type: 'lead',
                  title: '系统通知',
                  content: `【系统自动记录】${followContent}`,
                  targetUser: u,
                  isRead: false,
                  createTime: db.serverDate(),
                  link: `/pages/leadDetail/index?id=${this.data.id}`
                }
              }).catch(() => {});
            });
          });

          if (this.data.isSigningNow) {
            // 签单全员通知
            db.collection('users').limit(100).get().then(resEmp => {
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
            }).catch(err => {
              console.error('发送签单通知失败', err);
            });
            // 如果是签单，显示开单喜报弹窗（不使用 setTimeout，等待用户手动点击返回）
            this.setData({
              showSuccessModal: true,
              isSigningNow: false
            });
          } else {
            // 普通修改，提示后返回
            wx.showToast({ title: '保存成功', icon: 'success' });
            wx.disableAlertBeforeUnload();
            this._backTimer = setTimeout(() => {
              wx.navigateBack();
              this._backTimer = null;
            }, 1000);
          }
        }).catch(() => {
          wx.hideLoading();
          wx.showToast({ title: '修改失败', icon: 'none' });
        });
      }).catch(() => {
        wx.hideLoading();
        wx.showToast({ title: '获取旧数据失败', icon: 'none' });
      });
    } else {
      // 新增逻辑已在其他地方处理
      // TODO: 触发通知逻辑已移至新增处理处
    }
  },

  onHide() {
    if (this._backTimer) {
      clearTimeout(this._backTimer);
      this._backTimer = null;
    }
  },

  onUnload() {
    wx.disableAlertBeforeUnload();
    if (this._backTimer) {
      clearTimeout(this._backTimer);
      this._backTimer = null;
    }
  },

  closeSuccessAndBack() {
    this.setData({ showSuccessModal: false });
    wx.disableAlertBeforeUnload();
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
            wx.disableAlertBeforeUnload();
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