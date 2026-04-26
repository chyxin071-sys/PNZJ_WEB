Page({
  data: {
    leadId: null,
    lead: null,
    files: [],
    groupedFiles: [], // 新增文件夹分组数据
    folders: ['默认文件夹'], // 当前所有文件夹名称
    folderOptions: [],
    showMoveFileModal: false,
    moveTargetFileID: '',
    moveFolderIndex: 0,
    moveNewFolderName: '',
    materials: [], // 新增材料清单数据
    loading: true,
    isUploader: false,
    activeTab: 'files', // 'files' | 'materials'
    showMaterialModal: false,
    materialForm: {
      category: '瓷砖/木地板',
      region: '',
      brand: '',
      model: '',
      spec: '',
      quantity: '',
      remark: '',
      frameColor: '',
      coreColor: '',
      doorModel: '',
      itemCategory: '',
      name: '',
      cabinetBody: '',
      cabinetDoor: '',
      handle: ''
    },
    regionOptions1: ['客餐厅', '主卫墙面', '主卫地面', '客卫墙面', '客卫地面', '干区墙面', '厨房墙面', '自定义'],
    regionOptions2: ['卫生间', '厨房', '卧室', '窗套', '入户门套', '自定义'],
    regionOptions4: ['厨房', '卫生间', '自定义'],
    regionIndex: 0,
    showCustomRegion: false,
    materialOptions: ['窗台石', '踢脚线', '橱柜台面', '水槽', '开关插座', '自定义'],
    materialIndex: 0,
    showCustomName: false,
    materialHint: '', // 智能提示文字
    categories: ['瓷砖/木地板', '木门/金属门', '壁布/乳胶漆/护墙板', '集成吊顶/电器', '全屋定制衣柜', '全屋定制橱柜', '其他'],
    editMaterialIndex: -1,

    // 新增：上传时的文件夹选择弹窗
    showFolderSelectModal: false,
    tempUploadFiles: [],
    selectedFolderIndex: 0,
    newFolderName: '',
    uploadVisibility: 'internal',

    // 新增：文件夹重命名与删除
    showRenameFolderModal: false,
    oldFolderName: '',
    renameFolderNameInput: ''
  },

  onLoad(options) {
    if (options.leadId) {
      this.setData({ leadId: options.leadId });
      this.fetchFiles();
    } else {
      wx.showToast({ title: '参数错误', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1000);
    }
  },

  onShow() {
    if (this.data.leadId && !this.data.loading) {
      this.fetchFiles();
    }
  },

  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab });
  },

  computeGroupedMaterials(materials) {
    const categories = ['瓷砖/木地板', '木门/金属门', '壁布/乳胶漆/护墙板', '集成吊顶/电器', '全屋定制衣柜', '全屋定制橱柜', '其他'];

    // 为每条记录添加展示信息
    const processedMaterials = materials.map(m => {
      const item = { ...m };

      // 根据分类定制展示信息
      if (m.category === '瓷砖/木地板') {
        item.displayTitle = [m.region, m.brand].filter(Boolean).join(' | ');
        item.displayLine1 = [m.model ? `型号：${m.model}` : '', m.spec ? `规格：${m.spec}` : ''].filter(Boolean).join(' | ');
        item.displayLine2 = m.quantity ? `数量：${m.quantity}` : '';
      } else if (m.category === '木门/金属门') {
        item.displayTitle = [m.region, m.brand].filter(Boolean).join(' | ');
        item.displayLine1 = [
          m.frameColor ? `边框：${m.frameColor}` : '',
          m.coreColor ? `门芯：${m.coreColor}` : '',
          m.doorModel ? `门型：${m.doorModel}` : ''
        ].filter(Boolean).join(' | ');
        item.displayLine2 = '';
      } else if (m.category === '壁布/乳胶漆/护墙板') {
        item.displayTitle = [m.region, m.itemCategory, m.brand].filter(Boolean).join(' | ');
        item.displayLine1 = [m.model ? `型号：${m.model}` : '', m.quantity ? `数量：${m.quantity}` : ''].filter(Boolean).join(' | ');
        item.displayLine2 = '';
      } else if (m.category === '集成吊顶/电器') {
        item.displayTitle = [m.region, m.name].filter(Boolean).join(' | ');
        item.displayLine1 = [m.spec ? `规格：${m.spec}` : '', m.quantity ? `数量：${m.quantity}` : ''].filter(Boolean).join(' | ');
        item.displayLine2 = '';
      } else if (m.category === '全屋定制衣柜' || m.category === '全屋定制橱柜') {
        const type = m.category === '全屋定制衣柜' ? '衣柜' : '橱柜';
        item.displayTitle = [m.region, type, m.brand].filter(Boolean).join(' | ');
        item.displayLine1 = [
          m.cabinetBody ? `柜体：${m.cabinetBody}` : '',
          m.cabinetDoor ? `柜门：${m.cabinetDoor}` : '',
          m.handle ? `拉手：${m.handle}` : ''
        ].filter(Boolean).join(' | ');
        item.displayLine2 = '';
      } else if (m.category === '其他') {
        item.displayTitle = m.name || '';
        item.displayLine1 = '';
        item.displayLine2 = '';
      }

      return item;
    });

    const groups = categories.map(cat => ({
      category: cat,
      items: processedMaterials.filter(m => m.category === cat)
    }));

    // 处理分类外的异常数据
    const otherItems = processedMaterials.filter(m => !categories.includes(m.category));
    if (otherItems.length > 0) {
      const otherGroup = groups.find(g => g.category === '其他');
      if (otherGroup) {
        otherGroup.items.push(...otherItems);
      }
    }
    return groups;
  },

  fetchFiles() {
    const db = wx.cloud.database();
    Promise.all([
      db.collection('leads').doc(this.data.leadId).get(),
      db.collection('projects').where({ leadId: this.data.leadId }).limit(1).get()
    ])
      .then(([leadRes, projRes]) => {
        const lead = leadRes.data;
        const project = projRes.data.length > 0 ? projRes.data[0] : null;
        
        const userInfo = wx.getStorageSync('userInfo');
        const myName = userInfo ? userInfo.name : '';
        const isAdmin = userInfo && userInfo.role === 'admin';
        
        // 允许上传和删除的人：管理员，或者客户相关的责任人，或者工地相关的责任人
        const isLeadRelated = lead.creatorName === myName || lead.sales === myName || lead.designer === myName || lead.signer === myName;
        const isProjectRelated = project ? (project.manager === myName || project.creatorName === myName) : false;
        
        const isUploader = isAdmin || isLeadRelated || isProjectRelated;

        // 如果没有 files 数组则初始化为空数组
        let files = lead.files || [];
        // 获取材料清单并初始化所有图片的编辑状态为 false（即查看模式）
        const materials = (lead.materialList || []).map(m => ({ ...m, isEditingImages: false }));
        const groupedMaterials = this.computeGroupedMaterials(materials);
        
        // 初始化文件夹列表
        const folders = lead.fileFolders || ['默认文件夹'];
        const folderOptions = [...folders, '新建文件夹...'];
        
        // 提取 projectId 用于分享
        const projectId = project ? project._id : '';

        // 过滤文件：如果不是 uploader，只能看到 isVisible !== false 的文件
        if (!isUploader) {
          files = files.filter(f => f.isVisible !== false);
        }
        
        // 修正：确保在调用 sort 和 localeCompare 之前，files 数组中对象格式正确
        const sortedFiles = files.map(f => {
          // 在 JS 里预先处理好显示时间，避免 WXML 中使用复杂表达式失效
          let dTime = '刚刚';
          if (f.uploadTime) {
            dTime = String(f.uploadTime).substring(0, 10);
          } else if (f.createdAt) {
            dTime = String(f.createdAt).substring(0, 10);
          }
          // 确保每个文件都有文件夹名称，如果没有默认为 folders[0]
          const folderName = f.folderName || folders[0] || '默认文件夹';
          return { ...f, displayTime: dTime, folderName };
        }).sort((a, b) => {
          const timeA = a && a.uploadTime ? String(a.uploadTime) : '';
          const timeB = b && b.uploadTime ? String(b.uploadTime) : '';
          return timeB.localeCompare(timeA);
        });
        
        // 按文件夹分组
        const groupedFiles = folders.map(folderName => {
          const existingGroup = this.data.groupedFiles.find(g => g.folderName === folderName);
          return {
            folderName: folderName,
            items: sortedFiles.filter(f => f.folderName === folderName),
            isCollapsed: existingGroup ? existingGroup.isCollapsed : false
          };
        }).filter(g => isUploader || g.items.length > 0); // 客户不显示空文件夹

        this.setData({
          lead: lead,
          projectId: projectId,
          project: project,
          files: sortedFiles,
          groupedFiles: groupedFiles,
          folders: folders,
          folderOptions: folderOptions,
          materials: materials,
          groupedMaterials: groupedMaterials,
          isUploader,
          loading: false
        });
      })
      .catch(err => {
        console.error('获取项目资料失败', err);
        wx.showToast({ title: '获取数据失败', icon: 'none' });
        this.setData({ loading: false });
      });
  },

  toggleFolder(e) {
    const index = e.currentTarget.dataset.index;
    const key = `groupedFiles[${index}].isCollapsed`;
    this.setData({ [key]: !this.data.groupedFiles[index].isCollapsed });
  },

  // === 文件夹操作菜单 ===
  openFolderOptions(e) {
    const folderName = e.currentTarget.dataset.foldername;
    wx.showActionSheet({
      itemList: ['重命名', '删除文件夹'],
      itemColor: '#333333',
      success: (res) => {
        if (res.tapIndex === 0) {
          this.openRenameFolder(e);
        } else if (res.tapIndex === 1) {
          this.deleteFolder(e);
        }
      }
    });
  },

  // === 文件夹重命名与删除 ===
  openRenameFolder(e) {
    const folderName = e.currentTarget.dataset.foldername;
    this.setData({
      showRenameFolderModal: true,
      oldFolderName: folderName,
      renameFolderNameInput: folderName
    });
  },

  closeRenameFolderModal() {
    this.setData({ showRenameFolderModal: false });
  },

  onRenameFolderInput(e) {
    this.setData({ renameFolderNameInput: e.detail.value });
  },

  async confirmRenameFolder() {
    const { oldFolderName, renameFolderNameInput, folders, leadId } = this.data;
    const newName = renameFolderNameInput.trim();
    if (!newName) return wx.showToast({ title: '请输入文件夹名称', icon: 'none' });
    if (newName === oldFolderName) return this.closeRenameFolderModal();
    if (folders.includes(newName)) return wx.showToast({ title: '文件夹名称已存在', icon: 'none' });

    wx.showLoading({ title: '重命名中...' });
    try {
      const db = wx.cloud.database();
      const res = await db.collection('leads').doc(leadId).get();
      const leadData = res.data;
      
      const updatedFolders = folders.map(f => f === oldFolderName ? newName : f);
      const updateData = { fileFolders: updatedFolders };

      if (leadData.files) {
        updateData.files = leadData.files.map(f => {
          if (f.folderName === oldFolderName) {
            return { ...f, folderName: newName };
          }
          return f;
        });
      }

      // 如果设计节点里的文件也绑定了文件夹，同步更新
      if (leadData.designNodes) {
        let hasDesignChanges = false;
        const newDesignNodes = leadData.designNodes.map(node => {
          if (node.files && node.files.length > 0) {
            const newFiles = node.files.map(f => {
              if (f.folderName === oldFolderName) {
                hasDesignChanges = true;
                return { ...f, folderName: newName };
              }
              return f;
            });
            return { ...node, files: newFiles };
          }
          return node;
        });
        if (hasDesignChanges) {
          updateData.designNodes = newDesignNodes;
        }
      }

      await db.collection('leads').doc(leadId).update({ data: updateData });
      
      wx.hideLoading();
      wx.showToast({ title: '重命名成功', icon: 'success' });
      this.closeRenameFolderModal();
      this.fetchFiles();
    } catch (err) {
      console.error('重命名文件夹失败', err);
      wx.hideLoading();
      wx.showToast({ title: '重命名失败', icon: 'none' });
    }
  },

  deleteFolder(e) {
    const folderName = e.currentTarget.dataset.foldername;
    const group = this.data.groupedFiles.find(g => g.folderName === folderName);
    
    // 如果文件夹内有文件，提示用户
    if (group && group.items && group.items.length > 0) {
      return wx.showModal({
        title: '无法删除',
        content: '该文件夹内还有文件，请先清空文件或移动到其他文件夹。',
        showCancel: false,
        confirmColor: '#992933'
      });
    }

    wx.showModal({
      title: '确认删除',
      content: `确定要删除文件夹“${folderName}”吗？`,
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' });
          try {
            const db = wx.cloud.database();
            const updatedFolders = this.data.folders.filter(f => f !== folderName);
            await db.collection('leads').doc(this.data.leadId).update({
              data: { fileFolders: updatedFolders }
            });
            wx.hideLoading();
            wx.showToast({ title: '已删除' });
            this.fetchFiles();
          } catch (err) {
            console.error('删除文件夹失败', err);
            wx.hideLoading();
            wx.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      }
    });
  },

  // 添加系统跟进记录
  addSystemFollowUp(content) {
    if (!this.data.leadId) return;
    
    const userInfo = wx.getStorageSync('userInfo');
    const operatorName = userInfo ? userInfo.name : '系统';
    const operatorRole = userInfo ? userInfo.role : 'admin';
    const now = new Date();
    const nowStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    
    const db = wx.cloud.database();
    db.collection('followUps').add({
      data: {
        leadId: this.data.leadId,
        content: `【系统自动记录】\n${content}`,
        method: '系统记录',
        createdBy: operatorName,
        creatorRole: operatorRole,
        createdAt: db.serverDate(),
        displayTime: nowStr,
        timestamp: db.serverDate(),
        type: 'system',
        location: null
      }
    }).catch(err => {
      console.error('添加系统跟进记录失败', err);
    });
  },

  // 发送文件操作通知
  notifyFileAction(content) {
    if (!this.data.leadId) return;
    const db = wx.cloud.database();
    
    // 查询客户信息获取相关人员
    db.collection('leads').doc(this.data.leadId).get().then(res => {
      const lead = res.data;
      const relatedUsers = new Set();
      
      // 添加客户相关人员
      if (lead.creatorId) relatedUsers.add(lead.creatorId);
      
      // 根据姓名查询用户ID
      const namesToFind = [];
      if (lead.sales && lead.sales !== '未分配') namesToFind.push(lead.sales);
      if (lead.designer && lead.designer !== '未分配') namesToFind.push(lead.designer);
      
      if (namesToFind.length > 0) {
        db.collection('users').where({
          name: db.command.in(namesToFind)
        }).get().then(userRes => {
          userRes.data.forEach(u => relatedUsers.add(u._id));
          this.createNotifications(Array.from(relatedUsers), content, lead);
        });
      } else {
        this.createNotifications(Array.from(relatedUsers), content, lead);
      }
    });
  },

  createNotifications(userIds, content, lead) {
    const userInfo = wx.getStorageSync('userInfo');
    const myId = userInfo ? userInfo._id : '';
    
    // 过滤掉自己
    const targetUserIds = userIds.filter(id => id && id !== myId);
    if (targetUserIds.length === 0) return;
    
    const db = wx.cloud.database();
    const _ = db.command;
    
    targetUserIds.forEach(userId => {
      db.collection('notifications').add({
        data: {
          userId: userId,
          type: 'system',
          title: '项目资料更新',
          content: content,
          isRead: false,
          createTime: db.serverDate(),
          relatedId: this.data.leadId,
          relatedType: 'lead'
        }
      });
    });
  },

  // === 材料清单管理 ===

  // =====================
  // 材料清单逻辑 - 图片相关
  // =====================

  toggleMaterialImageEdit(e) {
    const { catindex, index } = e.currentTarget.dataset;
    const item = this.data.groupedMaterials[catindex].items[index];
    const globalIndex = this.data.materials.findIndex(m => m.id === item.id);
    if (globalIndex === -1) return;

    const materials = [...this.data.materials];
    materials[globalIndex].isEditingImages = !materials[globalIndex].isEditingImages;

    this.setData({ materials }, () => {
      this.setData({
        groupedMaterials: this.computeGroupedMaterials(this.data.materials)
      });
    });
  },

  addMaterialImage(e) {
    const { catindex, index } = e.currentTarget.dataset;
    const item = this.data.groupedMaterials[catindex].items[index];
    const globalIndex = this.data.materials.findIndex(m => m.id === item.id);
    if (globalIndex === -1) return;

    wx.chooseMedia({
      count: 9,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'], // 开启压缩
      success: (res) => {
        wx.showLoading({ title: '上传中...', mask: true });
        const compressPromises = res.tempFiles.map(f => {
          return new Promise((resolve, reject) => {
            const ext = (f.tempFilePath.split('.').pop() || 'jpg').toLowerCase();
            const cloudPath = `materials/${this.data.leadId}/${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
            wx.cloud.uploadFile({
              cloudPath: cloudPath,
              filePath: f.tempFilePath,
              success: uploadRes => resolve({ fileID: uploadRes.fileID }),
              fail: err => reject(err)
            });
          });
        });

        Promise.all(compressPromises).then(results => {
          wx.hideLoading();
          const materials = [...this.data.materials];
          const currentImages = materials[globalIndex].images || [];
          materials[globalIndex].images = [...currentImages, ...results.map(r => r.fileID)];

          // 保存到数据库
          const leadId = this.data.leadId;
          const db = wx.cloud.database();
          db.collection('leads').doc(leadId).update({
            data: { materialList: materials }
          }).then(() => {
            this.setData({ materials }, () => {
              this.setData({
                groupedMaterials: this.computeGroupedMaterials(this.data.materials)
              });
            });
            wx.showToast({ title: '上传成功', icon: 'success' });
          }).catch(err => {
            console.error('更新材料图片失败', err);
            wx.showToast({ title: '保存失败', icon: 'none' });
          });
        });
      }
    });
  },

  deleteMaterialImage(e) {
    const { catindex, index, imgindex } = e.currentTarget.dataset;
    const item = this.data.groupedMaterials[catindex].items[index];
    const globalIndex = this.data.materials.findIndex(m => m.id === item.id);
    if (globalIndex === -1) return;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这张图片吗？',
      success: (res) => {
        if (res.confirm) {
          const materials = [...this.data.materials];
          materials[globalIndex].images.splice(imgindex, 1);

          const leadId = this.data.leadId;
          const db = wx.cloud.database();
          db.collection('leads').doc(leadId).update({
            data: { materialList: materials }
          }).then(() => {
            this.setData({ materials }, () => {
              this.setData({
                groupedMaterials: this.computeGroupedMaterials(this.data.materials)
              });
            });
          }).catch(err => {
            console.error('删除材料图片失败', err);
            wx.showToast({ title: '删除失败', icon: 'none' });
          });
        }
      }
    });
  },

  previewMaterialImage(e) {
    const { urls, current } = e.currentTarget.dataset;
    if (!urls || urls.length === 0) return;
    wx.previewImage({ urls, current });
  },

  // =====================
  // 材料清单逻辑 - 发送给客户确认
  // =====================

  formatTime(date) {
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    return `${month}-${day} ${hour}:${minute}`;
  },

  // =====================
  // 材料清单逻辑 - 状态与分类相关
  // =====================

  openAddMaterial(e) {
    const category = e.currentTarget.dataset.category || '瓷砖/木地板';
    this.setData({
      showMaterialModal: true,
      editMaterialIndex: -1,
      showCustomRegion: false,
      showCustomName: false,
      materialHint: '',
      regionIndex: 0,
      materialIndex: 0,
      materialForm: {
        category: category,
        region: '', brand: '', model: '', spec: '', quantity: '', remark: '',
        frameColor: '', coreColor: '', doorModel: '', itemCategory: '', name: '',
        cabinetBody: '', cabinetDoor: '', handle: ''
      }
    });
  },

  openEditMaterial(e) {
    const itemIndex = e.currentTarget.dataset.index;
    const catIndex = e.currentTarget.dataset.catindex;
    const item = this.data.groupedMaterials[catIndex].items[itemIndex];
    const index = this.data.materials.findIndex(m => m.id === item.id);

    if (index === -1) return;

    let showCustomRegion = false;
    let regionIndex = 0;
    let showCustomName = false;
    let materialIndex = 0;
    let materialHint = '';
    const form = { ...this.data.materials[index] };

    if (form.category === '瓷砖/木地板') {
      const idx = this.data.regionOptions1.indexOf(form.region);
      if (idx !== -1 && idx !== this.data.regionOptions1.length - 1) {
        regionIndex = idx;
      } else if (form.region) {
        regionIndex = this.data.regionOptions1.length - 1;
        showCustomRegion = true;
      }
    } else if (form.category === '木门/金属门') {
      const idx = this.data.regionOptions2.indexOf(form.region);
      if (idx !== -1 && idx !== this.data.regionOptions2.length - 1) {
        regionIndex = idx;
      } else if (form.region) {
        regionIndex = this.data.regionOptions2.length - 1;
        showCustomRegion = true;
      }
    } else if (form.category === '集成吊顶/电器') {
      const idx = this.data.regionOptions4.indexOf(form.region);
      if (idx !== -1 && idx !== this.data.regionOptions4.length - 1) {
        regionIndex = idx;
      } else if (form.region) {
        regionIndex = this.data.regionOptions4.length - 1;
        showCustomRegion = true;
      }
    } else if (form.category === '其他') {
      const idx = this.data.materialOptions.indexOf(form.name);
      if (idx !== -1 && idx !== this.data.materialOptions.length - 1) {
        materialIndex = idx;
      } else if (form.name) {
        materialIndex = this.data.materialOptions.length - 1;
        showCustomName = true;
      }
      // 设置智能提示
      if (form.name === '踢脚线') {
        materialHint = '注意是否有个别空间不同色';
      } else if (form.name === '橱柜台面') {
        materialHint = '备注挡水条的要求';
      } else if (form.name === '水槽') {
        materialHint = '备注单槽/双槽及全包半包';
      }
    }

    this.setData({
      showMaterialModal: true,
      editMaterialIndex: index,
      showCustomRegion,
      regionIndex,
      showCustomName,
      materialIndex,
      materialHint,
      materialForm: form
    });
  },

  onRegionChange(e) {
    const index = parseInt(e.detail.value);
    const category = this.data.materialForm.category;
    let options = [];
    if (category === '瓷砖/木地板') options = this.data.regionOptions1;
    else if (category === '木门/金属门') options = this.data.regionOptions2;
    else if (category === '集成吊顶/电器') options = this.data.regionOptions4;

    const isCustom = index === options.length - 1;
    this.setData({
      regionIndex: index,
      showCustomRegion: isCustom,
      'materialForm.region': isCustom ? '' : options[index]
    });
  },

  onMaterialNameChange(e) {
    const index = parseInt(e.detail.value);
    const isCustom = index === this.data.materialOptions.length - 1;
    const materialName = isCustom ? '' : this.data.materialOptions[index];

    // 智能提示逻辑
    let hint = '';
    if (materialName === '踢脚线') {
      hint = '注意是否有个别空间不同色';
    } else if (materialName === '橱柜台面') {
      hint = '备注挡水条的要求';
    } else if (materialName === '水槽') {
      hint = '备注单槽/双槽及全包半包';
    }

    this.setData({
      materialIndex: index,
      showCustomName: isCustom,
      'materialForm.name': materialName,
      materialHint: hint
    });
  },

  closeMaterialModal() {
    this.setData({ showMaterialModal: false });
  },

  onMaterialFormInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`materialForm.${field}`]: e.detail.value
    });
  },

  onCategoryChange(e) {
    this.setData({
      'materialForm.category': this.data.categories[e.detail.value],
      showCustomRegion: false,
      regionIndex: 0,
      'materialForm.region': ''
    });
  },

  saveMaterial() {
    const form = this.data.materialForm;
    if (form.category !== '其他') {
      if (!form.region || !form.region.trim()) return wx.showToast({ title: '请填写或选择区域', icon: 'none' });
    }
    
    if (form.category === '集成吊顶/电器' || form.category === '其他') {
      if (!form.name || !form.name.trim()) return wx.showToast({ title: '请输入名称', icon: 'none' });
    }

    wx.showLoading({ title: '保存中' });
    let newMaterials = [...this.data.materials];
    if (this.data.editMaterialIndex === -1) {
      newMaterials.push({ ...form, id: Date.now().toString() });
    } else {
      newMaterials[this.data.editMaterialIndex] = { ...form, id: newMaterials[this.data.editMaterialIndex].id };
    }

    const db = wx.cloud.database();
    db.collection('leads').doc(this.data.leadId).update({
      data: { materialList: newMaterials }
    }).then(() => {
      wx.hideLoading();
      this.setData({ 
        materials: newMaterials, 
        groupedMaterials: this.computeGroupedMaterials(newMaterials),
        showMaterialModal: false 
      });
      wx.showToast({ title: '保存成功' });
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
    });
  },

  deleteMaterial(e) {
    const itemIndex = e.currentTarget.dataset.index;
    const catIndex = e.currentTarget.dataset.catindex;
    // 需要找到该 item 在全局 materials 中的真实索引
    const item = this.data.groupedMaterials[catIndex].items[itemIndex];
    const index = this.data.materials.findIndex(m => m.id === item.id);

    if (index === -1) return;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条材料清单吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中' });
          let newMaterials = [...this.data.materials];
          newMaterials.splice(index, 1);
          const db = wx.cloud.database();
          db.collection('leads').doc(this.data.leadId).update({
            data: { materialList: newMaterials }
          }).then(() => {
            wx.hideLoading();
            this.setData({
              materials: newMaterials,
              groupedMaterials: this.computeGroupedMaterials(newMaterials)
            });
            wx.showToast({ title: '已删除' });
          }).catch(() => {
            wx.hideLoading();
            wx.showToast({ title: '删除失败', icon: 'none' });
          });
        }
      }
    });
  },

  // 格式化文件大小
  formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // 获取文件扩展名或类型
  getFileType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const videoExts = ['mp4', 'mov', 'avi'];
    const docExts = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'pdf'];
    
    if (imageExts.includes(ext)) return 'image';
    if (videoExts.includes(ext)) return 'video';
    if (docExts.includes(ext)) return 'doc';
    return 'file';
  },

  chooseAndUpload() {
    wx.showActionSheet({
      itemList: ['从聊天记录选择文件', '从手机相册选择图片/视频', '从手机存储选择文件'],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.chooseMessageFile({
            count: 9,
            type: 'all',
            success: (res) => {
              this.showFolderSelect(res.tempFiles);
            }
          });
        } else if (res.tapIndex === 1) {
          wx.chooseMedia({
            count: 9,
            mediaType: ['image', 'video'],
            sourceType: ['album', 'camera'],
            sizeType: ['compressed'], // 强制压缩
            success: (res) => {
              wx.showLoading({ title: '处理中...', mask: true });
              const compressPromises = res.tempFiles.map(f => {
                return new Promise((resolve) => {
                  const ext = (f.tempFilePath.split('.').pop() || 'jpg').toLowerCase();
                  const finalExt = (f.fileType === 'video' && ext !== 'mp4') ? 'mp4' : ext;
                  const fileInfo = {
                    name: `upload_${Date.now()}_${Math.floor(Math.random() * 1000)}.${finalExt}`,
                    size: f.size
                  };
                  
                  if (f.fileType === 'image') {
                    wx.compressImage({
                      src: f.tempFilePath,
                      quality: 60,
                      success: (compRes) => {
                        fileInfo.path = compRes.tempFilePath;
                        resolve(fileInfo);
                      },
                      fail: () => {
                        fileInfo.path = f.tempFilePath;
                        resolve(fileInfo);
                      }
                    });
                  } else {
                    fileInfo.path = f.tempFilePath;
                    resolve(fileInfo);
                  }
                });
              });

              Promise.all(compressPromises).then(tempFiles => {
                wx.hideLoading();
                this.showFolderSelect(tempFiles);
              });
            }
          });
        } else if (res.tapIndex === 2) {
          wx.showModal({
            title: '提示',
            content: '微信小程序目前不支持直接浏览手机本地文件夹，请将文件发送到任意微信聊天中，然后使用“从聊天记录选择文件”功能上传。',
            showCancel: false,
            confirmColor: '#992933'
          });
        }
      }
    });
  },

  showFolderSelect(tempFiles) {
    this.setData({
      showFolderSelectModal: true,
      tempUploadFiles: tempFiles,
      selectedFolderIndex: 0,
      newFolderName: '',
      uploadVisibility: 'internal'
    });
  },

  closeFolderSelectModal() {
    this.setData({
      showFolderSelectModal: false,
      tempUploadFiles: [],
      newFolderName: ''
    });
  },

  onFolderChange(e) {
    this.setData({
      selectedFolderIndex: e.detail.value,
      newFolderName: ''
    });
  },

  onMoveFolderChange(e) {
    this.setData({
      moveFolderIndex: e.detail.value,
      moveNewFolderName: ''
    });
  },

  onMoveNewFolderInput(e) {
    this.setData({
      moveNewFolderName: e.detail.value
    });
  },

  openMoveFileModal(e) {
    const fileID = e.currentTarget.dataset.id;
    this.setData({
      showMoveFileModal: true,
      moveTargetFileID: fileID,
      moveFolderIndex: 0,
      moveNewFolderName: ''
    });
  },

  closeMoveFileModal() {
    this.setData({
      showMoveFileModal: false,
      moveTargetFileID: '',
      moveFolderIndex: 0,
      moveNewFolderName: ''
    });
  },

  async confirmMoveFile() {
    const { moveTargetFileID, moveFolderIndex, moveNewFolderName, folders, leadId } = this.data;
    
    let targetFolder = folders[moveFolderIndex];
    let updatedFolders = [...folders];
    
    if (moveFolderIndex == folders.length && moveNewFolderName.trim()) {
      targetFolder = moveNewFolderName.trim();
      if (!folders.includes(targetFolder)) {
        updatedFolders.push(targetFolder);
      }
    } else if (moveFolderIndex == folders.length && !moveNewFolderName.trim()) {
      wx.showToast({ title: '请输入文件夹名称', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '移动中...' });

    try {
      const db = wx.cloud.database();
      const res = await db.collection('leads').doc(leadId).get();
      const leadData = res.data;
      const currentFiles = leadData.files || [];
      
      const fileIndex = currentFiles.findIndex(f => f.fileID === moveTargetFileID);
      if (fileIndex !== -1) {
        currentFiles[fileIndex].folderName = targetFolder;
      }
      
      const updateData = {
        files: currentFiles
      };
      
      if (updatedFolders.length > folders.length) {
        updateData.fileFolders = updatedFolders;
        this.setData({ 
          folders: updatedFolders,
          folderOptions: [...updatedFolders, '新建文件夹...']
        });
      }

      await db.collection('leads').doc(leadId).update({
        data: updateData
      });

      wx.hideLoading();
      wx.showToast({ title: '移动成功', icon: 'success' });
      this.closeMoveFileModal();
      this.fetchFiles(leadId); // 重新加载文件列表以更新分组
      
    } catch (err) {
      console.error('移动文件失败', err);
      wx.hideLoading();
      wx.showToast({ title: '移动失败', icon: 'none' });
    }
  },

  onNewFolderInput(e) {
    this.setData({ newFolderName: e.detail.value });
  },

  async toggleVisibility(e) {
    const fileID = e.currentTarget.dataset.id;
    wx.showLoading({ title: '修改中...' });

    try {
      const db = wx.cloud.database();
      const res = await db.collection('leads').doc(this.data.leadId).get();
      const leadData = res.data;
      
      const currentFiles = leadData.files || [];
      const fileIndex = currentFiles.findIndex(f => f.fileID === fileID);
      
      if (fileIndex === -1) {
        wx.hideLoading();
        return wx.showToast({ title: '文件不存在', icon: 'none' });
      }

      const newIsVisible = currentFiles[fileIndex].isVisible === false ? true : false;
      const updateData = {};
      updateData[`files.${fileIndex}.isVisible`] = newIsVisible;

      // 同时更新设计工作流中的文件可见性
      const designNodes = leadData.designNodes || [];
      designNodes.forEach((node, nodeIndex) => {
        if (node.files && node.files.length > 0) {
          const dfIndex = node.files.findIndex(f => f.fileID === fileID);
          if (dfIndex !== -1) {
            updateData[`designNodes.${nodeIndex}.files.${dfIndex}.isVisible`] = newIsVisible;
          }
        }
      });

      await db.collection('leads').doc(this.data.leadId).update({
        data: updateData
      });

      wx.hideLoading();
      wx.showToast({ title: newIsVisible ? '已设为公开' : '已设为仅内部', icon: 'success' });
      this.fetchFiles(); // 重新拉取刷新视图
      
    } catch (err) {
      console.error('修改文件可见性失败', err);
      wx.hideLoading();
      wx.showToast({ title: '修改失败', icon: 'none' });
    }
  },

  onVisibilityChange(e) {
    this.setData({ uploadVisibility: e.currentTarget.dataset.val });
  },

  confirmUpload() {
    const { tempUploadFiles, selectedFolderIndex, newFolderName, folders, leadId, uploadVisibility } = this.data;
    if (tempUploadFiles.length === 0) return;

    let targetFolder = folders[selectedFolderIndex];
    let updatedFolders = [...folders];

    if (selectedFolderIndex == folders.length && newFolderName.trim()) {
      targetFolder = newFolderName.trim();
      if (!updatedFolders.includes(targetFolder)) {
        updatedFolders.push(targetFolder);
      }
    } else if (selectedFolderIndex == folders.length && !newFolderName.trim()) {
      return wx.showToast({ title: '请输入文件夹名称', icon: 'none' });
    }

    this.setData({ showFolderSelectModal: false });
    
    // 如果新增了文件夹，先更新文件夹列表
    if (updatedFolders.length > folders.length) {
      wx.cloud.database().collection('leads').doc(leadId).update({
        data: { fileFolders: updatedFolders }
      }).then(() => {
        this.setData({ folders: updatedFolders });
        this.uploadToCloud(tempUploadFiles, targetFolder, uploadVisibility);
      }).catch(err => {
        wx.showToast({ title: '创建文件夹失败', icon: 'none' });
      });
    } else {
      this.uploadToCloud(tempUploadFiles, targetFolder, uploadVisibility);
    }
  },

  async uploadToCloud(tempFiles, targetFolder, uploadVisibility) {
    wx.showLoading({ title: '准备上传...', mask: true });
    
    const userInfo = wx.getStorageSync('userInfo');
    const uploaderName = userInfo ? userInfo.name : '未知人员';
    const totalFiles = tempFiles.length;
    const uploadedFiles = [];
    
    try {
      for (let i = 0; i < tempFiles.length; i++) {
        const file = tempFiles[i];
        
        const ext = file.name.split('.').pop();
        const cloudPath = `project_files/${this.data.leadId}/${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
        
        await new Promise((resolve, reject) => {
          const uploadTask = wx.cloud.uploadFile({
            cloudPath,
            filePath: file.path,
            success: res => {
              uploadedFiles.push({
                fileID: res.fileID,
                name: file.name,
                size: file.size,
                sizeStr: this.formatSize(file.size),
                type: this.getFileType(file.name),
                uploader: uploaderName,
                uploadTime: new Date().toISOString(),
                folderName: targetFolder,
                isVisible: uploadVisibility === 'public'
              });
              resolve();
            },
            fail: err => reject(err)
          });
          
          uploadTask.onProgressUpdate((res) => {
            const baseProgress = Math.floor((i / totalFiles) * 100);
            const currentFileProgress = Math.floor(res.progress / totalFiles);
            wx.showLoading({ title: `上传中 ${baseProgress + currentFileProgress}%`, mask: true });
          });
        });
      }

      wx.showLoading({ title: '更新数据...', mask: true });

      // 重新获取当前最新文件列表避免并发覆盖
      const db = wx.cloud.database();
      const res = await db.collection('leads').doc(this.data.leadId).get();
      const currentFiles = res.data.files || [];
      const newFiles = [...currentFiles, ...uploadedFiles];
      
      await db.collection('leads').doc(this.data.leadId).update({
        data: { files: newFiles }
      });

      wx.hideLoading();
      wx.showToast({ title: '上传成功', icon: 'success' });
      this.fetchFiles(); // 重新加载整理后的数据
      
      const fileNames = uploadedFiles.map(f => f.name).join('、');
      this.addSystemFollowUp(`向项目资料的文件夹“${targetFolder}”上传了文件：${fileNames}`);
      const leadName = this.data.lead ? this.data.lead.name : '未知客户';
      this.notifyFileAction(`向客户【${leadName}】的项目资料文件夹“${targetFolder}”上传了文件：${fileNames}`);
      
    } catch (err) {
      console.error('上传文件失败', err);
      wx.hideLoading();
      wx.showToast({ title: '部分文件上传失败', icon: 'none' });
    }
  },

  previewFile(e) {
    const item = e.currentTarget.dataset.item;
    const fileID = item.fileID;
    
    if (item.type === 'image') {
      // 图片直接预览
      const imageFiles = this.data.files.filter(f => f.type === 'image').map(f => f.fileID);
      wx.previewImage({
        urls: imageFiles,
        current: fileID,
        showmenu: true
      });
    } else if (item.type === 'video') {
      // 视频直接预览
      wx.previewMedia({
        sources: [{ url: fileID, type: 'video' }]
      });
    } else {
      // 文档类（PDF, Word等）需要先下载临时文件再打开
      wx.showLoading({ title: '下载文件...', mask: true });
      wx.cloud.downloadFile({
        fileID: fileID,
        success: res => {
          wx.hideLoading();
          const filePath = res.tempFilePath;
          wx.openDocument({
            filePath: filePath,
            showMenu: true,
            success: function () {
              console.log('打开文档成功');
            },
            fail: function (err) {
              console.error('打开文档失败', err);
              wx.showToast({ title: '不支持的文件类型', icon: 'none' });
            }
          });
        },
        fail: err => {
          wx.hideLoading();
          wx.showToast({ title: '下载失败', icon: 'none' });
        }
      });
    }
  },

  deleteFile(e) {
    const fileId = e.currentTarget.dataset.id;
    // 从 this.data.files 中找到索引
    const index = this.data.files.findIndex(f => f.fileID === fileId);
    if (index === -1) return;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个文件吗？（仅从项目资料中移除）',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中' });
          let newFiles = [...this.data.files];
          const deletedFile = newFiles.splice(index, 1)[0];
          
          const db = wx.cloud.database();
          db.collection('leads').doc(this.data.leadId).update({
            data: { files: newFiles }
          }).then(() => {
            wx.hideLoading();
            this.fetchFiles();
            wx.showToast({ title: '已删除' });
            
            // 添加跟进记录并发送通知
            this.addSystemFollowUp(`从项目资料中移除了文件：${deletedFile.name}`);
            this.notifyFileAction(`从客户【${this.data.leadName}】的项目资料中移除了文件：${deletedFile.name}`);
          }).catch(() => {
            wx.hideLoading();
            wx.showToast({ title: '删除失败', icon: 'none' });
          });
        }
      }
    });
  },

  // ====== 主材分享相关方法 ======
  openShareCategoryModal() {
    if (!this.data.projectId) {
      this.handleNoProjectShare();
      return;
    }
    const categories = this.data.groupedMaterials.map(g => g.category);
    this.setData({
      showShareCategoryModal: true,
      availableShareCategories: categories,
      selectedShareCategories: [...categories]
    }, () => {
      this.generateMaterialShareImage();
    });
  },

  closeShareCategoryModal() {
    this.setData({ showShareCategoryModal: false });
  },

  onShareCategoryChange(e) {
    this.setData({
      selectedShareCategories: e.detail.value
    }, () => {
      this.generateMaterialShareImage();
    });
  },

  generateMaterialShareImage() {
    const query = wx.createSelectorQuery();
    query.select('#materialShareCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0] || !res[0].node) return;
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio;
        
        // 缩放以支持高清
        canvas.width = 500 * dpr;
        canvas.height = 400 * dpr;
        ctx.scale(dpr, dpr);
        
        // 绘制背景 #ffffff
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 500, 400);

        // 绘制警告图标
        ctx.fillStyle = '#fffbeb';
        ctx.beginPath();
        ctx.arc(250, 90, 44, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = '#d97706';
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', 250, 95);

        // 绘制主标题
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 40px sans-serif';
        ctx.fillText('【主材清单】待确认', 250, 180);

        // 绘制副标题 (地址或客户)
        const address = (this.data.project && this.data.project.address) ? this.data.project.address : (this.data.lead.address || this.data.lead.name || '项目资料');
        ctx.fillStyle = '#64748b';
        ctx.font = '28px sans-serif';
        ctx.fillText(address, 250, 240);

        // 绘制所选大项
        const selectedStr = this.data.selectedShareCategories && this.data.selectedShareCategories.length > 0 ? 
          `包含：${this.data.selectedShareCategories.join('、')}` : '请选择大项';
        
        // 如果文本过长则截断
        let displayStr = selectedStr;
        if (displayStr.length > 20) {
          displayStr = displayStr.substring(0, 19) + '...';
        }
        ctx.fillStyle = '#94a3b8';
        ctx.font = '24px sans-serif';
        ctx.fillText(displayStr, 250, 290);
        
        // 绘制底部品牌 Logo
        const logoImg = canvas.createImage();
        logoImg.src = '../../assets/icons/LOGO2.png'; 
        logoImg.onload = () => {
          const imgW = logoImg.width;
          const imgH = logoImg.height;
          const targetW = 200;
          const targetH = targetW * (imgH / imgW);
          const lx = (500 - targetW) / 2;
          const ly = 380 - targetH;

          ctx.drawImage(logoImg, lx, ly, targetW, targetH);

          setTimeout(() => {
            wx.canvasToTempFilePath({
              canvas,
              success: (res) => {
                this.setData({ shareImageUrl: res.tempFilePath });
              },
              fail: (err) => {
                console.error('生成分享图失败', err);
              }
            });
          }, 100);
        };
      });
  },

  onShareAppMessage(res) {
    const defaultLogoUrl = '/assets/icons/LOGO2.png'; // 公司的默认 Logo 占位图
    const projectId = this.data.projectId;
    const leadName = this.data.lead ? this.data.lead.name : '客户';

    if (res.from === 'button' && res.target.dataset.shareType === 'material') {
      if (!projectId) {
        wx.showToast({ title: '请先将该客户转为已签单(建立工地)后再分享', icon: 'none' });
        return {
          title: `${leadName}的项目资料`,
          path: `/pages/projectShare/index?id=${projectId}`
        };
      }

      const { selectedShareCategories } = this.data;
      if (!selectedShareCategories || selectedShareCategories.length === 0) {
        wx.showToast({ title: '请先选择要发送的大项', icon: 'none' });
        return {
          title: `${leadName}的项目资料`,
          path: `/pages/projectShare/index?id=${projectId}`
        };
      }

      // 异步更新主材清单状态为“待确认”并发送通知
      this.markMaterialsAsPendingAndNotify(selectedShareCategories);

      // 将选择的分类数组转为以逗号分隔的字符串传递
      const categoriesStr = encodeURIComponent(selectedShareCategories.join(','));

      return {
        title: `【主材清单】待确认`,
        path: `/pages/projectShare/index?id=${projectId}&tab=materials&categories=${categoriesStr}`,
        imageUrl: this.data.shareImageUrl || defaultLogoUrl
      };
    }

    // 默认分享（通过右上角菜单等）
    return {
      title: `${leadName}的项目资料`,
      path: `/pages/projectShare/index?id=${projectId}`,
      imageUrl: defaultLogoUrl
    };
  },

  handleNoProjectShare() {
    wx.showToast({ title: '请先将该客户转为已签单(建立工地)后再分享', icon: 'none' });
  },

  markMaterialsAsPendingAndNotify(selectedCategories) {
    const leadId = this.data.leadId;
    if (!leadId) return;

    const db = wx.cloud.database();
    
    // 自定义 formatTime 以防当前页面缺少该方法
    const nowStr = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    })();

    const currentStates = this.data.lead.materialCategoryStates || {};
    const newStates = { ...currentStates };
    selectedCategories.forEach(cat => {
      // 提取当前分类的快照
      const catMaterials = this.data.materials.filter(m => m.category === cat);
      newStates[cat] = {
        status: '待确认',
        sentAt: nowStr,
        confirmedAt: '', // 重复发送时清空之前的确认时间
        snapshot: catMaterials
      };
    });

    db.collection('leads').doc(leadId).update({
      data: {
        materialCategoryStates: newStates
      }
    }).then(() => {
      // 更新本地状态并关闭弹窗
      this.setData({
        'lead.materialCategoryStates': newStates,
        showShareCategoryModal: false
      });
      // 触发通知
      this.notifyClientMaterialsSent(leadId, selectedCategories);
    }).catch(err => console.error('更新材料状态失败', err));
  },

  notifyClientMaterialsSent(leadId, selectedCategories) {
    const db = wx.cloud.database();
    
    // 增加跟进记录和站内信
    const userInfo = wx.getStorageSync('userInfo');
    const operatorName = userInfo ? (userInfo.name || '系统') : '系统';
    const now = new Date();
    const nowStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const followContent = `发送主材清单给客户确认\n分类：${selectedCategories.join('、')}`;

    db.collection('followUps').add({
      data: {
        leadId: leadId,
        content: followContent,
        method: '系统记录',
        createdBy: operatorName,
        createdAt: db.serverDate(),
        displayTime: nowStr,
        timestamp: db.serverDate()
      }
    });

    db.collection('leads').doc(leadId).update({
      data: { lastFollowUp: nowStr, lastFollowUpAt: Date.now() }
    });

    // 发送站内信
    db.collection('leads').doc(leadId).get().then(leadRes => {
      const lead = leadRes.data;
      const notifyUsers = new Set();
      if (lead.sales && lead.sales !== operatorName) notifyUsers.add(lead.sales);
      if (lead.designer && lead.designer !== operatorName) notifyUsers.add(lead.designer);
      if (lead.manager && lead.manager !== operatorName) notifyUsers.add(lead.manager);
      if (lead.creatorName && lead.creatorName !== operatorName) notifyUsers.add(lead.creatorName);

      db.collection('users').where({ role: 'admin' }).get().then(adminRes => {
        adminRes.data.forEach(u => {
          if (u.name !== operatorName) notifyUsers.add(u.name);
        });

        notifyUsers.forEach(u => {
          if (!u) return;
          db.collection('notifications').add({
            data: {
              type: 'lead',
              title: '主材清单已发送',
              content: `${operatorName} 发送了客户【${lead.name}】的主材清单供确认。`,
              senderName: operatorName,
              senderRole: userInfo.role || 'default',
              targetUser: u,
              isRead: false,
              createTime: db.serverDate(),
              link: `/pages/leadDetail/index?id=${leadId}&tab=materials`
            }
          }).catch(() => {});
        });
      });
    }).catch(console.error);

    // 发送微信订阅消息给客户
    db.collection('projects').where({ leadId }).limit(1).get().then(projRes => {
      if (projRes.data.length === 0) return;
      const projectId = projRes.data[0]._id;
      const address = (projRes.data[0].address || '工地').substring(0, 20);
      
      db.collection('shareAccess').where({ projectId, status: 'approved' }).get().then(accessRes => {
        const openIds = accessRes.data.map(a => a.openid).filter(Boolean);
        if (openIds.length === 0) return;
        
        const nowStr = (() => {
          const d = new Date();
          return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        })();
        const { TEMPLATE_IDS } = require('../../utils/subscribe.js');
        
        const envVersion = wx.getAccountInfoSync().miniProgram.envVersion || 'release';
        const miniprogramState = envVersion === 'release' ? 'formal' : (envVersion === 'trial' ? 'trial' : 'developer');
        
        wx.cloud.callFunction({
          name: 'sendSubscribeMessage',
          data: {
            openIds,
            templateId: TEMPLATE_IDS.PROJECT_UPDATE,
            page: `/pages/projectShare/index?id=${projectId}&tab=materials`,
            miniprogramState,
            data: {
              thing1: { value: address.substring(0, 20) },
              time2: { value: nowStr },
              thing4: { value: '系统' },
              thing6: { value: '主材清单待确认' },
              thing7: { value: `您的主材清单已更新，请确认`.substring(0, 20) }
            }
          }
        }).catch(console.error);
      }).catch(console.error);
    }).catch(console.error);
  }
});