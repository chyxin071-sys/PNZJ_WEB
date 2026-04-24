// pages/projectShare/index.js
import { TEMPLATE_IDS } from '../../utils/subscribe';

Page({
  data: {
    id: null,
    project: null,
    nodesList: [],
    materials: [],
    loading: true,
    showMode: 'timeline',
    activeTab: 'progress',
    majorIdx: null,
    subIdx: null,
    reportNode: null,
    isEmployee: false,

    // 访问控制
    accessStatus: 'checking', // 'checking' | 'granted' | 'verify_phone' | 'apply' | 'pending' | 'rejected'
    applyForm: { name: '', relation: '', phone: '' },
    myOpenId: '',

    // 签字相关
    showSignatureBoard: false,
    signHasDrawn: false,
    signMajorIdx: null,
    signSubIdx: null,
    customerFeedback: '' // 客户反馈
  },

  signatureCtx: null,
  signatureCanvas: null,

  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab });
  },

  onLoad(options) {
    const userInfo = wx.getStorageSync('userInfo');
    const isEmployee = userInfo && userInfo.role && ['admin', 'manager', 'sales', 'designer', 'finance'].includes(userInfo.role);

    if (options.id) {
      this.setData({
        id: options.id,
        majorIdx: options.majorIdx !== undefined ? parseInt(options.majorIdx) : null,
        subIdx: options.subIdx !== undefined ? parseInt(options.subIdx) : null,
        showMode: options.majorIdx !== undefined ? 'report' : 'timeline',
        isEmployee: isEmployee
      });

      if (isEmployee) {
        // 内部员工直接放行
        this.setData({ accessStatus: 'granted' });
        this.loadProject(options.id);
      } else {
        // 外部用户走访问控制
        this.checkAccess(options.id);
      }
    } else {
      this.setData({ loading: false });
      wx.showToast({ title: '参数错误', icon: 'none' });
    }
  },

  // ===== 访问控制 =====
  checkAccess(projectId) {
    wx.cloud.callFunction({ name: 'login' }).then(res => {
      const openid = res.result.openid;
      this.setData({ myOpenId: openid });
      const db = wx.cloud.database();
      // 查是否已有通过的访问记录
      db.collection('shareAccess').where({ projectId, openid, status: 'approved' }).limit(1).get().then(r => {
        if (r.data.length > 0) {
          this.setData({ accessStatus: 'granted' });
          this.loadProject(projectId);
        } else {
          // 查是否有待审批记录
          db.collection('shareAccess').where({ projectId, openid, status: 'pending' }).limit(1).get().then(r2 => {
            if (r2.data.length > 0) {
              this.setData({ accessStatus: 'pending', loading: false });
            } else {
              // 新用户，先尝试手机号验证
              this.setData({ accessStatus: 'verify_phone', loading: false });
            }
          });
        }
      }).catch(() => {
        this.setData({ accessStatus: 'verify_phone', loading: false });
      });
    }).catch(() => {
      this.setData({ accessStatus: 'verify_phone', loading: false });
    });
  },

  // 手机号验证
  onGetPhoneNumber(e) {
    if (e.detail.errno !== 0 || !e.detail.code) {
      // 用户拒绝授权，直接进申请流程
      this.setData({ accessStatus: 'apply' });
      return;
    }
    wx.showLoading({ title: '验证中...' });
    const db = wx.cloud.database();
    // 用 code 换手机号（需要云函数解密，这里用云调用）
    wx.cloud.callFunction({
      name: 'getPhoneNumber',
      data: { code: e.detail.code }
    }).then(res => {
      const phone = res.result && res.result.phone;
      if (!phone) { wx.hideLoading(); this.setData({ accessStatus: 'apply' }); return; }
      // 查 leads 里是否有这个手机号且关联这个工地
      db.collection('projects').doc(this.data.id).get().then(projRes => {
        const leadId = projRes.data.leadId;
        if (!leadId) { wx.hideLoading(); this.setData({ accessStatus: 'apply' }); return; }
        db.collection('leads').doc(leadId).get().then(leadRes => {
          const lead = leadRes.data;
          const matched = lead.phone && (lead.phone.replace(/\s/g,'') === phone.replace(/\s/g,''));
          wx.hideLoading();
          if (matched) {
            // 手机号匹配，自动写入已通过记录
            this._grantAccess({ name: lead.name || '业主本人', relation: '业主本人', phone, autoApproved: true });
          } else {
            this.setData({ accessStatus: 'apply' });
          }
        }).catch(() => { wx.hideLoading(); this.setData({ accessStatus: 'apply' }); });
      }).catch(() => { wx.hideLoading(); this.setData({ accessStatus: 'apply' }); });
    }).catch(() => { wx.hideLoading(); this.setData({ accessStatus: 'apply' }); });
  },

  _grantAccess(info) {
    const db = wx.cloud.database();
    const now = new Date();
    const nowStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    db.collection('shareAccess').add({
      data: {
        projectId: this.data.id,
        openid: this.data.myOpenId,
        name: info.name,
        relation: info.relation,
        phone: info.phone || '',
        status: 'approved',
        autoApproved: info.autoApproved || false,
        createdAt: db.serverDate(),
        displayTime: nowStr
      }
    }).then(() => {
      this.setData({ accessStatus: 'granted' });
      this.loadProject(this.data.id);
    });
  },

  skipToApply() {
    this.setData({ accessStatus: 'apply' });
  },

  // 申请表单输入
  onApplyInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`applyForm.${field}`]: e.detail.value });
  },

  // 提交申请
  submitApply() {
    const { name, relation, phone } = this.data.applyForm;
    if (!name.trim()) return wx.showToast({ title: '请填写姓名', icon: 'none' });
    if (!relation.trim()) return wx.showToast({ title: '请填写与业主关系', icon: 'none' });

    wx.showLoading({ title: '提交中...' });
    const db = wx.cloud.database();
    const now = new Date();
    const nowStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    db.collection('shareAccess').add({
      data: {
        projectId: this.data.id,
        openid: this.data.myOpenId,
        name: name.trim(),
        relation: relation.trim(),
        phone: phone.trim(),
        status: 'pending',
        createdAt: db.serverDate(),
        displayTime: nowStr
      }
    }).then(() => {
      // 通知工地关联员工
      this._notifyStaff(name.trim(), relation.trim(), nowStr);
      wx.hideLoading();
      this.setData({ accessStatus: 'pending' });
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '提交失败，请重试', icon: 'none' });
    });
  },

  _notifyStaff(applicantName, relation, nowStr) {
    const p = this.data.project;
    if (!p) return;
    const db = wx.cloud.database();
    const address = (p.address || p.customer || '未知工地').substring(0, 20);
    const thing2Val = `申请人：${applicantName} | 关系：${relation} | 工地：${address}`;

    // 查工地关联员工 + 所有管理员
    const staffNames = [p.sales, p.designer, p.manager].filter(Boolean);
    db.collection('users').where({ role: db.command.in(['admin', 'manager', 'sales', 'designer']) }).limit(50).get().then(res => {
      const targets = res.data.filter(u => u.role === 'admin' || staffNames.includes(u.name));
      targets.forEach(u => {
        if (!u._id) return;
        wx.cloud.callFunction({
          name: 'sendSubscribeMessage',
          data: {
            receiverUserId: u._id,
            templateId: TEMPLATE_IDS.SHARE_ACCESS_REQUEST,
            page: `/pages/shareAccessManage/index?projectId=${this.data.id}`,
            data: {
              time1: { value: nowStr },
              thing2: { value: thing2Val.substring(0, 20) }
            }
          }
        }).catch(() => {});
      });
    }).catch(() => {});
  },

  computeGroupedMaterials(materials) {
    const categories = ['主材', '辅材', '全屋定制', '家电软装', '其他'];
    const groups = categories.map(cat => ({
      category: cat,
      items: materials.filter(m => m.category === cat)
    })).filter(g => g.items.length > 0);
    
    const otherItems = materials.filter(m => !categories.includes(m.category));
    if (otherItems.length > 0) {
      const otherGroup = groups.find(g => g.category === '其他');
      if (otherGroup) {
        otherGroup.items.push(...otherItems);
      } else {
        groups.push({ category: '其他', items: otherItems });
      }
    }
    return groups;
  },

  loadProject(id) {
    wx.showLoading({ title: '加载中...' });
    const db = wx.cloud.database();
    
    db.collection('projects').doc(id).get().then(res => {
      const p = res.data;
      if (p) {
        const nodes = p.nodesData || [];
        let reportNode = null;
        
        if (this.data.showMode === 'report' && this.data.majorIdx !== null && this.data.subIdx !== null) {
          if (nodes[this.data.majorIdx] && nodes[this.data.majorIdx].subNodes && nodes[this.data.majorIdx].subNodes[this.data.subIdx]) {
            reportNode = nodes[this.data.majorIdx].subNodes[this.data.subIdx];
            this.setData({ reportMajorIdx: this.data.majorIdx, reportSubIdx: this.data.subIdx });
          }
        }

        // 获取该工地的材料清单（从对应的 lead 中获取）
        if (p.leadId) {
          db.collection('leads').doc(p.leadId).get().then(leadRes => {
            const materials = leadRes.data.materialList || [];
            this.setData({ 
              materials: materials,
              groupedMaterials: this.computeGroupedMaterials(materials)
            });
          }).catch(err => console.error('获取材料清单失败', err));
        }

        this.setData({
          project: p,
          nodesList: nodes,
          reportNode: reportNode,
          loading: false
        });
        
        if (this.data.showMode === 'report' && reportNode) {
          wx.setNavigationBarTitle({ title: `${reportNode.name} 验收报告` });
        }
      } else {
        this.setData({ loading: false });
      }
      wx.hideLoading();
    }).catch(err => {
      console.error('获取分享页面数据失败', err);
      this.setData({ loading: false });
      wx.hideLoading();
    });
  },

  viewFullTimeline() {
    this.setData({ showMode: 'timeline' });
    wx.setNavigationBarTitle({ title: '工地进度汇报' });
  },

  toggleNode(e) {
    const idx = e.currentTarget.dataset.index;
    const nodes = this.data.nodesList;
    // 如果之前没有 expanded 属性，默认是 true（展开），点击后变为 false
    if (nodes[idx].expanded === undefined) {
      nodes[idx].expanded = false;
    } else {
      nodes[idx].expanded = !nodes[idx].expanded;
    }
    this.setData({ nodesList: nodes });
  },

  previewPhoto(e) {
    const { url, majorIdx, subIdx } = e.currentTarget.dataset;
    let photoItems = [];
    
    // 分两种情况：
    // 1. 如果是从完整时间轴列表里点击的图片 (有 majorIdx 和 subIdx)
    if (majorIdx !== undefined && subIdx !== undefined && subIdx !== null) {
      const subNode = this.data.nodesList[majorIdx].subNodes[subIdx];
      if (subNode && subNode.acceptanceRecord && subNode.acceptanceRecord.photos) {
        photoItems = subNode.acceptanceRecord.photos;
      }
    } 
    // 2. 如果是从单节点报告（顶部区域）点击的图片
    else if (this.data.reportNode && this.data.reportNode.acceptanceRecord) {
      photoItems = this.data.reportNode.acceptanceRecord.photos || [];
    }

    // 提取出所有图片的 url（过滤掉视频）
    let urls = photoItems
      .filter(p => typeof p === 'string' || !p.type || p.type === 'image')
      .map(p => typeof p === 'string' ? p : p.url);

    if (urls.length === 0) {
      urls = [url]; // 兜底
    }

    wx.previewImage({
      current: url,
      urls: urls,
      showmenu: true
    });
  },

  goBackToSystem() {
    wx.reLaunch({ url: '/pages/index/index' });
  },

  // ==== 客户签字画板逻辑 ====
  preventTouchMove() {},

  openSignatureBoard(e) {
    const { major, sub } = e.currentTarget.dataset;
    this.setData({
      showSignatureBoard: true,
      signMajorIdx: major,
      signSubIdx: sub,
      signHasDrawn: false,
      customerFeedback: '' // 重置反馈内容
    });
    setTimeout(() => {
      this.initSignatureCanvas();
    }, 300);
  },

  closeSignatureBoard() {
    this.setData({
      showSignatureBoard: false,
      customerFeedback: ''
    });
    this.signatureCtx = null;
    this.signatureCanvas = null;
  },

  onFeedbackInput(e) {
    this.setData({ customerFeedback: e.detail.value });
  },

  initSignatureCanvas() {
    const query = wx.createSelectorQuery();
    query.select('#signatureCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0] || !res[0].node) return;
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio;
        canvas.width = res[0].width * dpr;
        canvas.height = res[0].height * dpr;
        ctx.scale(dpr, dpr);
        
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#1e293b';

        this.signatureCtx = ctx;
        this.signatureCanvas = canvas;
        this.setData({ signHasDrawn: false });
      });
  },

  signatureTouchStart(e) {
    if (!this.signatureCtx) return;
    const ctx = this.signatureCtx;
    const touch = e.touches[0];
    ctx.beginPath();
    ctx.moveTo(touch.x, touch.y);
  },

  signatureTouchMove(e) {
    if (!this.signatureCtx) return;
    const ctx = this.signatureCtx;
    const touch = e.touches[0];
    ctx.lineTo(touch.x, touch.y);
    ctx.stroke();
    ctx.moveTo(touch.x, touch.y);
    if (!this.data.signHasDrawn) {
      this.setData({ signHasDrawn: true });
    }
  },

  signatureTouchEnd(e) {
    if (!this.signatureCtx) return;
    this.signatureCtx.closePath();
  },

  clearSignature() {
    if (!this.signatureCtx || !this.signatureCanvas) return;
    const ctx = this.signatureCtx;
    const canvas = this.signatureCanvas;
    const dpr = wx.getSystemInfoSync().pixelRatio;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    this.setData({ signHasDrawn: false });
  },

  submitSignature() {
    if (!this.data.signHasDrawn) {
      return wx.showToast({ title: '请先在画板上签名', icon: 'none' });
    }

    wx.showLoading({ title: '提交中...', mask: true });

    wx.canvasToTempFilePath({
      canvas: this.signatureCanvas,
      success: (res) => {
        const tempPath = res.tempFilePath;
        const cloudPath = `signature/${this.data.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.png`;
        
        wx.cloud.uploadFile({
          cloudPath,
          filePath: tempPath,
          success: (uploadRes) => {
            this.updateNodeAfterSignature(uploadRes.fileID);
          },
          fail: (err) => {
            wx.hideLoading();
            wx.showToast({ title: '上传签名失败', icon: 'error' });
          }
        });
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '生成图片失败', icon: 'error' });
      }
    });
  },

  updateNodeAfterSignature(fileID) {
    const { signMajorIdx, signSubIdx, project } = this.data;
    let nodes = JSON.parse(JSON.stringify(project.nodesData));
    const sub = nodes[signMajorIdx].subNodes[signSubIdx];

    const nowFull = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    })();

    sub.status = 'completed';
    sub.signature = {
      url: fileID,
      time: nowFull,
      feedback: this.data.customerFeedback.trim() || '' // 保存客户反馈
    };

    const isFirst = signSubIdx === 0;
    const isLast = signSubIdx === nodes[signMajorIdx].subNodes.length - 1;
    const nowStr = nowFull.split(' ')[0];

    // 如果签的是首个小工序，激活中间所有小工序
    if (isFirst) {
      let middleCount = 0;
      for (let i = 1; i < nodes[signMajorIdx].subNodes.length - 1; i++) {
        if (nodes[signMajorIdx].subNodes[i].status === 'pending') {
          nodes[signMajorIdx].subNodes[i].status = 'current';
          nodes[signMajorIdx].subNodes[i].actualStartDate = nowStr;
          middleCount++;
        }
      }
      // 如果中间没有工序，直接激活最后一个工序
      if (middleCount === 0 && nodes[signMajorIdx].subNodes.length > 1) {
        const lastNode = nodes[signMajorIdx].subNodes[nodes[signMajorIdx].subNodes.length - 1];
        if (lastNode.status === 'pending') {
          lastNode.status = 'current';
          lastNode.actualStartDate = nowStr;
        }
      }
    }

    // 如果签的是最后一个小工序，完成大节点，激活下一个大节点的首个小工序
    let newCurrentNode = project.currentNode || 1;
    let newProjectStatus = project.status;
    let expectedEndDate = project.expectedEndDate;

    if (isLast) {
      nodes[signMajorIdx].status = 'completed';
      nodes[signMajorIdx].actualEndDate = nowStr;

      if (signMajorIdx + 1 < nodes.length) {
        nodes[signMajorIdx + 1].status = 'current';
        nodes[signMajorIdx + 1].actualStartDate = nowStr;
        newCurrentNode = signMajorIdx + 2;

        const nextSubNodes = nodes[signMajorIdx + 1].subNodes;
        if (nextSubNodes && nextSubNodes.length > 0) {
          if (nextSubNodes[0].status === 'pending') {
            nextSubNodes[0].status = 'current';
            nextSubNodes[0].actualStartDate = nowStr;
          }
        }
      }
      const isFinished = signMajorIdx + 1 >= nodes.length;
      newProjectStatus = isFinished ? '已竣工' : project.status;
    }

    const db = wx.cloud.database();
    db.collection('projects').doc(this.data.id).update({
      data: {
        nodesData: nodes,
        currentNode: newCurrentNode,
        status: newProjectStatus
      }
    }).then(() => {
      // 更新页面数据
      const updatedProject = {
        ...project,
        nodesData: nodes,
        status: newProjectStatus,
        currentNode: newCurrentNode
      };

      // 更新 reportNode（从更新后的 nodes 中获取最新数据）
      const updatedReportNode = nodes[signMajorIdx].subNodes[signSubIdx];

      this.setData({
        showSignatureBoard: false,
        project: updatedProject,
        nodesList: nodes,
        reportNode: updatedReportNode
      });

      // 发送通知和添加跟进记录
      this.sendSignatureNotifications(updatedReportNode);

      wx.hideLoading();
      wx.showToast({ title: '签字确认成功', icon: 'success' });
    }).catch(err => {
      console.error('保存签字失败:', err);
      wx.hideLoading();
      wx.showToast({ title: '保存失败，请重试', icon: 'error' });
    });
  },

  sendSignatureNotifications(subNode) {
    const db = wx.cloud.database();
    const { project } = this.data;
    const now = new Date();
    const nowStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    // 构建跟进记录内容
    let followUpContent = `客户已签字确认【${subNode.name}】工序\n签字时间：${subNode.signature.time}`;
    if (subNode.signature.feedback) {
      followUpContent += `\n\n客户反馈：\n${subNode.signature.feedback}`;
    }

    // 添加系统跟进记录
    if (project.leadId) {
      db.collection('followUps').add({
        data: {
          leadId: project.leadId,
          content: followUpContent,
          method: '系统记录',
          createdBy: '客户',
          createdAt: db.serverDate(),
          displayTime: nowStr,
          timestamp: db.serverDate()
        }
      }).then(() => {
        // 更新客户的 lastFollowUp 和 lastFollowUpAt
        db.collection('leads').doc(project.leadId).update({
          data: { lastFollowUp: nowStr, lastFollowUpAt: Date.now() }
        }).catch(err => console.error('更新lastFollowUp失败', err));
      }).catch(err => console.error('添加跟进记录失败', err));
    }

    // 通知相关人员
    const notifyUsers = new Set();
    if (project.manager) notifyUsers.add(project.manager);
    if (project.sales) notifyUsers.add(project.sales);
    if (project.designer) notifyUsers.add(project.designer);

    const notificationContent = `客户已签字确认【${subNode.name}】工序${subNode.signature.feedback ? '，并留下了反馈意见' : ''}。`;

    db.collection('users').where({ role: 'admin' }).get().then(res => {
      res.data.forEach(u => {
        notifyUsers.add(u.name);
      });

      notifyUsers.forEach(userName => {
        // 发送给工地关联（跳工地）
        db.collection('notifications').add({
          data: {
            type: 'project',
            title: '客户已签字确认',
            content: `工地【${project.address}】- ${notificationContent}`,
            targetUser: userName,
            isRead: false,
            createTime: db.serverDate(),
            link: `/pages/projectDetail/index?id=${this.data.id}`
          }
        }).catch(err => console.error('发送通知失败', err));
        
        // 额外发送一条给客户线索（跳线索，用于触发红点）
        if (project.leadId) {
          db.collection('notifications').add({
            data: {
              type: 'lead',
              title: '客户有新跟进',
              content: `【工地签字】工地【${project.address}】- ${notificationContent}`,
              targetUser: userName,
              isRead: false,
              createTime: db.serverDate(),
              link: `/pages/leadDetail/index?id=${project.leadId}`
            }
          }).catch(err => console.error('发送通知失败', err));
        }
      });
    });

    // 发送微信订阅消息
    const notifyNames = Array.from(notifyUsers);
    if (notifyNames.length > 0 || true) { // Admin should also get it
      const queryConds = [{ role: 'admin' }];
      if (notifyNames.length > 0) {
        queryConds.push({ name: db.command.in(notifyNames) });
      }
      
      db.collection('users').where(db.command.or(queryConds)).get().then(res => {
        if (res.data && res.data.length > 0) {
          res.data.forEach(userDoc => {
            wx.cloud.callFunction({
              name: 'sendSubscribeMessage',
              data: {
                receiverUserId: userDoc._id,
                templateId: TEMPLATE_IDS.PROJECT_UPDATE,
                page: `/pages/projectDetail/index?id=${this.data.id}`,
                data: {
                  thing1: { value: (project.address || project.customer || '未知项目').substring(0, 20) }, // 项目名称
                  time2: { value: nowStr }, // 更新时间
                  thing4: { value: '客户'.substring(0, 20) }, // 操作员
                  thing6: { value: '客户已签字确认并反馈'.substring(0, 20) }, // 备注
                  thing7: { value: subNode.name.substring(0, 20) } // 更新内容
                }
              }
            }).catch(console.error);
          });
        }
      }).catch(console.error);
    }
  },

  onShareAppMessage() {
    const defaultLogoUrl = '/assets/icons/logo.png';

    if (this.data.showMode === 'report' && this.data.reportNode) {
      let titleSuffix = '验收报告';
      if (this.data.reportNode.name.includes('仪式') || this.data.reportNode.name.includes('开工') || this.data.reportNode.name.includes('交底')) {
        titleSuffix = '现场记录';
      }
      return {
        title: `【${this.data.reportNode.name}】${titleSuffix} - ${this.data.project.address}`,
        path: `/pages/projectShare/index?id=${this.data.id}&majorIdx=${this.data.majorIdx}&subIdx=${this.data.subIdx}`,
        imageUrl: defaultLogoUrl
      };
    }
    return {
      title: `工地进度汇报：${this.data.project ? this.data.project.address : '施工动态'}`,
      path: `/pages/projectShare/index?id=${this.data.id}`,
      imageUrl: defaultLogoUrl
    };
  }
});