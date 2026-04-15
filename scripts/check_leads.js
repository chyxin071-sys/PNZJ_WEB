const APPID = 'wxc9f24e9a9f57bc7a';
const APPSECRET = '41bc50ad8d277918037ea0107d0a07b0';
const ENV = 'cloud1-8grodf5s3006f004';

async function run() {
  const tokenRes = await fetch(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${APPSECRET}`);
  const tokenData = await tokenRes.json();
  const token = tokenData.access_token;
  
  const query = `db.collection('leads').limit(100).get()`;
  const res = await fetch(`https://api.weixin.qq.com/tcb/databasequery?access_token=${token}`, {
    method: 'POST',
    body: JSON.stringify({ env: ENV, query })
  });
  const dbData = await res.json();
  const leads = dbData.data.map(item => JSON.parse(item));
  
  let count = 0;
  for (const lead of leads) {
    if (lead.sales !== '蒋总' || lead.designer !== '王设计') {
      const updateQuery = `db.collection('leads').doc('${lead._id}').update({ data: { sales: '蒋总', designer: '王设计' } })`;
      await fetch(`https://api.weixin.qq.com/tcb/databaseupdate?access_token=${token}`, {
        method: 'POST',
        body: JSON.stringify({ env: ENV, query: updateQuery })
      });
      count++;
    }
  }
  console.log(`Updated ${count} leads to 蒋总 and 王设计.`);
}
run();