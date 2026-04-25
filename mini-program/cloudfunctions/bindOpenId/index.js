const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});
const db = cloud.database();

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { userId, sessionToken } = event;

  try {
    if (!userId) throw new Error('Missing userId');
    
    // 把微信 OpenID 绑定到用户的 wechatOpenId 字段上
    const updateData = {
      wechatOpenId: OPENID,
      updatedAt: db.serverDate()
    };

    if (sessionToken) {
      updateData.sessionToken = sessionToken;
    }
    
    await db.collection('users').doc(userId).update({
      data: updateData
    });
    
    return { success: true, openid: OPENID };
  } catch (err) {
    console.error('绑定 OpenID / 更新 session 失败', err);
    return { success: false, err };
  }
};
