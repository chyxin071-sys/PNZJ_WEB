const cloudbase = require('@cloudbase/node-sdk');
require('dotenv').config({ path: '.env.local' });

const app = cloudbase.init({
  env: process.env.NEXT_PUBLIC_TCB_ENV_ID,
  secretId: process.env.TCB_SECRET_ID,
  secretKey: process.env.TCB_SECRET_KEY
});

const db = app.database();

async function deleteExtraAccount() {
  try {
    const res = await db.collection('users').where({ phone: '13800000001' }).remove();
    console.log('Deleted 0001 account:', res);
  } catch (error) {
    console.error('Error:', error);
  }
}

deleteExtraAccount();