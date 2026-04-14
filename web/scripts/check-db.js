const axios = require('axios');

const APPID = 'wxc9f24e9a9f57bc7a';
const APPSECRET = '41bc50ad8d277918037ea0107d0a07b0';
const ENV = 'cloud1-8grodf5s3006f004';

async function check() {
  const tokenRes = await axios.get(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${APPSECRET}`);
  const token = tokenRes.data.access_token;
  
  const res = await axios.post(`https://api.weixin.qq.com/tcb/databasequery?access_token=${token}`, {
    env: ENV,
    query: "db.collection('users').where({phone: 'PN001'}).get()"
  });
  console.log(res.data);
}

check();
