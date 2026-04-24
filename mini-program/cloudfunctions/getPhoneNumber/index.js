const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const { code } = event;
  if (!code) return { success: false, reason: 'no_code' };

  try {
    const result = await cloud.openapi.phonenumber.getPhoneNumber({ code });
    const phone = result.phoneInfo && result.phoneInfo.purePhoneNumber;
    return { success: true, phone };
  } catch (err) {
    console.error('获取手机号失败', err);
    return { success: false, reason: err.message };
  }
};
