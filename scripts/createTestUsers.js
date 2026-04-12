const cloudbase = require('@cloudbase/node-sdk');
require('dotenv').config({ path: '.env.local' });

const app = cloudbase.init({
  env: process.env.NEXT_PUBLIC_TCB_ENV_ID,
  secretId: process.env.TCB_SECRET_ID,
  secretKey: process.env.TCB_SECRET_KEY
});

const db = app.database();

async function createTestUsers() {
  const users = [
    { name: '蒋经理', phone: '13800000002', role: 'admin', department: '管理组', password: '123', is_active: true, created_at: new Date() },
    { name: '陈设计', phone: '13800000003', role: 'designer', department: '设计部', password: '123', is_active: true, created_at: new Date() },
    { name: '李销售', phone: '13800000004', role: 'sales', department: '销售部', password: '123', is_active: true, created_at: new Date() },
    { name: '王工地', phone: '13800000005', role: 'manager', department: '工程部', password: '123', is_active: true, created_at: new Date() }
  ];

  for (const user of users) {
    // Check if exists
    const exist = await db.collection('users').where({ phone: user.phone }).get();
    if (exist.data.length === 0) {
      await db.collection('users').add(user);
      console.log(`Created: ${user.name} (${user.phone})`);
    } else {
      console.log(`Exists: ${user.name} (${user.phone})`);
    }
  }
  console.log('Done!');
}

createTestUsers();
