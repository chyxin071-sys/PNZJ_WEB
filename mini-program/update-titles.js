const fs = require('fs');
const path = require('path');

const mpRoot = 'E:/XIN Lab/PNZJ/CM1.0/mini-program';

// 1. 修改 app.json 中的 tabBar 文字
const appJsonPath = path.join(mpRoot, 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

appJson.tabBar.list[0].text = '团队';
appJson.tabBar.list[1].text = '客户';
appJson.tabBar.list[2].text = '工地';
appJson.tabBar.list[3].text = '我的';

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2), 'utf8');

// 2. 修改各页面的导航栏标题 (navigationBarTitleText)
const pageNames = {
  'index': '团队',
  'leads': '客户',
  'projects': '工地',
  'profile': '我的'
};

for (const [pageDir, title] of Object.entries(pageNames)) {
  const pageJsonPath = path.join(mpRoot, 'pages', pageDir, 'index.json');
  if (fs.existsSync(pageJsonPath)) {
    const pageJson = JSON.parse(fs.readFileSync(pageJsonPath, 'utf8'));
    pageJson.navigationBarTitleText = title;
    fs.writeFileSync(pageJsonPath, JSON.stringify(pageJson, null, 2), 'utf8');
  }
}

console.log('TabBar and Navigation Titles updated successfully!');
