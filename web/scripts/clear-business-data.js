const axios = require('axios');

const APPID = 'wxc9f24e9a9f57bc7a';
const APPSECRET = '41bc50ad8d277918037ea0107d0a07b0';
const ENV = 'cloud1-8grodf5s3006f004';

async function getToken() {
  const res = await axios.get(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${APPSECRET}`);
  return res.data.access_token;
}

async function clearCollection(collectionName, token) {
  console.log(`Clearing collection: ${collectionName}...`);
  // 微信云开发限制单次删除数量，为了彻底清空，直接删除集合再重建
  try {
    await axios.post(`https://api.weixin.qq.com/tcb/databasecollectiondelete?access_token=${token}`, {
      env: ENV,
      collection_name: collectionName
    });
    console.log(`Collection ${collectionName} deleted.`);
  } catch(e) {
    console.log(`Failed to delete ${collectionName}, maybe not exists.`);
  }

  // 稍等一秒再重建
  await new Promise(r => setTimeout(r, 1000));

  try {
    await axios.post(`https://api.weixin.qq.com/tcb/databasecollectionadd?access_token=${token}`, {
      env: ENV,
      collection_name: collectionName
    });
    console.log(`Collection ${collectionName} created.`);
  } catch(e) {
    console.log(`Failed to create ${collectionName}.`);
  }
}

async function main() {
  console.log('Starting data cleanup...');
  const token = await getToken();
  if (!token) {
    console.error('Failed to get token');
    return;
  }

  // 清空业务数据
  await clearCollection('leads', token);
  await clearCollection('projects', token);
  await clearCollection('todos', token);
  await clearCollection('followUps', token);

  console.log('Business data cleared successfully! Users are kept intact.');
}

main();