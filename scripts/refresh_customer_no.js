// remove fetch require, using native global fetch
const APPID = 'wxc9f24e9a9f57bc7a';
const APPSECRET = '41bc50ad8d277918037ea0107d0a07b0';
const ENV = 'cloud1-8grodf5s3006f004';

async function run() {
  const tokenRes = await fetch(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${APPSECRET}`);
  const token = (await tokenRes.json()).access_token;
  
  const leadsRes = await fetch(`https://api.weixin.qq.com/tcb/databasequery?access_token=${token}`, {
    method: 'POST', body: JSON.stringify({ env: ENV, query: `db.collection('leads').limit(100).get()` })
  });
  const leads = (await leadsRes.json()).data.map(item => JSON.parse(item));
  
  // 按创建时间倒序或 ID 排序，重新分配今年编号
  const year = new Date().getFullYear();
  let seq = 1;
  
  for (const lead of leads) {
    const customerNo = `P${year}${seq.toString().padStart(3, '0')}`;
    const updateQuery = `db.collection('leads').doc('${lead._id}').update({ data: { customerNo: '${customerNo}' } })`;
    await fetch(`https://api.weixin.qq.com/tcb/databaseupdate?access_token=${token}`, {
      method: 'POST', body: JSON.stringify({ env: ENV, query: updateQuery })
    });
    console.log(`Updated lead ${lead.name} with customerNo ${customerNo}`);
    seq++;
  }
}
run();