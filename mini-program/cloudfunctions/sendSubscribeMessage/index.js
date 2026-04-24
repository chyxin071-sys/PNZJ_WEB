const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});
const db = cloud.database();

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const {
    receiverUserId, // 接收者的 User ID (数据库 _id)
    templateId,
    page,
    data,
    miniprogramState = 'formal'
  } = event;

  try {
    if (!receiverUserId) throw new Error('Missing receiverUserId');

    // 去 users 表里找这个人的 wechatOpenId
    const userRes = await db.collection('users').doc(receiverUserId).get();
    const user = userRes.data;

    if (!user || !user.wechatOpenId) {
      console.warn('该用户没有绑定微信 OpenID，无法发送通知：', receiverUserId);
      return { success: false, reason: 'no_openid' };
    }

    // 屏蔽自己给自己发通知的情况
    if (user.wechatOpenId === OPENID) {
      console.log('检测到自己操作，无需下发微信通知：', receiverUserId);
      return { success: true, reason: 'self_action_skipped' };
    }

    const result = await cloud.openapi.subscribeMessage.send({
      touser: user.wechatOpenId,
      page,
      lang: 'zh_CN',
      data,
      templateId,
      miniprogramState,
    });

    console.log('发送成功', result);
    return result;
  } catch (err) {
    console.error('发送失败', err);
    return err;
  }
};