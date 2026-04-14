const APPID = 'wxc9f24e9a9f57bc7a';
const APPSECRET = '41bc50ad8d277918037ea0107d0a07b0';
const ENV = 'cloud1-8grodf5s3006f004';

async function migrate() {
  // 1. Get Token
  const tokenRes = await fetch(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${APPSECRET}`);
  const tokenData = await tokenRes.json();
  const token = tokenData.access_token;
  
  // 2. Get Users
  const res = await fetch(`https://api.weixin.qq.com/tcb/databasequery?access_token=${token}`, {
    method: 'POST',
    body: JSON.stringify({ env: ENV, query: 'db.collection("users").get()' })
  });
  const data = await res.json();
  
  if (data.errcode !== 0) {
    console.error('Query failed', data);
    return;
  }
  
  const users = data.data.map(item => JSON.parse(item));
  
  // 3. Update each user with PN00x account
  let counter = 1;
  for (const user of users) {
    if (!user.account) {
      const account = `PN${counter.toString().padStart(3, '0')}`;
      console.log(`Updating user ${user.name} with account ${account}...`);
      
      const updateQuery = `db.collection("users").doc("${user._id}").update({ data: { account: "${account}" } })`;
      
      const updateRes = await fetch(`https://api.weixin.qq.com/tcb/databaseupdate?access_token=${token}`, {
        method: 'POST',
        body: JSON.stringify({ env: ENV, query: updateQuery })
      });
      const updateData = await updateRes.json();
      console.log('Update result:', updateData);
      counter++;
    } else {
      console.log(`User ${user.name} already has account ${user.account}`);
    }
  }
}

migrate().catch(console.error);