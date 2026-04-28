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
    // 并强制将 sessionToken 设置为当前微信的 OPENID
    // 这样同一个微信账号在不同设备（如手机和PC）登录时，产生的 sessionToken 都是一样的
    // 从而实现“同微信不互踢，异微信互踢”
    const updateData = {
      wechatOpenId: OPENID,
      sessionToken: OPENID,
      updatedAt: db.serverDate()
    };
    
    await db.collection('users').doc(userId).update({
      data: updateData
    });
    
    return { success: true, openid: OPENID };
  } catch (err) {
    console.error('绑定 OpenID / 更新 session 失败', err);
    return { success: false, err };
  }
};
