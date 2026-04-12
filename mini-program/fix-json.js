const fs = require('fs');
const path = require('path');

const mpRoot = 'E:/XIN Lab/PNZJ/CM1.0/mini-program';
const mockDir = path.join(mpRoot, 'mock');

// 1. Convert JSON mock data to JS modules (WeChat Mini-Program doesn't strictly support raw .json require without proper compiler configs)
['todos', 'leads', 'projects', 'employees'].forEach(name => {
  const jsonPath = path.join(mockDir, name + '.json');
  const jsPath = path.join(mockDir, name + '.js');
  if (fs.existsSync(jsonPath)) {
    const content = fs.readFileSync(jsonPath, 'utf8');
    fs.writeFileSync(jsPath, 'module.exports = ' + content + ';', 'utf8');
  }
});

// 2. Update requires in pages
const indexJs = path.join(mpRoot, 'pages/index/index.js');
if (fs.existsSync(indexJs)) {
  fs.writeFileSync(indexJs, fs.readFileSync(indexJs, 'utf8').replace(/mock\/todos\.json/g, 'mock/todos.js'), 'utf8');
}

const projectsJs = path.join(mpRoot, 'pages/projects/index.js');
if (fs.existsSync(projectsJs)) {
  fs.writeFileSync(projectsJs, fs.readFileSync(projectsJs, 'utf8').replace(/mock\/projects\.json/g, 'mock/projects.js'), 'utf8');
}

// 3. 针对微信底部 TabBar 不稳定支持 SVG 的问题，回退到 png，但目前我们没有真实切图，所以保留透明 png 占位符
const appJsonPath = path.join(mpRoot, 'app.json');
if (fs.existsSync(appJsonPath)) {
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  appJson.tabBar.list.forEach(item => {
    item.iconPath = item.iconPath.replace('.svg', '.png');
    item.selectedIconPath = item.selectedIconPath.replace('.svg', '.png');
  });
  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2), 'utf8');
}

console.log('Fixed JSON require and TabBar icon formats');
