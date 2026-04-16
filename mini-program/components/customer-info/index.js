Component({
  properties: {
    name: {
      type: String,
      value: ''
    },
    phone: {
      type: String,
      value: ''
    },
    customerNo: {
      type: String,
      value: ''
    },
    customStyle: {
      type: String,
      value: ''
    }
  },
  data: {
    formattedPhone: ''
  },
  observers: {
    'phone': function(phone) {
      if (!phone) {
        this.setData({ formattedPhone: '暂无电话' });
        return;
      }
      const clean = phone.replace(/\D/g, '');
      if (clean.length === 11) {
        // 使用普通半角空格
        this.setData({ formattedPhone: `${clean.slice(0, 3)} ${clean.slice(3, 7)} ${clean.slice(7)}` });
      } else {
        this.setData({ formattedPhone: phone });
      }
    }
  }
})