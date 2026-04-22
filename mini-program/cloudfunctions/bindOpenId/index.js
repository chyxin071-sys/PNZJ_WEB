const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});
const db = cloud.database();

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { userId } = event;

  try {
    if (!userId) throw new Error('Missing userId');
    
    // 把微信 OpenID 绑定到用户的 wechatOpenId 字段上
    await db.collection('users').doc(userId).update({
      data: {
        wechatOpenId: OPENID,
        updatedAt: db.serverDate()
      }
    });
    
    return { success: true, openid: OPENID };
  } catch (err) {
    console.error('绑定 OpenID 失败', err);
    return { success: false, err };
  }
};