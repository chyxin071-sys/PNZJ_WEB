const cloudbase = require('@cloudbase/node-sdk');
require('dotenv').config({ path: '.env.local' });

// 初始化腾讯云 CloudBase 实例
const app = cloudbase.init({
  env: process.env.NEXT_PUBLIC_TCB_ENV_ID,
  secretId: process.env.TCB_SECRET_ID,
  secretKey: process.env.TCB_SECRET_KEY
});

const db = app.database();
const _ = db.command;

async function createAdminUsers() {
  console.log('🚀 正在连接腾讯云，准备创建超级管理员账号...');

  const initialAdmins = [
    {
      name: '老板1号',
      phone: '13800000001',
      password: 'pnzj_password_123', // 暂时明文，后续可通过接口改成哈希
      role: 'admin',
      is_active: true,
      created_at: new Date()
    },
    {
      name: '老板2号',
      phone: '13800000002',
      password: 'pnzj_password_123',
      role: 'admin',
      is_active: true,
      created_at: new Date()
    },
    {
      name: '老板3号',
      phone: '13800000003',
      password: 'pnzj_password_123',
      role: 'admin',
      is_active: true,
      created_at: new Date()
    }
  ];

  for (const admin of initialAdmins) {
    try {
      // 检查手机号是否已存在
      const exist = await db.collection('users').where({ phone: admin.phone }).get();
      if (exist.data.length > 0) {
        console.log(`⚠️ 账号 [${admin.name} - ${admin.phone}] 已存在，跳过创建。`);
        continue;
      }

      await db.collection('users').add(admin);
      console.log(`✅ 成功创建管理员账号: [${admin.name}]，手机号: ${admin.phone}`);
    } catch (err) {
      console.error(`❌ 创建管理员 [${admin.name}] 失败:`, err.message);
    }
  }

  console.log('\n🎉 所有初始管理员账号处理完毕！');
}

createAdminUsers();