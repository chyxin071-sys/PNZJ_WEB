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
    formattedPhone: '',
    displayNo: ''
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
    },
    'customerNo': function(no) {
      if (no && no.length > 20) {
        // 如果看起来像 MongoDB _id，只取后 8 位显示，以免过长
        this.setData({ displayNo: no.slice(-8).toUpperCase() });
      } else {
        this.setData({ displayNo: no || '' });
      }
    }
  }
})