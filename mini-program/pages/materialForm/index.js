Page({
  data: {
    id: null,
    material: {
      name: '',
      category: '主材',
      sku: '',
      brand: '',
      unit: '',
      price: '',
      stock: '0',
      status: '在售'
    },
    categories: ['主材', '辅材', '软装', '家电', '人工', '定制', '套餐'],
    statuses: ['在售', '停售']
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ id: options.id });
      wx.setNavigationBarTitle({ title: '编辑材料' });
      this.loadData(options.id);
    } else {
      wx.setNavigationBarTitle({ title: '新建材料' });
    }
  },

  loadData(id) {
    wx.showLoading({ title: '加载中' });
    const db = wx.cloud.database();
    db.collection('materials').doc(id).get().then(res => {
      this.setData({ material: res.data });
      wx.hideLoading();
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '获取数据失败', icon: 'none' });
    });
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`material.${field}`]: e.detail.value });
  },

  onPickerChange(e) {
    const field = e.currentTarget.dataset.field;
    const val = field === 'category' ? this.data.categories[e.detail.value] : this.data.statuses[e.detail.value];
    this.setData({ [`material.${field}`]: val });
  },

  saveMaterial() {
    const { name, category, unit, price, stock } = this.data.material;
    if (!name || !category || !unit || price === '' || stock === '') {
      return wx.showToast({ title: '请填写必填项', icon: 'none' });
    }

    wx.showLoading({ title: '保存中' });
    const db = wx.cloud.database();
    const dataToSave = {
      ...this.data.material,
      price: parseFloat(price) || 0,
      stock: parseInt(stock, 10) || 0,
      updatedAt: db.serverDate()
    };
    
    // 删除云数据库不支持更新的保留字段
    delete dataToSave._id;
    delete dataToSave._openid;

    if (this.data.id) {
      db.collection('materials').doc(this.data.id).update({
        data: dataToSave
      }).then(() => {
        wx.hideLoading();
        wx.showToast({ title: '保存成功', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 1500);
      }).catch((err) => {
        console.error('Update Error:', err);
        wx.hideLoading();
        if (err.errCode === -502003 || String(err).includes('permission')) {
          wx.showModal({ title: '权限不足', content: '无法修改导入的初始数据。请在云开发控制台将 materials 集合权限改为“自定义(read:true, write:true)”。', showCancel: false });
        } else {
          wx.showToast({ title: '保存失败', icon: 'none' });
        }
      });
    } else {
      dataToSave.createdAt = db.serverDate();
      db.collection('materials').add({
        data: dataToSave
      }).then(() => {
        wx.hideLoading();
        wx.showToast({ title: '添加成功', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 1500);
      }).catch((err) => {
        console.error('Add Error:', err);
        wx.hideLoading();
        wx.showToast({ title: '添加失败', icon: 'none' });
      });
    }
  },

  deleteMaterial() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除此材料吗？此操作不可恢复。',
      success: (res) => {
        if (res.confirm && this.data.id) {
          wx.showLoading({ title: '删除中' });
          wx.cloud.database().collection('materials').doc(this.data.id).remove()
            .then(() => {
              wx.hideLoading();
              wx.showToast({ title: '已删除', icon: 'success' });
              setTimeout(() => wx.navigateBack(), 1500);
            }).catch((err) => {
              console.error('Delete Error:', err);
              wx.hideLoading();
              if (err.errCode === -502003 || String(err).includes('permission')) {
                wx.showModal({ title: '权限不足', content: '无法删除导入的初始数据。请在云开发控制台将 materials 集合权限改为“自定义(read:true, write:true)”。', showCancel: false });
              } else {
                wx.showToast({ title: '删除失败', icon: 'none' });
              }
            });
        }
      }
    });
  }
});