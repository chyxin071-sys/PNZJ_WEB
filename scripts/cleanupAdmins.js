const cloudbase = require('@cloudbase/node-sdk');
require('dotenv').config({ path: '.env.local' });

const app = cloudbase.init({
  env: process.env.NEXT_PUBLIC_TCB_ENV_ID,
  secretId: process.env.TCB_SECRET_ID,
  secretKey: process.env.TCB_SECRET_KEY
});

const db = app.database();
const _ = db.command;

async function cleanup() {
  console.log('🧹 正在清理多余的测试账号...');

  try {
    // 删除 老板2号 和 老板3号
    const result = await db.collection('users').where({
      phone: _.in(['13800000002', '13800000003'])
    }).remove();
    
    console.log(`✅ 清理完成，删除了 ${result.deleted} 个多余的老板测试账号。`);
    console.log('📌 目前系统中仅保留了 1 个最高权限账号 (手机号: 13800000001)。');
  } catch (err) {
    console.error('❌ 清理失败:', err.message);
  }
}

cleanup();