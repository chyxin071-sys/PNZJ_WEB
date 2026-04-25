// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 云函数入口函数
exports.main = async (event, context) => {
  const db = cloud.database()
  const _ = db.command

  const { userId, data } = event

  if (!userId || !data) {
    return { success: false, error: 'Missing userId or data' }
  }

  try {
    const res = await db.collection('users').doc(userId).update({
      data: data
    })
    return { success: true, updated: res.stats.updated }
  } catch (err) {
    return { success: false, error: err.message }
  }
}
