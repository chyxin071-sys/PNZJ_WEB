const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { leadId, data } = event;
  
  if (!leadId || !data) {
    return { success: false, errMsg: 'Missing leadId or data' };
  }

  try {
    const result = await db.collection('leads').doc(leadId).update({
      data: data
    });
    return { success: true, updated: result.stats.updated };
  } catch (err) {
    return { success: false, errMsg: err.message || err };
  }
};
