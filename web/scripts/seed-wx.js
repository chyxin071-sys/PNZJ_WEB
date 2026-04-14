const axios = require('axios');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const APPID = 'wxc9f24e9a9f57bc7a';
const APPSECRET = '41bc50ad8d277918037ea0107d0a07b0';
const ENV = 'cloud1-8grodf5s3006f004';

async function requestTcb(apiName, data, token) {
  const res = await axios.post(`https://api.weixin.qq.com/tcb/${apiName}?access_token=${token}`, {
    env: ENV,
    ...data
  });
  if (res.data.errcode !== 0) {
    console.error(`TCB API ${apiName} failed:`, res.data);
    throw new Error(`TCB API Error: ${res.data.errmsg}`);
  }
  return res.data;
}

async function createCollection(colName, token) {
  try {
    await requestTcb('databasecollectionadd', { collection_name: colName }, token);
    console.log(`创建集合 ${colName} 成功`);
  } catch (err) {
    if (err.message.includes('LimitExceeded.CollectionExist')) {
      console.log(`集合 ${colName} 已存在`);
    } else {
      console.log(`尝试创建集合 ${colName}，可能已存在，跳过。`);
    }
  }
}

async function addDocuments(colName, docs, token) {
  // 微信云开发一次最多插入 10 条（如果不用特殊语句），但是通过 query add可以多条吗？
  // 可以拼接成 db.collection('name').add({ data: [...] })
  try {
    const query = `db.collection("${colName}").add({ data: ${JSON.stringify(docs)} })`;
    await requestTcb('databaseadd', { query }, token);
    console.log(`集合 ${colName} 导入 ${docs.length} 条数据成功`);
  } catch (err) {
    console.error(`导入 ${colName} 失败:`, err.message);
  }
}

async function seed() {
  try {
    console.log('1. 获取 Access Token...');
    const tokenRes = await axios.get(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${APPSECRET}`);
    const token = tokenRes.data.access_token;
    if (!token) throw new Error('获取 Token 失败');
    console.log('Token 获取成功！');

    const collections = ['users', 'leads', 'projects', 'todos'];
    
    // 清空现有数据：删除集合再重建
    for (const col of collections) {
      try {
        await requestTcb('databasecollectiondelete', { collection_name: col }, token);
        console.log(`删除集合 ${col} 成功`);
      } catch(e) {}
      await createCollection(col, token);
    }

    // 导入用户
    const employeesPath = path.join(__dirname, '../../shared/mock_data/employees.json');
    const employeesData = JSON.parse(fs.readFileSync(employeesPath, 'utf-8'));
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('888888', salt);
    
    const usersToInsert = employeesData.map(emp => ({
      _id: 'user_' + emp.id,
      name: emp.name,
      phone: emp.username,
      role: emp.role,
      department: emp.department,
      status: emp.status,
      joinDate: emp.joinDate,
      passwordHash: passwordHash,
      passwordPlain: '888888', // 临时保存明文密码，方便小程序端直接比对登录
      createdAt: new Date().toISOString()
    }));
    await addDocuments('users', usersToInsert, token);

    // 导入客户
    const leadsPath = path.join(__dirname, '../../shared/mock_data/leads.json');
    const leadsData = JSON.parse(fs.readFileSync(leadsPath, 'utf-8'));
    await addDocuments('leads', leadsData, token);

    // 导入工地
    const projectsPath = path.join(__dirname, '../../shared/mock_data/projects.json');
    const projectsData = JSON.parse(fs.readFileSync(projectsPath, 'utf-8'));
    await addDocuments('projects', projectsData, token);

    // 导入待办
    const todosPath = path.join(__dirname, '../../shared/mock_data/todos.json');
    const todosData = JSON.parse(fs.readFileSync(todosPath, 'utf-8'));
    await addDocuments('todos', todosData, token);

    console.log('全部数据导入完成！');
  } catch (err) {
    console.error('Seed error:', err);
  }
}

seed();