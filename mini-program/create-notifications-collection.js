// 这是一段用于提示如何在微信开发者工具中操作的伪代码/说明
// 因为代码不能直接在腾讯云数据库创建集合
console.log("请在微信开发者工具 -> 云开发 -> 数据库 中手动创建一个名为 `notifications` 的集合。");
console.log("创建后，请点击 `notifications` 集合的数据权限，选择【自定义安全规则】，并输入以下规则：");
console.log(`
{
  "read": true,
  "write": true
}
`);
console.log("这样就可以让小程序端能够正常读写通知了。");
