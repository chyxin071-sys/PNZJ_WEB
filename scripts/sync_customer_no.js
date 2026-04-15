const APPID = 'wxc9f24e9a9f57bc7a';
const APPSECRET = '41bc50ad8d277918037ea0107d0a07b0';
const ENV = 'cloud1-8grodf5s3006f004';

async function run() {
  const tokenRes = await fetch(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${APPSECRET}`);
  const token = (await tokenRes.json()).access_token;
  
  // 1. 获取所有 leads
  const leadsRes = await fetch(`https://api.weixin.qq.com/tcb/databasequery?access_token=${token}`, {
    method: 'POST', body: JSON.stringify({ env: ENV, query: `db.collection('leads').limit(100).get()` })
  });
  const leads = (await leadsRes.json()).data.map(item => JSON.parse(item));
  console.log(`Fetched ${leads.length} leads.`);
  
  // 2. 获取所有 projects
  const projRes = await fetch(`https://api.weixin.qq.com/tcb/databasequery?access_token=${token}`, {
    method: 'POST', body: JSON.stringify({ env: ENV, query: `db.collection('projects').limit(100).get()` })
  });
  const projects = (await projRes.json()).data.map(item => JSON.parse(item));
  console.log(`Fetched ${projects.length} projects.`);

  // 3. 获取所有 quotes
  const quoteRes = await fetch(`https://api.weixin.qq.com/tcb/databasequery?access_token=${token}`, {
    method: 'POST', body: JSON.stringify({ env: ENV, query: `db.collection('quotes').limit(100).get()` })
  });
  const quotes = (await quoteRes.json()).data.map(item => JSON.parse(item));
  console.log(`Fetched ${quotes.length} quotes.`);

  // 4. 同步 customerNo 到 projects
  let projectUpdates = 0;
  for (const p of projects) {
    const lead = leads.find(l => l._id === p.leadId);
    if (lead && lead.customerNo) {
      const updateQuery = `db.collection('projects').doc('${p._id}').update({ data: { customerNo: '${lead.customerNo}' } })`;
      await fetch(`https://api.weixin.qq.com/tcb/databaseupdate?access_token=${token}`, {
        method: 'POST', body: JSON.stringify({ env: ENV, query: updateQuery })
      });
      projectUpdates++;
      console.log(`Synced project ${p._id} with customerNo ${lead.customerNo}`);
    }
  }
  
  // 5. 同步 customerNo 到 quotes
  let quoteUpdates = 0;
  for (const q of quotes) {
    const lead = leads.find(l => l._id === q.leadId);
    if (lead && lead.customerNo) {
      const updateQuery = `db.collection('quotes').doc('${q._id}').update({ data: { customerNo: '${lead.customerNo}' } })`;
      await fetch(`https://api.weixin.qq.com/tcb/databaseupdate?access_token=${token}`, {
        method: 'POST', body: JSON.stringify({ env: ENV, query: updateQuery })
      });
      quoteUpdates++;
      console.log(`Synced quote ${q._id} with customerNo ${lead.customerNo}`);
    }
  }
  
  console.log(`Done. Updated ${projectUpdates} projects and ${quoteUpdates} quotes.`);
}
run();