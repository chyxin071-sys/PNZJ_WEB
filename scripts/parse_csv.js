const fs = require('fs');
const path = require('path');

// 简单的 CSV 解析器
function parseCSV(csvContent) {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].trim().split(',');
  const results = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].trim().split(',');
    if (values.length !== headers.length) continue;
    
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = values[index];
    });
    results.push(obj);
  }
  return results;
}

async function importData() {
  console.log('开始导入假数据到本地 JSON 文件 (用于模拟 API 请求体)...');

  // 1. 读取并解析客户线索 CSV
  const leadsCsvPath = path.join(__dirname, '..', 'templates', '客户线索导入模板.csv');
  const leadsCsv = fs.readFileSync(leadsCsvPath, 'utf8');
  const leadsData = parseCSV(leadsCsv).map(item => ({
    name: item['姓名'],
    phone: item['电话'],
    rating: item['评级'],
    address: item['地址'],
    requirementType: item['需求类型'],
    area: Number(item['面积']),
    budget: item['预算'],
    source: item['来源'],
    status: item['状态'],
    sales: '未分配',
    designer: '未分配',
    lastFollowUp: '暂无',
    unread: false,
    notes: '批量导入测试数据'
  }));

  // 2. 读取并解析材料大厅 CSV
  const materialsCsvPath = path.join(__dirname, '..', 'templates', '材料大厅导入模板.csv');
  const materialsCsv = fs.readFileSync(materialsCsvPath, 'utf8');
  const materialsData = parseCSV(materialsCsv).map(item => ({
    name: item['材料名称'],
    brand: item['品牌/型号'],
    category: item['分类'].split('-')[0], // 提取大类，如 "主材-瓷砖" -> "主材"
    sku: item['规格'],
    unit: item['单位'],
    price: Number(item['单价']),
    stock: Number(item['库存数量']),
    status: item['状态'] === '在售' ? 'active' : 'inactive'
  }));

  fs.writeFileSync(path.join(__dirname, 'import_payloads.json'), JSON.stringify({ leads: leadsData, materials: materialsData }, null, 2));
  console.log(`解析完成：准备导入 ${leadsData.length} 条客户，${materialsData.length} 条材料`);
  // 发送导入请求
  console.log('正在调用本地 API 路由进行导入...');
  const fetch = global.fetch;
  try {
    const res = await fetch('http://localhost:3001/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leads: leadsData, materials: materialsData })
    });
    const result = await res.json();
    console.log('导入结果:', result);
  } catch (e) {
    console.error('导入失败，请确保 Web 服务已在 http://localhost:3000 运行', e);
  }
}

importData();