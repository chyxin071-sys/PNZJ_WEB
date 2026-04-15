const APPID = 'wxc9f24e9a9f57bc7a';
const APPSECRET = '41bc50ad8d277918037ea0107d0a07b0';
const ENV = 'cloud1-8grodf5s3006f004';

async function run() {
  const tokenRes = await fetch(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${APPSECRET}`);
  const token = (await tokenRes.json()).access_token;
  
  const projRes = await fetch(`https://api.weixin.qq.com/tcb/databasequery?access_token=${token}`, {
    method: 'POST', body: JSON.stringify({ env: ENV, query: `db.collection('projects').limit(100).get()` })
  });
  const projects = (await projRes.json()).data.map(item => JSON.parse(item));
  
  const leadsRes = await fetch(`https://api.weixin.qq.com/tcb/databasequery?access_token=${token}`, {
    method: 'POST', body: JSON.stringify({ env: ENV, query: `db.collection('leads').limit(100).get()` })
  });
  const leads = (await leadsRes.json()).data.map(item => JSON.parse(item));
  
  for (const p of projects) {
    const lead = leads.find(l => l._id === p.leadId);
    if (lead) {
      const updateQuery = `db.collection('projects').doc('${p._id}').update({ data: { phone: '${lead.phone}', sales: '${lead.sales}', designer: '${lead.designer}' } })`;
      await fetch(`https://api.weixin.qq.com/tcb/databaseupdate?access_token=${token}`, {
        method: 'POST', body: JSON.stringify({ env: ENV, query: updateQuery })
      });
      console.log(`Updated project ${p.customer} with phone ${lead.phone}`);
    }
  }
}
run();