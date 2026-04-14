const fs = require('fs');
const glob = require('glob');

const files = glob.sync('pages/**/*.wxml', { cwd: 'e:/XIN Lab/PNZJ/CM1.0/mini-program' });
files.forEach(file => {
  const content = fs.readFileSync(`e:/XIN Lab/PNZJ/CM1.0/mini-program/${file}`, 'utf-8');
  let openCount = (content.match(/<view/g) || []).length;
  let closeCount = (content.match(/<\/view>/g) || []).length;
  if (openCount !== closeCount) {
    console.log(`Mismatch in ${file}: <view> ${openCount} != </view> ${closeCount}`);
  }
});
console.log('Check complete.');
