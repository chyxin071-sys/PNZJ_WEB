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
    projectAddress: '', // 验证页展示用

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

    const id = options.id;

    if (id) {
      this.setData({
        id: id,
        majorIdx: options.majorIdx !== undefined ? parseInt(options.majorIdx) : null,
        subIdx: options.subIdx !== undefined ? parseInt(options.subIdx) : null,
        showMode: options.majorIdx !== undefined ? 'report' : 'timeline',
        isEmployee: isEmployee
      });

      if (isEmployee) {
        this.setData({ accessStatus: 'granted' });
        this.loadProject(id);
      } else {
        this.checkAccess(id);
      }
    } else {
      this.setData({ loading: false });
      wx.showToast({ title: '参数错误', icon: 'none' });
    }
  },

  onShow() {
    // 待审核状态下返回时，重新检查是否已被审批
    if (this.data.accessStatus === 'pending' && this.data.id) {
      this.checkAccess(this.data.id);
    }
  },

  // ===== 访问控制 =====
  checkAccess(projectId) {
    // 先拿工地地址用于验证页展示
    const db = wx.cloud.database();
    db.collection('projects').doc(projectId).get().then(r => {
      if (r.data && r.data.address) {
        this.setData({ projectAddress: r.data.address });
      }
    }).catch(() => {});

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
          // 查是否有被拒绝的记录
          db.collection('shareAccess').where({ projectId, openid, status: 'rejected' }).limit(1).get().then(r3 => {
            if (r3.data.length > 0) {
              this.setData({ accessStatus: 'rejected', loading: false });
            } else {
              // 查是否有待审批记录
              db.collection('shareAccess').where({ projectId, openid, status: 'pending' }).limit(1).get().then(r2 => {
                if (r2.data.length > 0) {
                  this.setData({ accessStatus: 'pending', loading: false });
                } else {
                  // 新用户，显示 verify_phone
                  this.setData({ accessStatus: 'verify_phone', loading: false });
                }
              });
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

  // 手机号验证获取
  onGetPhoneNumber(e) {
    // 兼容微信新老版本的基础错误判断
    if (e.detail.errMsg && e.detail.errMsg.indexOf('deny') !== -1) {
      console.log('[手机验证] 用户拒绝授权', e.detail);
      wx.showToast({ title: '已取消获取', icon: 'none' });
      return;
    }
    
    if (!e.detail.code) {
      console.log('[手机验证] 获取code失败', e.detail);
      wx.showModal({ title: '提示', content: '微信未返回授权码，请尝试手动输入手机号。详细错误：' + (e.detail.errMsg || '无'), showCancel: false });
      return;
    }

    wx.showLoading({ title: '获取中...' });
    const db = wx.cloud.database();
    wx.cloud.callFunction({
      name: 'getPhoneNumber',
      data: { code: e.detail.code }
    }).then(res => {
      const phone = res.result && res.result.phone;
      console.log('[手机验证] 云函数返回', res.result, '手机号:', phone);
      
      if (!phone) {
        wx.hideLoading();
        wx.showToast({ title: '获取失败', icon: 'error' });
        return;
      }

      // 获取到手机号后，尝试直接匹配
      db.collection('projects').doc(this.data.id).get().then(projRes => {
        const projPhone = projRes.data.phone || '';
        const projCustomer = projRes.data.customer || '业主本人';
        
        const checkMatch = (dbPhone) => {
          const dbClean = dbPhone ? dbPhone.replace(/\D/g, '').slice(-11) : '';
          const wxClean = phone ? phone.replace(/\D/g, '').slice(-11) : '';
          return dbClean && wxClean && (dbClean === wxClean);
        };

        if (checkMatch(projPhone)) {
          wx.hideLoading();
          this._grantAccess({ name: projCustomer, relation: '业主本人', phone: phone.replace(/\D/g, '').slice(-11), autoApproved: true });
          return;
        }

        const leadId = projRes.data.leadId;
        if (!leadId) { 
          this.handleMismatch(phone);
          return; 
        }

        db.collection('leads').doc(leadId).get().then(leadRes => {
          const lead = leadRes.data;
          if (checkMatch(lead.phone)) {
            wx.hideLoading();
            this._grantAccess({ name: lead.name || '业主本人', relation: '业主本人', phone: phone.replace(/\D/g, '').slice(-11), autoApproved: true });
          } else {
            this.handleMismatch(phone);
          }
        }).catch(() => { 
          this.handleMismatch(phone);
        });
      }).catch(() => { 
        this.handleMismatch(phone);
      });

    }).catch((err) => {
      console.log('[手机验证] 云函数调用失败', err);
      wx.hideLoading();
      wx.showToast({ title: '获取失败', icon: 'error' });
    });
  },

  handleMismatch(phone) {
    wx.hideLoading();
    if (this.data.accessStatus === 'verify_phone') {
      wx.showModal({
        title: '提示',
        content: '未匹配到项目业主登记的手机号，请提交申请以供工作人员审核。',
        showCancel: false,
        confirmText: '去申请',
        success: () => {
          this.setData({ accessStatus: 'apply', 'applyForm.phone': phone.replace(/\D/g, '').slice(-11) });
        }
      });
    } else {
      this.setData({ 'applyForm.phone': phone.replace(/\D/g, '').slice(-11) });
      wx.showToast({ title: '手机号已获取', icon: 'success' });
    }
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

  reApply() {
    this.setData({
      accessStatus: 'apply',
      applyForm: { name: '', relation: '', phone: '' }
    });
  },

  backToVerify() {
    this.setData({ accessStatus: 'verify_phone' });
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

    // 确保有 openid 再提交
    const doSubmit = (openid) => {
      db.collection('shareAccess').add({
        data: {
          projectId: this.data.id,
          openid: openid,
          name: name.trim(),
          relation: relation.trim(),
          phone: phone.trim(),
          status: 'pending',
          createdAt: db.serverDate(),
          displayTime: nowStr
        }
      }).then(() => {
        this._notifyStaff(name.trim(), relation.trim(), nowStr);
        wx.hideLoading();
        this.setData({ accessStatus: 'pending' });
      }).catch((err) => {
        console.error('提交申请失败', err);
        wx.hideLoading();
        const errMsg = (err && err.errMsg) || (err && err.message) || JSON.stringify(err);
        wx.showModal({ title: '提交失败', content: errMsg, showCancel: false });
      });
    };

    if (this.data.myOpenId) {
      doSubmit(this.data.myOpenId);
    } else {
      // openid 还没拿到，重新获取一次
      wx.cloud.callFunction({ name: 'login' }).then(res => {
        const openid = res.result.openid || '';
        this.setData({ myOpenId: openid });
        doSubmit(openid);
      }).catch(() => {
        wx.hideLoading();
        wx.showToast({ title: '提交失败，请重试', icon: 'none' });
      });
    }
  },

  addSystemFollowUp(leadId, content) {
    if (!leadId) return;
    const db = wx.cloud.database();
    db.collection('followUps').add({
      data: {
        leadId: leadId,
        content: `【系统自动记录】\n${content}`,
        creatorName: '客户/外部访客',
        creatorRole: 'guest',
        createTime: db.serverDate(),
        type: 'system',
        location: null
      }
    }).catch(err => console.error('添加系统跟进记录失败', err));
  },

  _notifyStaff(applicantName, relation, nowStr) {
    const db = wx.cloud.database();
    const projectId = this.data.id;
    if (!projectId) return;

    const getProject = this.data.project
      ? Promise.resolve(this.data.project)
      : db.collection('projects').doc(projectId).get().then(r => r.data);

    getProject.then(p => {
      if (!p) return;
      const address = (p.address || p.customer || '未知工地').substring(0, 20);
      const notifyContent = `${applicantName}(${relation})申请查看工地进度：${address}`;

      // 写一条跟进记录
      if (p.leadId) {
        this.addSystemFollowUp(p.leadId, notifyContent);
      }

      const staffNames = [];
      if (p.sales) p.sales.split(',').map(s=>s.trim()).filter(Boolean).forEach(s => staffNames.push(s));
      if (p.designer) p.designer.split(',').map(s=>s.trim()).filter(Boolean).forEach(s => staffNames.push(s));
      if (p.manager) p.manager.split(',').map(s=>s.trim()).filter(Boolean).forEach(s => staffNames.push(s));
      db.collection('users').where({ role: db.command.in(['admin', 'manager', 'sales', 'designer']) }).limit(50).get().then(res => {
        const targets = res.data.filter(u => u.role === 'admin' || staffNames.includes(u.name));
        targets.forEach(u => {
          if (!u._id) return;
          // 写通知中心
          db.collection('notifications').add({
            data: {
              userId: u._id,
              targetUser: u.name,
              type: 'share_access_request',
              title: '有人申请查看工地进度',
              content: notifyContent,
              senderName: applicantName,
              senderRole: 'default',
              relatedId: projectId,
              relatedType: 'project',
              link: `/pages/shareAccessManage/index?projectId=${projectId}`,
              isRead: false,
              createTime: db.serverDate()
            }
          }).catch(() => {});
          // 发订阅消息
          wx.cloud.callFunction({
            name: 'sendSubscribeMessage',
            data: {
              receiverUserId: u._id,
              templateId: TEMPLATE_IDS.SHARE_ACCESS_REQUEST,
              page: `/pages/shareAccessManage/index?projectId=${projectId}`,
              data: {
                time1: { value: nowStr },
                thing2: { value: notifyContent.substring(0, 20) }
              }
            }
          }).catch(err => console.error('发送订阅消息失败', err));
        });
      }).catch(() => {});
    }).catch(() => {});
  },

  toggleFolder(e) {
    const index = e.currentTarget.dataset.index;
    const key = `groupedFiles[${index}].isCollapsed`;
    this.setData({ [key]: !this.data.groupedFiles[index].isCollapsed });
  },

  previewFile(e) {
    const item = e.currentTarget.dataset.item;
    if (!item || !item.fileID) return;

    // 尝试区分图片和其他文件
    const isImage = item.name && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(item.name);
    
    wx.showLoading({ title: '加载中...' });
    wx.cloud.getTempFileURL({
      fileList: [item.fileID],
      success: res => {
        wx.hideLoading();
        if (res.fileList && res.fileList.length > 0 && res.fileList[0].tempFileURL) {
          const tempUrl = res.fileList[0].tempFileURL;
          if (isImage) {
            wx.previewImage({
              current: tempUrl,
              urls: [tempUrl]
            });
          } else {
            wx.showLoading({ title: '正在打开文件...' });
            wx.downloadFile({
              url: tempUrl,
              success: (dlRes) => {
                if (dlRes.statusCode === 200) {
                  wx.openDocument({
                    filePath: dlRes.tempFilePath,
                    showMenu: true,
                    success: () => {
                      wx.hideLoading();
                    },
                    fail: (err) => {
                      console.error('打开文件失败', err);
                      wx.hideLoading();
                      wx.showToast({ title: '打开文件失败', icon: 'none' });
                    }
                  });
                } else {
                  wx.hideLoading();
                  wx.showToast({ title: '下载文件失败', icon: 'none' });
                }
              },
              fail: (err) => {
                console.error('下载失败', err);
                wx.hideLoading();
                wx.showToast({ title: '下载失败', icon: 'none' });
              }
            });
          }
        } else {
          wx.showToast({ title: '获取文件链接失败', icon: 'none' });
        }
      },
      fail: err => {
        console.error('getTempFileURL 失败', err);
        wx.hideLoading();
        wx.showToast({ title: '打开失败', icon: 'none' });
      }
    });
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

        // 默认只展开当前施工中的节点，其他折叠，减少渲染压力
        const nodesWithExpand = nodes.map(node => ({
          ...node,
          expanded: node.status === 'current'
        }));

        // 先渲染页面，不等图片转换
        this.setData({ project: p, nodesList: nodesWithExpand, reportNode, loading: false });
        wx.hideLoading();

        if (this.data.showMode === 'report' && reportNode) {
          wx.setNavigationBarTitle({ title: `${reportNode.name} 验收报告` });
          // 报告模式：只转换当前节点的图片
          this._convertNodeImages(nodesWithExpand, this.data.majorIdx, this.data.subIdx);
        } else {
          // 时间轴模式：只转换有记录的节点图片（按需，不阻塞渲染）
          this._convertAllNodeImages(nodesWithExpand);
        }

        // 获取该工地的材料清单和项目资料
        if (p.leadId) {
          db.collection('leads').doc(p.leadId).get().then(leadRes => {
            const lead = leadRes.data;
            const materials = lead.materialList || [];
            
            // 处理项目资料
            let files = lead.files || [];
            if (!this.data.isEmployee) {
              files = files.filter(f => f.isVisible !== false);
            }

            const folders = lead.fileFolders || ['默认文件夹'];
            const sortedFiles = files.map(f => {
              let dTime = '刚刚';
              if (f.uploadTime) dTime = String(f.uploadTime).substring(0, 10);
              else if (f.createdAt) dTime = String(f.createdAt).substring(0, 10);
              const folderName = f.folderName || folders[0] || '默认文件夹';
              return { ...f, displayTime: dTime, folderName };
            }).sort((a, b) => {
              const timeA = a && a.uploadTime ? String(a.uploadTime) : '';
              const timeB = b && b.uploadTime ? String(b.uploadTime) : '';
              return timeB.localeCompare(timeA);
            });

            const groupedFiles = folders.map(folderName => {
              const existingGroup = (this.data.groupedFiles || []).find(g => g.folderName === folderName);
              return {
                folderName: folderName,
                items: sortedFiles.filter(f => f.folderName === folderName),
                isCollapsed: existingGroup ? existingGroup.isCollapsed : false
              };
            }).filter(g => this.data.isEmployee || g.items.length > 0);

            this.setData({ 
              materials, 
              groupedMaterials: this.computeGroupedMaterials(materials),
              files: sortedFiles,
              groupedFiles
            });
          }).catch(() => {});
        }
      } else {
        this.setData({ loading: false });
        wx.hideLoading();
      }
    }).catch(err => {
      console.error('获取分享页面数据失败', err);
      this.setData({ loading: false });
      wx.hideLoading();
    });
  },

  // 只转换单个子节点的图片（报告模式用）
  _convertNodeImages(nodes, majorIdx, subIdx) {
    const sub = nodes[majorIdx] && nodes[majorIdx].subNodes && nodes[majorIdx].subNodes[subIdx];
    if (!sub) return;
    const ids = [];
    if (sub.acceptanceRecord && sub.acceptanceRecord.photos) {
      sub.acceptanceRecord.photos.forEach(photo => {
        const url = typeof photo === 'string' ? photo : photo.url;
        if (url && url.indexOf('cloud://') === 0) ids.push(url);
      });
    }
    if (sub.signature && sub.signature.url && sub.signature.url.indexOf('cloud://') === 0) {
      ids.push(sub.signature.url);
    }
    if (ids.length === 0) return;
    wx.cloud.getTempFileURL({
      fileList: [...new Set(ids)],
      success: (r) => {
        const urlMap = {};
        r.fileList.forEach(f => { if (f.tempFileURL) urlMap[f.fileID] = f.tempFileURL; });
        const newNodes = this.data.nodesList;
        const s = newNodes[majorIdx].subNodes[subIdx];
        if (s.acceptanceRecord && s.acceptanceRecord.photos) {
          s.acceptanceRecord.photos = s.acceptanceRecord.photos.map(photo => {
            if (typeof photo === 'string') return urlMap[photo] || photo;
            return photo.url ? { ...photo, url: urlMap[photo.url] || photo.url } : photo;
          });
        }
        if (s.signature && s.signature.url) {
          s.signature = { ...s.signature, url: urlMap[s.signature.url] || s.signature.url };
        }
        this.setData({
          nodesList: newNodes,
          reportNode: newNodes[majorIdx].subNodes[subIdx]
        });
      }
    });
  },

  // 转换所有节点图片（时间轴模式，后台静默执行）
  _convertAllNodeImages(nodes) {
    const ids = [];
    nodes.forEach(node => {
      (node.subNodes || []).forEach(sub => {
        if (sub.acceptanceRecord && sub.acceptanceRecord.photos) {
          sub.acceptanceRecord.photos.forEach(photo => {
            const url = typeof photo === 'string' ? photo : photo.url;
            if (url && url.indexOf('cloud://') === 0) ids.push(url);
          });
        }
        if (sub.signature && sub.signature.url && sub.signature.url.indexOf('cloud://') === 0) {
          ids.push(sub.signature.url);
        }
      });
    });
    if (ids.length === 0) return;
    wx.cloud.getTempFileURL({
      fileList: [...new Set(ids)],
      success: (r) => {
        const urlMap = {};
        r.fileList.forEach(f => { if (f.tempFileURL) urlMap[f.fileID] = f.tempFileURL; });
        const newNodes = this.data.nodesList;
        newNodes.forEach(node => {
          (node.subNodes || []).forEach(sub => {
            if (sub.acceptanceRecord && sub.acceptanceRecord.photos) {
              sub.acceptanceRecord.photos = sub.acceptanceRecord.photos.map(photo => {
                if (typeof photo === 'string') return urlMap[photo] || photo;
                return photo.url ? { ...photo, url: urlMap[photo.url] || photo.url } : photo;
              });
            }
            if (sub.signature && sub.signature.url) {
              sub.signature = { ...sub.signature, url: urlMap[sub.signature.url] || sub.signature.url };
            }
          });
        });
        this.setData({ nodesList: newNodes });
      }
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
        // 压缩签字图片再上传，减小文件体积
        wx.compressImage({
          src: tempPath,
          quality: 60,
          success: (compRes) => {
            this._uploadSignature(compRes.tempFilePath);
          },
          fail: () => {
            // 压缩失败则用原图
            this._uploadSignature(tempPath);
          }
        });
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '生成图片失败', icon: 'error' });
      }
    });
  },

  _uploadSignature(filePath) {
    const cloudPath = `signature/${this.data.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
    wx.cloud.uploadFile({
      cloudPath,
      filePath,
      success: (uploadRes) => {
        this.updateNodeAfterSignature(uploadRes.fileID);
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '上传签名失败', icon: 'error' });
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
    if (project.manager) project.manager.split(',').map(s=>s.trim()).filter(Boolean).forEach(u => notifyUsers.add(u));
    if (project.sales) project.sales.split(',').map(s=>s.trim()).filter(Boolean).forEach(u => notifyUsers.add(u));
    if (project.designer) project.designer.split(',').map(s=>s.trim()).filter(Boolean).forEach(u => notifyUsers.add(u));

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
            senderName: '客户',
            senderRole: 'default',
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
              senderName: '客户',
              senderRole: 'default',
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