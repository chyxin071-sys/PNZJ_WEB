const axios = require('axios');

const APPID = 'wxc9f24e9a9f57bc7a';
const APPSECRET = '41bc50ad8d277918037ea0107d0a07b0';
const ENV = 'cloud1-8grodf5s3006f004';

async function test() {
  try {
    console.log('1. 获取 Access Token...');
    const tokenRes = await axios.get(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${APPSECRET}`);
    
    if (!tokenRes.data.access_token) {
      console.error('获取 Token 失败:', tokenRes.data);
      return;
    }
    const token = tokenRes.data.access_token;
    console.log('Token 获取成功！');

    console.log('2. 测试查询云数据库 users 集合...');
    const queryRes = await axios.post(`https://api.weixin.qq.com/tcb/databasequery?access_token=${token}`, {
      env: ENV,
      query: 'db.collection("users").limit(1).get()'
    });

    console.log('查询结果:', JSON.stringify(queryRes.data, null, 2));
  } catch (err) {
    console.error('测试出错:', err.response ? err.response.data : err.message);
  }
}

test();