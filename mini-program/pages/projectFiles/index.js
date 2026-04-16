Page({
  data: {
    leadId: null,
    lead: null,
    files: [],
    loading: true,
    isUploader: false
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
        const files = lead.files || [];
        
        // 修正：确保在调用 sort 和 localeCompare 之前，files 数组中对象格式正确
        const sortedFiles = files.map(f => {
          // 在 JS 里预先处理好显示时间，避免 WXML 中使用复杂表达式失效
          let dTime = '刚刚';
          if (f.uploadTime) {
            dTime = String(f.uploadTime).substring(0, 10);
          } else if (f.createdAt) {
            dTime = String(f.createdAt).substring(0, 10);
          }
          return { ...f, displayTime: dTime };
        }).sort((a, b) => {
          const timeA = a && a.uploadTime ? String(a.uploadTime) : '';
          const timeB = b && b.uploadTime ? String(b.uploadTime) : '';
          return timeB.localeCompare(timeA);
        });
        
        this.setData({ 
          lead: lead, 
          files: sortedFiles,
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
      itemList: ['从聊天记录选择文件', '从手机相册选择图片/视频'],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.chooseMessageFile({
            count: 9,
            type: 'all',
            success: (res) => {
              this.uploadToCloud(res.tempFiles);
            }
          });
        } else if (res.tapIndex === 1) {
          wx.chooseMedia({
            count: 9,
            mediaType: ['image', 'video'],
            sourceType: ['album', 'camera'],
            success: (res) => {
              const tempFiles = res.tempFiles.map(f => {
                const ext = (f.tempFilePath.split('.').pop() || 'jpg').toLowerCase();
                const finalExt = (f.fileType === 'video' && ext !== 'mp4') ? 'mp4' : ext;
                return {
                  path: f.tempFilePath,
                  name: `upload_${Date.now()}_${Math.floor(Math.random() * 1000)}.${finalExt}`,
                  size: f.size
                };
              });
              this.uploadToCloud(tempFiles);
            }
          });
        }
      }
    });
  },

  uploadToCloud(tempFiles) {
    wx.showLoading({ title: '上传中...', mask: true });
    const userInfo = wx.getStorageSync('userInfo');
    const uploaderName = userInfo ? userInfo.name : '未知人员';
    
    const uploadTasks = tempFiles.map(file => {
      const ext = file.name.split('.').pop();
      const cloudPath = `project_files/${this.data.leadId}/${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
      
      return wx.cloud.uploadFile({
        cloudPath,
        filePath: file.path
      }).then(res => {
        return {
          fileID: res.fileID,
          name: file.name,
          size: file.size,
          sizeStr: this.formatSize(file.size),
          type: this.getFileType(file.name),
          uploader: uploaderName,
          uploadTime: new Date().toISOString()
        };
      });
    });

    Promise.all(uploadTasks).then(uploadedFiles => {
      const newFiles = [...this.data.files, ...uploadedFiles];
      const db = wx.cloud.database();
      
      db.collection('leads').doc(this.data.leadId).update({
        data: { files: newFiles }
      }).then(() => {
        wx.hideLoading();
        wx.showToast({ title: '上传成功', icon: 'success' });
        
        const sortedFiles = newFiles.map(f => {
          let dTime = '刚刚';
          if (f.uploadTime) dTime = String(f.uploadTime).substring(0, 10);
          else if (f.createdAt) dTime = String(f.createdAt).substring(0, 10);
          return { ...f, displayTime: dTime };
        }).sort((a, b) => {
          const timeA = a && a.uploadTime ? String(a.uploadTime) : '';
          const timeB = b && b.uploadTime ? String(b.uploadTime) : '';
          return timeB.localeCompare(timeA);
        });
        
        this.setData({ 
          files: sortedFiles
        });
      }).catch(err => {
        console.error('更新数据库失败', err);
        wx.hideLoading();
        wx.showToast({ title: '保存失败', icon: 'none' });
      });
    }).catch(err => {
      console.error('上传文件失败', err);
      wx.hideLoading();
      wx.showToast({ title: '部分文件上传失败', icon: 'none' });
    });
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
    const index = e.currentTarget.dataset.index;
    const file = this.data.files[index];
    
    wx.showModal({
      title: '删除确认',
      content: `确定要删除文件【${file.name}】吗？`,
      success: res => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中' });
          const newFiles = [...this.data.files];
          newFiles.splice(index, 1);
          
          const db = wx.cloud.database();
          db.collection('leads').doc(this.data.leadId).update({
            data: { files: newFiles }
          }).then(() => {
            this.setData({ files: newFiles });
            // 可选：同时从云存储中删除物理文件
            wx.cloud.deleteFile({ fileList: [file.fileID] }).catch(console.error);
            wx.hideLoading();
            wx.showToast({ title: '已删除', icon: 'success' });
          }).catch(() => {
            wx.hideLoading();
            wx.showToast({ title: '删除失败', icon: 'none' });
          });
        }
      }
    });
  }
});