import { maskName } from '../../utils/format.js';
import { requestSubscribe, TEMPLATE_IDS } from '../../utils/subscribe';

Page({
  data: {
    mode: 'create', // 'create' | 'view' | 'edit'
    id: null,
    isEdit: false,
    isAdmin: false,
    isRelated: true,
    formData: {
      title: '',
      priority: 'medium',
      relatedType: 'none',
      relatedId: '',
      dueDate: '',
      assignees: [], // 存储选中的执行人信息 [{id, name}]
      description: ''
    },
    
    typeOptions: ['无关联', '关联客户', '关联工地'],
    typeValues: ['none', 'lead', 'project'],
    typeIndex: 0,
    
    relatedOptions: [],
    relatedIndex: -1,
    
    employees: [],
    selectedEmployeeNames: ''
  },

  onShow() {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo) {
      wx.reLaunch({
        url: '/pages/login/index'
      });
    }
  },

  onLoad(options) {
    wx.showLoading({ title: '加载中' });
    const db = wx.cloud.database();
    
    // 加载员工数据
    db.collection('users').get().then(res => {
      const emps = res.data.map(e => ({
        id: e._id,
        name: e.name,
        role: e.role,
        displayName: `${e.name} (${e.role === 'admin' ? '管理员' : e.role === 'designer' ? '设计师' : e.role === 'sales' ? '销售' : '项目经理'})`
      }));
      this.setData({ employees: emps });

      if (options.id) {
        wx.setNavigationBarTitle({ title: '待办详情' });
        this.setData({ isEdit: true, id: options.id, mode: 'view' });
        this.loadTodoData(options.id);
      } else {
        // 新建待办，默认执行人为当前用户
        const userInfo = wx.getStorageSync('userInfo');
        if (userInfo) {
          const myId = userInfo.id || userInfo._id;
          const myName = userInfo.name;
          const updatedEmps = emps.map(e => ({
            ...e,
            selected: e.id === myId || e.name === myName
          }));
          const currentUser = updatedEmps.find(e => e.id === myId || e.name === myName);
          
          this.setData({
            employees: updatedEmps,
            'formData.assignees': currentUser ? [{ id: currentUser.id, name: currentUser.name }] : [],
            selectedEmployeeNames: currentUser ? currentUser.name : ''
          });
        }
        wx.hideLoading();
      }
    });
  },

  enterEditMode() {
    wx.setNavigationBarTitle({ title: '编辑待办' });
    this.setData({ mode: 'edit' });
  },

  cancelEdit() {
    wx.showModal({
      title: '提示',
      content: '还未保存，确定要取消吗？',
      success: (res) => {
        if (res.confirm) {
          wx.setNavigationBarTitle({ title: '待办详情' });
          this.setData({ mode: 'view' });
          this.loadTodoData(this.data.id); // 还原数据
        }
      }
    });
  },

  goBack() {
    if (this.data.formData.title || this.data.formData.description) {
      wx.showModal({
        title: '提示',
        content: '还未保存，确定要取消吗？',
        success: (res) => {
          if (res.confirm) {
            wx.navigateBack();
          }
        }
      });
    } else {
      wx.navigateBack();
    }
  },

  loadTodoData(id) {
    const db = wx.cloud.database();
    db.collection('todos').doc(id).get().then(res => {
      const todo = res.data;
      if (todo) {
        const userInfo = wx.getStorageSync('userInfo');
        const myName = userInfo ? userInfo.name : '';
        const isAdmin = userInfo && userInfo.role === 'admin';
        
        // 判断当前用户是否与该待办相关
        const assignees = todo.assignees || [];
        const assigneeIds = assignees.map(a => a.id);
        const isRelated = isAdmin || todo.creatorName === myName || assignees.some(a => a.name === myName);
        
        const emps = this.data.employees.map(e => ({
          ...e,
          selected: assigneeIds.includes(e.id)
        }));
        const selectedNames = emps.filter(e => e.selected).map(e => e.name).join(', ');
        
        let relatedName = '';
        if (todo.relatedTo && todo.relatedTo.name) {
          if (todo.relatedTo.type === 'lead') {
            db.collection('leads').doc(todo.relatedTo.id).get().then(lRes => {
              const l = lRes.data;
              const isLeadRelated = isAdmin ||
                l.creatorName === myName ||
                l.sales === myName ||
                l.designer === myName ||
                l.manager === myName ||
                l.signer === myName ||
                l.status === '已签单';
              this.setData({
                'formData._displayRelatedName': isLeadRelated ? l.name : maskName(l.name)
              });
            }).catch(() => {
              this.setData({ 'formData._displayRelatedName': maskName(todo.relatedTo.name) });
            });
          } else {
            relatedName = todo.relatedTo.name;
          }
        }

        let formattedCreatedAt = '';
        if (todo.createdAt) {
          let timeVal = todo.createdAt;
          if (typeof todo.createdAt === 'object' && todo.createdAt.$date) {
            timeVal = typeof todo.createdAt.$date === 'number' ? todo.createdAt.$date : Number(todo.createdAt.$date);
          }
          const dateObj = new Date(timeVal);
          if (!isNaN(dateObj.getTime())) {
            const y = dateObj.getFullYear();
            const m = String(dateObj.getMonth() + 1).padStart(2, '0');
            const d = String(dateObj.getDate()).padStart(2, '0');
            const h = String(dateObj.getHours()).padStart(2, '0');
            const min = String(dateObj.getMinutes()).padStart(2, '0');
            formattedCreatedAt = `${y}-${m}-${d} ${h}:${min}`;
          } else {
            formattedCreatedAt = String(todo.createdAt);
          }
        }

        this.setData({
          isAdmin,
          isRelated,
          formData: {
            title: todo.title || '',
            priority: todo.priority || 'medium',
            status: todo.status || 'pending',
            completedAt: todo.completedAt || '',
            relatedType: todo.relatedTo ? todo.relatedTo.type : 'none',
            relatedId: todo.relatedTo ? todo.relatedTo.id : '',
            dueDate: todo.dueDate || '',
            assignees: assignees,
            description: todo.description || '',
            createdAt: formattedCreatedAt,
            _displayRelatedName: relatedName
          },
          employees: emps,
          selectedEmployeeNames: selectedNames
        });
        
        // 如果有关联对象，动态加载对应的选项
        if (todo.relatedTo && todo.relatedTo.type !== 'none') {
          this.loadRelatedOptions(todo.relatedTo.type, todo.relatedTo.id);
        } else {
          wx.hideLoading();
        }
      } else {
        wx.hideLoading();
      }
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '获取数据失败', icon: 'none' });
    });
  },

  loadRelatedOptions(typeVal, relatedId) {
    const db = wx.cloud.database();
    const collectionName = typeVal === 'lead' ? 'leads' : 'projects';
    
    db.collection(collectionName).get().then(res => {
      const userInfo = wx.getStorageSync('userInfo');
      const myName = userInfo ? userInfo.name : '';
      const isAdmin = userInfo && userInfo.role === 'admin';

      let relatedOps = [];
      if (typeVal === 'lead') {
        const filteredLeads = isAdmin ? res.data : res.data.filter(l => 
          l.sales === myName || 
          l.designer === myName || 
          l.manager === myName ||
          l.creatorName === myName ||
          l.signer === myName ||
          l.status === '已签单'
        );
        relatedOps = filteredLeads.map(l => {
          return { id: l._id, name: `${l.name} - ${l.status}` };
        });
      } else if (typeVal === 'project') {
        relatedOps = res.data.map(p => {
          const isProjRelated = isAdmin || p.creatorName === myName || p.manager === myName || p.designer === myName;
          const displayName = isProjRelated ? p.customer : maskName(p.customer);
          return { id: p._id, name: `${displayName} - ${p.address}` };
        });
      }

      const rIndex = relatedOps.findIndex(r => r.id === relatedId);
      const tIndex = this.data.typeValues.indexOf(typeVal);

      this.setData({
        typeIndex: tIndex !== -1 ? tIndex : 0,
        relatedOptions: relatedOps,
        relatedIndex: rIndex
      });
      wx.hideLoading();
    }).catch(() => {
      wx.hideLoading();
    });
  },

  onInput(e) {
    if (this.data.mode === 'view') return;
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`formData.${field}`]: e.detail.value
    });
  },

  setPriority(e) {
    if (this.data.mode === 'view') return;
    this.setData({
      'formData.priority': e.currentTarget.dataset.value
    });
  },

  onTypeChange(e) {
    if (this.data.mode === 'view') return;
    const idx = parseInt(e.detail.value);
    const typeVal = this.data.typeValues[idx];
    
    if (typeVal === 'none') {
      this.setData({
        typeIndex: idx,
        'formData.relatedType': 'none',
        relatedOptions: [],
        relatedIndex: -1,
        'formData.relatedId': ''
      });
      return;
    }

    wx.showLoading({ title: '加载选项' });
    const db = wx.cloud.database();
    const collectionName = typeVal === 'lead' ? 'leads' : 'projects';
    
    db.collection(collectionName).get().then(res => {
      const userInfo = wx.getStorageSync('userInfo');
      const myName = userInfo ? userInfo.name : '';
      const isAdmin = userInfo && userInfo.role === 'admin';

      let relatedOps = [];
      if (typeVal === 'lead') {
        // 统一逻辑：非admin可以看到"与自己相关的客户 + 已签单客户"
        const filteredLeads = isAdmin ? res.data : res.data.filter(l =>
          l.sales === myName ||
          l.designer === myName ||
          l.manager === myName ||
          l.creatorName === myName ||
          l.signer === myName ||
          l.status === '已签单'
        );
        relatedOps = filteredLeads.map(l => {
          return { id: l._id, name: `${l.name} - ${l.status}` };
        });
      } else if (typeVal === 'project') {
        relatedOps = res.data.map(p => {
          const isProjRelated = isAdmin || p.creatorName === myName || p.manager === myName || p.designer === myName;
          const displayName = isProjRelated ? p.customer : maskName(p.customer);
          return { id: p._id, name: `${displayName} - ${p.address}` };
        });
      }

      this.setData({
        typeIndex: idx,
        'formData.relatedType': typeVal,
        relatedOptions: relatedOps,
        relatedIndex: -1,
        'formData.relatedId': ''
      });
      wx.hideLoading();
    }).catch(() => {
      wx.hideLoading();
    });
  },

  onRelatedChange(e) {
    if (this.data.mode === 'view') return;
    const idx = parseInt(e.detail.value);
    this.setData({
      relatedIndex: idx,
      'formData.relatedId': this.data.relatedOptions[idx].id
    });
  },
  
  goToRelated() {
    const type = this.data.formData.relatedType;
    const id = this.data.formData.relatedId;
    if (!id || type === 'none') return;
    
    if (type === 'lead') {
      wx.navigateTo({ url: `/pages/leadDetail/index?id=${id}` });
    } else if (type === 'project') {
      wx.navigateTo({ url: `/pages/projectDetail/index?id=${id}` });
    }
  },

  onDateChange(e) {
    if (this.data.mode === 'view') return;
    this.setData({
      'formData.dueDate': e.detail.value
    });
  },

  toggleAssignee(e) {
    if (this.data.mode === 'view') return;
    const id = e.currentTarget.dataset.id;
    const emps = this.data.employees.map(emp => {
      if (emp.id === id) {
        emp.selected = !emp.selected;
      }
      return emp;
    });

    const selectedEmps = emps.filter(e => e.selected).map(e => ({ id: e.id, name: e.name }));
    const selectedNames = selectedEmps.map(e => e.name).join(', ');

    this.setData({
      employees: emps,
      'formData.assignees': selectedEmps,
      selectedEmployeeNames: selectedNames
    });
  },

  showAssigneeModal() {
    if (this.data.mode === 'view') return;
    this.setData({ showAssigneeModal: true });
  },

  hideAssigneeModal() {
    this.setData({ showAssigneeModal: false });
  },

  async saveTodo() {
    if (this.data.mode === 'view') return;
    
    const d = this.data.formData;
    if (!d.title.trim()) return wx.showToast({ title: '请输入待办标题', icon: 'none' });
    if (d.assignees.length === 0) return wx.showToast({ title: '请至少选择一位执行人', icon: 'none' });
    if (d.relatedType !== 'none' && !d.relatedId) {
      return wx.showToast({ title: '请选择关联的具体对象', icon: 'none' });
    }

    const userInfo = wx.getStorageSync('userInfo');
    const operatorName = userInfo.name || '未知人员';

    const isAssigningOthers = d.assignees.some(a => a.name !== operatorName);
    if (!this.data.isEdit && isAssigningOthers) {
      // 只有新建派发给别人时，静默请求授权
      await requestSubscribe();
    }

    wx.showLoading({ title: '保存中...' });
    const db = wx.cloud.database();
    
    let relatedTo = null; // 无关联时为 null
    if (d.relatedType !== 'none') {
      const selectedRelated = this.data.relatedOptions[this.data.relatedIndex];
      relatedTo = {
        type: d.relatedType,
        id: d.relatedId,
        name: selectedRelated ? selectedRelated.name.split(' - ')[0] : ''
      };
    }

    const updateData = {
      title: (d.title || '').trim(),
      description: (d.description || '').trim(),
      priority: d.priority,
      dueDate: d.dueDate,
      assignees: d.assignees,
      relatedTo: relatedTo
    };

    if (this.data.isEdit) {
      db.collection('todos').doc(this.data.id).get().then(oldRes => {
        const oldTodo = oldRes.data || {};
        
        db.collection('todos').doc(this.data.id).update({
          data: updateData
        }).then(() => {
          // --- 触发通知逻辑：修改了待办 ---
          const userInfo = wx.getStorageSync('userInfo');
          const operatorName = userInfo.name || '未知人员';
          
          const oldAssigneeNames = (oldTodo.assignees || []).map(a => a.name);
          const newAssigneeNames = (updateData.assignees || []).map(a => a.name);
          const allTargets = Array.from(new Set([...oldAssigneeNames, ...newAssigneeNames, 'admin']));
          
          if (userInfo.role === 'admin') {
            // 管理员修改的待办，通知全员
            db.collection('users').get().then(allUsersRes => {
              allUsersRes.data.forEach(u => {
                if (u.name !== operatorName) {
                  db.collection('notifications').add({
                    data: {
                      type: 'todo',
                      title: '全局待办任务已更新',
                      content: `${operatorName} 更新了待办任务：【${updateData.title}】的执行人或内容。`,
                      senderName: operatorName,
                      senderRole: userInfo.role || 'default',
                      targetUser: u.name,
                      isRead: false,
                      createTime: db.serverDate(),
                      link: `/pages/todoForm/index?id=${this.data.id}`
                    }
                  });
                }
              });
            });
          } else {
            allTargets.forEach(targetName => {
              if (targetName && targetName !== operatorName) {
                db.collection('notifications').add({
                  data: {
                    type: 'todo',
                    title: '待办任务已更新',
                    content: `${operatorName} 更新了待办任务：【${updateData.title}】的执行人或内容。`,
                    senderName: operatorName,
                    senderRole: userInfo.role || 'default',
                    targetUser: targetName,
                    isRead: false,
                    createTime: db.serverDate(),
                    link: `/pages/todoForm/index?id=${this.data.id}`
                  }
                });
              }
            });
          }
          
          wx.hideLoading();
          wx.showToast({ title: '修改成功', icon: 'success' });
          setTimeout(() => wx.navigateBack(), 1000);
        }).catch(() => {
          wx.hideLoading();
          wx.showToast({ title: '修改失败', icon: 'none' });
        });
      });
    } else {
      const userInfo = wx.getStorageSync('userInfo');
      updateData.status = 'pending';
      updateData.creatorId = userInfo.id || userInfo._id;
      updateData.creatorName = userInfo.name || '未知';
      updateData.createdAt = new Date().toISOString();
      
      db.collection('todos').add({
        data: updateData
      }).then((res) => {
        // --- 触发通知逻辑：新建待办 ---
        const operatorName = userInfo.name || '未知人员';
        const newTodoId = res._id;
        
        updateData.assignees.forEach(assignee => {
          if (assignee.name !== operatorName) {
            db.collection('notifications').add({
              data: {
                type: 'todo',
                title: '收到新的待办任务',
                content: `${operatorName} 给你指派了新的待办任务：【${updateData.title}】。`,
                targetUser: assignee.name,
                isRead: false,
                createTime: db.serverDate(),
                link: `/pages/todoForm/index?id=${newTodoId}`
              }
            });

            // 触发微信订阅消息（静默请求）
            wx.cloud.callFunction({
              name: 'sendSubscribeMessage',
              data: {
                receiverUserId: assignee.id,
                templateId: TEMPLATE_IDS.TODO_REMINDER,
                page: `/pages/todoForm/index?id=${newTodoId}`,
                data: {
                  thing1: { value: updateData.title.trim().substring(0, 20) },
                  time2: { value: updateData.dueDate },
                  thing3: { value: operatorName.substring(0, 20) },
                  thing4: { value: assignee.name.substring(0, 20) }
                }
              }
            }).catch(console.error);
          }
        });
        
      // 抄送给管理员或全员
      if (userInfo.role === 'admin') {
        db.collection('users').get().then(allUsersRes => {
          allUsersRes.data.forEach(u => {
            if (u.name !== operatorName) {
              db.collection('notifications').add({
                data: {
                  type: 'todo',
                  title: '收到新的全局待办',
                  content: `${operatorName} 发布了全局待办任务：【${updateData.title}】。`,
                  senderName: operatorName,
                  senderRole: userInfo.role || 'default',
                  targetUser: u.name,
                  isRead: false,
                  createTime: db.serverDate(),
                  link: `/pages/todoForm/index?id=${newTodoId}`
                }
              });
            }
          });
        });
      } else {
        db.collection('users').where({ role: 'admin' }).get().then(adminRes => {
          adminRes.data.forEach(u => {
            db.collection('notifications').add({
              data: {
                type: 'todo',
                title: '新建了待办任务',
                content: `${operatorName} 创建了待办任务：【${updateData.title}】。`,
                senderName: operatorName,
                senderRole: userInfo.role || 'default',
                targetUser: u.name,
                isRead: false,
                createTime: db.serverDate(),
                link: `/pages/todoForm/index?id=${newTodoId}`
              }
            });
          });
        });
      }

        wx.hideLoading();
        wx.showToast({ title: '新建成功', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 1000);
      }).catch(() => {
        wx.hideLoading();
        wx.showToast({ title: '新建失败', icon: 'none' });
      });
    }
  },

  deleteTodo() {
    if (!this.data.id) return;
    wx.showModal({
      title: '删除确认',
      content: '确定要删除这条待办吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中' });
          const db = wx.cloud.database();
          db.collection('todos').doc(this.data.id).remove().then(() => {
            wx.hideLoading();
            wx.showToast({ title: '删除成功', icon: 'success' });
            setTimeout(() => wx.navigateBack(), 1000);
          }).catch(() => {
            wx.hideLoading();
            wx.showToast({ title: '删除失败', icon: 'none' });
          });
        }
      }
    });
  },

  toggleTodoStatus() {
    if (!this.data.id) return;
    const currentStatus = this.data.formData.status;
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    
    wx.showLoading({ title: '处理中' });
    const db = wx.cloud.database();
    const _ = db.command;
    const now = new Date();
    const nowStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const newCompletedAt = newStatus === 'completed' ? nowStr : null;

    db.collection('todos').doc(this.data.id).update({
      data: { 
        status: newStatus,
        completedAt: newStatus === 'completed' ? nowStr : _.remove()
      }
    }).then(() => {
      // 乐观更新本地
      this.setData({
        'formData.status': newStatus,
        'formData.completedAt': newCompletedAt
      });
      wx.hideLoading();
      wx.showToast({ title: newStatus === 'completed' ? '已完成' : '已重新打开', icon: 'success' });
      
      // 如果是标记为完成，触发与外部列表一致的通知逻辑
      if (newStatus === 'completed') {
        db.collection('todos').doc(this.data.id).get().then(res => {
          const todo = res.data;
          const userInfo = wx.getStorageSync('userInfo');
          const operatorName = userInfo.name || '未知人员';
          const notifyUsers = new Set();
          
          if (todo.creatorName && todo.creatorName !== operatorName) notifyUsers.add(todo.creatorName);
          if (todo.assignees && todo.assignees.length > 0) {
            todo.assignees.forEach(a => { if (a.name !== operatorName) notifyUsers.add(a.name); });
          }
          
          notifyUsers.forEach(userName => {
            db.collection('notifications').add({
              data: {
                type: 'todo',
                title: '待办任务已完成',
                content: `${operatorName} 已完成了待办任务：【${todo.title}】。`,
                targetUser: userName,
                isRead: false,
                createTime: db.serverDate(),
                link: `/pages/todoForm/index?id=${this.data.id}`
              }
            });
          });
          
          if (userInfo.role !== 'admin') {
            db.collection('users').where({ role: 'admin' }).get().then(uRes => {
              uRes.data.forEach(u => {
                db.collection('notifications').add({
                  data: {
                    type: 'todo',
                    title: '待办任务已完成',
                    content: `${operatorName} 完成了待办任务：【${todo.title}】。`,
                    targetUser: u.name,
                    isRead: false,
                    createTime: db.serverDate(),
                    link: `/pages/todoForm/index?id=${this.data.id}`
                  }
                });
              });
            });
          }
          
          // 自动添加客户跟进记录（仅关联了客户的待办完成时）
          if (todo.relatedTo && todo.relatedTo.type === 'lead' && todo.relatedTo.id) {
            const followContent = `【待办已完成】${todo.title.trim()}`;
            db.collection('followUps').add({
              data: {
                leadId: todo.relatedTo.id,
                content: followContent,
                createdBy: operatorName,
                createdAt: db.serverDate(),
                method: '系统记录',
                displayTime: nowStr,
                timestamp: db.serverDate()
              }
            });
            db.collection('leads').doc(todo.relatedTo.id).update({
              data: { lastFollowUp: nowStr, lastFollowUpAt: Date.now() }
            });
            
            // 给相关人发红点通知
            db.collection('leads').doc(todo.relatedTo.id).get().then(resLead => {
              const lead = resLead.data;
              const leadNotifyUsers = new Set();
              if (lead.sales) leadNotifyUsers.add(lead.sales);
              if (lead.designer) leadNotifyUsers.add(lead.designer);
              if (lead.manager) leadNotifyUsers.add(lead.manager);
              if (lead.creatorName) leadNotifyUsers.add(lead.creatorName);
              db.collection('users').where({ role: 'admin' }).get().then(adminRes => {
                adminRes.data.forEach(u => leadNotifyUsers.add(u.name));
                leadNotifyUsers.forEach(u => {
                  if (u) {
                    db.collection('notifications').where({ targetUser: u, leadId: todo.relatedTo.id, type: 'lead_followup', isRead: false }).count().then(countRes => {
                      if (countRes.total === 0) {
                        db.collection('notifications').add({
                          data: { type: 'lead_followup', leadId: todo.relatedTo.id, title: '客户有新跟进记录', content: `您有一个相关的客户（${lead.name}）有了新的跟进记录。`, targetUser: u, isRead: false, createTime: db.serverDate(), link: `/pages/leadDetail/index?id=${todo.relatedTo.id}` }
                        });
                      }
                    });
                  }
                });
              });
            });
          }
        });
      }
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({ title: '操作失败', icon: 'none' });
    });
  }
});
