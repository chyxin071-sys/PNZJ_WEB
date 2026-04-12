const cloudbase = require('@cloudbase/node-sdk');
require('dotenv').config({ path: '.env.local' });

// 初始化腾讯云 CloudBase 实例
const app = cloudbase.init({
  env: process.env.NEXT_PUBLIC_TCB_ENV_ID,
  secretId: process.env.TCB_SECRET_ID,
  secretKey: process.env.TCB_SECRET_KEY
});

const db = app.database();

// 对应 schema.sql 里的数据表名
const collections = [
  'users',              // 组织架构/员工表
  'leads',              // 客户线索表
  'materials',          // 材料大厅表
  'quotes',             // 报价单主表
  'quote_items',        // 报价单明细表
  'contracts',          // 合同表
  'projects',           // 施工项目(ERP)表
  'project_nodes',      // 施工节点打卡表
  'customer_documents', // 全局客户附件池
  'follow_ups'          // 沟通跟进日志
];

async function initDB() {
  console.log('🚀 正在连接腾讯云 CloudBase 并初始化数据库...');
  console.log(`📌 当前环境 ID: ${process.env.NEXT_PUBLIC_TCB_ENV_ID}\n`);

  for (const name of collections) {
    try {
      await db.createCollection(name);
      console.log(`✅ 成功创建数据表(集合): [${name}]`);
    } catch (err) {
      if (err.code === 'DATABASE_COLLECTION_EXIST' || (err.message && err.message.includes('exist'))) {
        console.log(`⚠️ 数据表(集合) [${name}] 已存在，跳过。`);
      } else {
        console.error(`❌ 创建数据表 [${name}] 失败:`, err.message);
      }
    }
  }

  console.log('\n🎉 恭喜！品诺筑家系统的所有核心数据库表已在云端建立完毕！');
}

initDB();