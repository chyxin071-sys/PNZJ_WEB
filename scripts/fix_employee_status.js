const APPID = 'wxc9f24e9a9f57bc7a';
const APPSECRET = '41bc50ad8d277918037ea0107d0a07b0';
const ENV = 'cloud1-8grodf5s3006f004';

async function run() {
  const tokenRes = await fetch(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${APPSECRET}`);
  const token = (await tokenRes.json()).access_token;
  
  const usersRes = await fetch(`https://api.weixin.qq.com/tcb/databasequery?access_token=${token}`, {
    method: 'POST', body: JSON.stringify({ env: ENV, query: `db.collection('users').limit(100).get()` })
  });
  const users = (await usersRes.json()).data.map(item => JSON.parse(item));
  
  let updates = 0;
  for (const user of users) {
    // 强制把旧的脏数据刷一遍，如果是假数据或没被封禁的，全部默认改为在职(true)
    const updateQuery = `db.collection('users').doc('${user._id}').update({ data: { isActive: true, is_active: true, status: '在职' } })`;
    await fetch(`https://api.weixin.qq.com/tcb/databaseupdate?access_token=${token}`, {
      method: 'POST', body: JSON.stringify({ env: ENV, query: updateQuery })
    });
    console.log(`Updated user ${user.name || user.account} to active`);
    updates++;
  }
  console.log(`Done. Updated ${updates} users.`);
}
run();