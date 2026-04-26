const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});
const db = cloud.database();

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const {
    receiverUserId, // 兼容旧版：单个 User ID
    receiverUserIds, // 新版：User ID 数组，用于在云端去重
    templateId,
    page,
    data,
    miniprogramState = 'formal'
  } = event;

  try {
    let targetIds = [];
    if (receiverUserIds && Array.isArray(receiverUserIds)) {
      targetIds = receiverUserIds;
    } else if (receiverUserId) {
      targetIds = [receiverUserId];
    }

    if (targetIds.length === 0) throw new Error('Missing receiverUserId or receiverUserIds');

    // 批量获取用户信息
    const _ = db.command;
    const usersRes = await db.collection('users').where({
      _id: _.in(targetIds)
    }).get();

    const users = usersRes.data;
    const notifiedOpenIds = new Set();
    const results = [];

    for (const user of users) {
      if (!user || !user.wechatOpenId) {
        console.warn('该用户没有绑定微信 OpenID，无法发送通知：', user._id);
        results.push({ userId: user._id, success: false, reason: 'no_openid' });
        continue;
      }

      // 屏蔽自己给自己发通知的情况
      if (user.wechatOpenId === OPENID) {
        console.log('检测到自己操作，无需下发微信通知：', user._id);
        results.push({ userId: user._id, success: true, reason: 'self_action_skipped' });
        continue;
      }

      // 核心修复：在云端拥有权限获取到 wechatOpenId 后，进行微信级别的去重
      // 避免测试环境下多个账号绑定同一微信导致收到多条一模一样的通知
      if (notifiedOpenIds.has(user.wechatOpenId)) {
        console.log('该微信已发送过，去重跳过：', user._id);
        results.push({ userId: user._id, success: true, reason: 'duplicate_openid_skipped' });
        continue;
      }
      notifiedOpenIds.add(user.wechatOpenId);

      try {
        const result = await cloud.openapi.subscribeMessage.send({
          touser: user.wechatOpenId,
          page,
          lang: 'zh_CN',
          data,
          templateId,
          miniprogramState,
        });
        results.push({ userId: user._id, success: true, result });
      } catch (err) {
        console.error('发送失败', user._id, err);
        results.push({ userId: user._id, success: false, error: err });
      }
    }

    return { success: true, results };
  } catch (err) {
    console.error('发送执行异常', err);
    return err;
  }
};