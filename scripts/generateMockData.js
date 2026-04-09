const fs = require('fs');

const generateRandomDate = (start, end) => {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split('T')[0];
};

const firstNames = ["张", "李", "王", "赵", "陈", "刘", "杨", "黄", "周", "吴", "徐", "孙", "朱", "马", "林", "郭", "何", "高", "郑", "罗"];
const lastNames = ["先生", "女士"];

const salesNames = ["王销售", "李销售", "刘销售"];
const designerNames = ["未分配", "赵设计", "陈总监", "李设计"];
const managerNames = ["刘工", "张工", "李工长"];

const statuses = ["沟通中", "已量房", "方案阶段", "已交定金", "待确认", "草稿", "已作废", "已签单", "已流失"];
const projectStatuses = ["开工", "水电", "木工", "瓦工", "墙面", "定制", "软装", "交付"];

const addresses = ["阳光海岸", "锦绣华庭", "金沙半岛", "老城区机械厂家属院", "时代天骄", "星河湾", "恒大绿洲", "万科魅力之城", "保利滨湖", "绿地国际"];

const requirementTypes = ["毛坯", "旧改", "精装微调"];
const sources = ["自然进店", "抖音", "老介新", "自有关系"];

const leads = [];
const quotes = [];
const projects = [];

for (let i = 1; i <= 30; i++) {
  const name = firstNames[Math.floor(Math.random() * firstNames.length)] + lastNames[Math.floor(Math.random() * lastNames.length)];
  const phone = "13" + Math.floor(Math.random() * 900000000 + 100000000).toString();
  const address = addresses[Math.floor(Math.random() * addresses.length)] + ` ${Math.floor(Math.random() * 10 + 1)}栋 ${Math.floor(Math.random() * 5 + 1)}单元 ${Math.floor(Math.random() * 30 + 1)}0${Math.floor(Math.random() * 5 + 1)}`;
  const rating = ["A", "B", "C", "D"][Math.floor(Math.random() * 4)];
  const requirementType = requirementTypes[Math.floor(Math.random() * requirementTypes.length)];
  const area = Math.floor(Math.random() * 100 + 60);
  const budget = Math.floor(Math.random() * 15 + 5) + "万左右";
  const source = sources[Math.floor(Math.random() * sources.length)];
  
  const sales = salesNames[Math.floor(Math.random() * salesNames.length)];
  let designer = designerNames[Math.floor(Math.random() * designerNames.length)];
  
  const createdAt = generateRandomDate(new Date(2023, 0, 1), new Date(2024, 3, 15));
  const lastFollowUp = generateRandomDate(new Date(createdAt), new Date(2024, 3, 15));

  // Determine flow
  let leadStatus = "沟通中";
  let hasQuote = false;
  let hasProject = false;
  
  const flowRandom = Math.random();
  if (flowRandom < 0.3) {
    leadStatus = ["沟通中", "已量房", "已流失"][Math.floor(Math.random() * 3)];
  } else if (flowRandom < 0.6) {
    leadStatus = ["方案阶段", "沟通中"][Math.floor(Math.random() * 2)];
    hasQuote = true;
    if (designer === "未分配") designer = "赵设计";
  } else {
    leadStatus = "已签单";
    hasQuote = true;
    hasProject = true;
    if (designer === "未分配") designer = "陈总监";
  }

  const customerId = `P2024${i.toString().padStart(4, '0')}`;
  
  leads.push({
    id: customerId,
    name,
    phone,
    status: leadStatus,
    rating,
    address,
    requirementType,
    area,
    budget,
    source,
    sales,
    designer,
    createdAt,
    lastFollowUp,
    unread: i <= 3, // First 3 generated leads will have unread notifications
    notes: leadStatus === "已流失" ? "预算不合适，暂无意向" : "正在跟进中，客户意向良好。"
  });

  if (hasQuote) {
    let quoteStatus = "初步";
    if (leadStatus === "已流失") {
      quoteStatus = "已作废";
    } else if (leadStatus === "已签单") {
      quoteStatus = "已确认";
    } else {
      quoteStatus = ["初步", "待确认", "已确认"][Math.floor(Math.random() * 3)];
    }
    
    const total = area * Math.floor(Math.random() * 800 + 800);
    const discount = Math.floor(total * 0.05);
    
    quotes.push({
      id: customerId,
      customer: name,
      phone,
      address,
      status: quoteStatus,
      total,
      discount,
      final: total - discount,
      date: generateRandomDate(new Date(createdAt), new Date(lastFollowUp)),
      sales
    });
  }

  if (hasProject) {
    const manager = managerNames[Math.floor(Math.random() * managerNames.length)];
    const lastFollowUpDate = new Date(lastFollowUp);
    const endDate = new Date(lastFollowUpDate);
    endDate.setDate(endDate.getDate() + 30);
    const projectStartDate = generateRandomDate(lastFollowUpDate, endDate);
    const startDateObj = new Date(projectStartDate);
    const today = new Date();
    const daysElapsed = Math.max(0, Math.floor((today - startDateObj) / (1000 * 60 * 60 * 24)));
    
    const nodeIndex = Math.floor(Math.random() * projectStatuses.length);
    const nodeName = projectStatuses[nodeIndex];
    const currentNode = nodeIndex + 1;
    
    projects.push({
      id: customerId,
      customer: name,
      manager,
      status: ["未开工", "施工中", "已竣工", "已停工"][Math.floor(Math.random() * 4)],
      health: ["正常", "正常", "正常", "预警", "严重延期"][Math.floor(Math.random() * 5)],
      rating,
      startDate: new Date(projectStartDate).toISOString().split('T')[0],
      endDate: new Date(new Date(projectStartDate).setDate(new Date(projectStartDate).getDate() + 90)).toISOString().split('T')[0],
      daysElapsed,
      progress: Math.floor(Math.random() * 100),
      currentStage: nodeName,
      nodeName,
      currentNode,
      upcomingTask: "等待下一步施工确认"
    });
  }
}

// Sort leads by date descending
leads.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
quotes.sort((a, b) => new Date(b.date) - new Date(a.date));
projects.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

fs.writeFileSync('mock_data/leads.json', JSON.stringify(leads, null, 2));
fs.writeFileSync('mock_data/quotes.json', JSON.stringify(quotes, null, 2));
fs.writeFileSync('mock_data/projects.json', JSON.stringify(projects, null, 2));

console.log("Mock data generated successfully!");
