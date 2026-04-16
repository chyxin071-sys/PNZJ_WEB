// Use native fetch
const APPID = 'wxc9f24e9a9f57bc7a';
const APPSECRET = '41bc50ad8d277918037ea0107d0a07b0';
const ENV = 'cloud1-8grodf5s3006f004';

const templateNodes = [
  { name: "开工", duration: 3, subNodes: ["开工仪式", "现场交底", "成品保护", "墙体拆除", "垃圾清运", "设备定位", "砌筑新建", "墙体批荡"] },
  { name: "水电", duration: 7, subNodes: ["水电交底", "开槽布管", "排污下水", "线管敷设", "打压测试", "水电验收"] },
  { name: "木工", duration: 10, subNodes: ["木工交底", "吊顶龙骨", "石膏板封样", "背景墙打底", "隔墙制作", "木工验收"] },
  { name: "瓦工", duration: 15, subNodes: ["瓦工交底", "下水管包管", "防水涂刷", "闭水试验", "地面找平", "瓷砖铺贴", "瓷砖美缝", "瓦工验收"] },
  { name: "墙面", duration: 12, subNodes: ["墙面交底", "基层找平", "挂网防裂", "腻子批刮", "乳胶漆涂刷", "墙面验收"] },
  { name: "定制", duration: 20, subNodes: ["复尺测量", "厨卫吊顶", "木地板铺装", "木门安装", "柜体安装", "台面安装", "五金挂件"] },
  { name: "软装", duration: 7, subNodes: ["窗帘壁纸", "灯具安装", "开关面板", "卫浴安装", "大家电进场", "家具进场"] },
  { name: "交付", duration: 3, subNodes: ["拓荒保洁", "室内空气治理", "竣工验收", "钥匙移交", "合影留念"] }
];

async function updateProjects() {
  const tokenRes = await fetch(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${APPSECRET}`);
  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;
  
  if (!accessToken) {
    console.error('Failed to get token');
    return;
  }

  const url = `https://api.weixin.qq.com/tcb/databasequery?access_token=${accessToken}`;
  const queryRes = await fetch(url, {
    method: 'POST',
    body: JSON.stringify({ env: ENV, query: `db.collection('projects').limit(100).get()` })
  });
  
  const queryData = await queryRes.json();
  const projects = queryData.data.map(p => JSON.parse(p));
  
  console.log(`Found ${projects.length} projects.`);

  const updateUrl = `https://api.weixin.qq.com/tcb/databaseupdate?access_token=${accessToken}`;
  
  for (let p of projects) {
    // We recreate nodesData
    let newNodes = templateNodes.map((template, index) => {
      let status = 'pending';
      let startDate = '', endDate = '';
      
      const sd = new Date(p.startDate ? p.startDate.replace(/-/g, '/') : new Date());
      sd.setDate(sd.getDate() + index * 5);
      startDate = `${sd.getFullYear()}-${String(sd.getMonth()+1).padStart(2,'0')}-${String(sd.getDate()).padStart(2,'0')}`;
      
      const ed = new Date(sd);
      ed.setDate(ed.getDate() + 5);
      endDate = `${ed.getFullYear()}-${String(ed.getMonth()+1).padStart(2,'0')}-${String(ed.getDate()).padStart(2,'0')}`;

      if (index === 0) status = 'current';

      return {
        name: template.name,
        duration: template.duration,
        subNodes: template.subNodes.map(s => ({ name: s, status: "pending", records: [] })),
        status,
        startDate,
        endDate,
        records: [],
        delayRecords: []
      };
    });

    const updateQuery = `db.collection('projects').doc('${p._id}').update({data: { nodesData: ${JSON.stringify(newNodes)}, currentNode: 1 }})`;
    
    await fetch(updateUrl, {
      method: 'POST',
      body: JSON.stringify({ env: ENV, query: updateQuery })
    });
    console.log(`Updated project: ${p._id}`);
  }
  console.log('All projects updated to 8 nodes structure.');
}

updateProjects();