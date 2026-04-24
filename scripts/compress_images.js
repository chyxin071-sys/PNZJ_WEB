const fs = require('fs');
const path = require('path');
const cloudbase = require('@cloudbase/node-sdk');
const sharp = require('sharp');
const axios = require('axios');
const os = require('os');

// ================= 配置区域 =================
const ENV_ID = '你的云开发环境ID'; // 请替换为你的云开发环境ID
const SECRET_ID = '你的腾讯云SecretId'; // 请替换
const SECRET_KEY = '你的腾讯云SecretKey'; // 请替换

const app = cloudbase.init({
  env: ENV_ID,
  secretId: SECRET_ID,
  secretKey: SECRET_KEY
});

const db = app.database();
const _ = db.command;

async function downloadFile(url, dest) {
  const writer = fs.createWriteStream(dest);
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream'
  });
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

async function main() {
  console.log('开始执行历史图片压缩脚本...');
  
  // 1. 获取所有工地记录
  const { data: projects } = await db.collection('projects').limit(1000).get();
  console.log(`获取到 ${projects.length} 个工地记录。`);

  let compressedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const project of projects) {
    let needUpdate = false;
    const nodesData = project.nodesData || [];

    for (const majorNode of nodesData) {
      if (!majorNode.subNodes) continue;

      for (const subNode of majorNode.subNodes) {
        if (!subNode.acceptanceRecord || !subNode.acceptanceRecord.photos) continue;

        const photos = subNode.acceptanceRecord.photos;
        for (let i = 0; i < photos.length; i++) {
          const photo = photos[i];
          if (photo.type !== 'image') continue;

          const fileID = photo.url;
          if (!fileID || !fileID.startsWith('cloud://')) continue;

          // 检查是否已经压缩过（这里通过自定义后缀判断，或者你可以直接覆盖）
          if (fileID.includes('_compressed')) {
            skippedCount++;
            continue;
          }

          try {
            console.log(`正在处理工地 [${project.address}] 的图片: ${fileID}`);
            
            // 获取真实下载链接
            const { fileList } = await app.getTempFileURL({
              fileList: [fileID]
            });
            const downloadUrl = fileList[0].tempFileURL;

            if (!downloadUrl) {
              console.log('获取下载链接失败:', fileID);
              errorCount++;
              continue;
            }

            // 下载图片到本地临时目录
            const tmpRawPath = path.join(os.tmpdir(), `raw_${Date.now()}.jpg`);
            const tmpCompressedPath = path.join(os.tmpdir(), `compressed_${Date.now()}.jpg`);
            
            await downloadFile(downloadUrl, tmpRawPath);

            // 使用 sharp 进行压缩 (质量 60%)
            await sharp(tmpRawPath)
              .jpeg({ quality: 60 })
              .toFile(tmpCompressedPath);

            // 上传压缩后的图片回云存储
            const newCloudPath = fileID.replace('cloud://' + ENV_ID + '.', '').replace(/\.[^/.]+$/, "") + '_compressed.jpg';
            
            await app.uploadFile({
              cloudPath: newCloudPath,
              fileContent: fs.createReadStream(tmpCompressedPath)
            });

            // 获取新的 fileID 格式 (cloud://env-id.xxx/newCloudPath)
            const newFileID = `cloud://${ENV_ID}.${newCloudPath}`;
            
            // 更新记录中的 URL
            photos[i].url = newFileID;
            needUpdate = true;
            compressedCount++;

            // 清理本地临时文件
            fs.unlinkSync(tmpRawPath);
            fs.unlinkSync(tmpCompressedPath);

            console.log(`✅ 成功压缩并替换: ${newFileID}`);
          } catch (err) {
            console.error(`❌ 处理图片 ${fileID} 时出错:`, err.message);
            errorCount++;
          }
        }
      }
    }

    // 2. 如果该工地有更新的图片，更新到数据库
    if (needUpdate) {
      console.log(`更新工地 [${project.address}] 的数据到数据库...`);
      await db.collection('projects').doc(project._id).update({
        nodesData: nodesData
      });
    }
  }

  console.log('=================================');
  console.log(`执行完毕！总计压缩: ${compressedCount}, 跳过(已压缩): ${skippedCount}, 失败: ${errorCount}`);
}

main().catch(console.error);
