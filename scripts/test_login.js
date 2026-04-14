const APPID = 'wxc9f24e9a9f57bc7a';
const APPSECRET = '41bc50ad8d277918037ea0107d0a07b0';
const ENV = 'cloud1-8grodf5s3006f004';
async function test() {
  const tokenRes = await fetch(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${APPSECRET}`);
  const token = (await tokenRes.json()).access_token;
  const query = `db.collection('users').where(db.command.or([{account: 'PN001'}, {phone: 'PN001'}])).get()`;
  const res = await fetch(`https://api.weixin.qq.com/tcb/databasequery?access_token=${token}`, {
    method: 'POST',
    body: JSON.stringify({ env: ENV, query })
  });
  console.log(await res.json());
}
test();