import { tcbAdd } from './wechat-tcb';

/**
 * 发送系统通知
 * @param targetUser 接收人用户名，传 'admin' 表示发给所有管理员
 * @param title 通知标题
 * @param content 通知内容
 * @param link 点击跳转链接（可选）
 */
export async function sendNotification(
  targetUser: string,
  title: string,
  content: string,
  link?: string
) {
  try {
    const docData = JSON.stringify({
      targetUser,
      title,
      content,
      link: link || '',
      type: 'system',
      isRead: false,
      isStarred: false,
      createTime: { $date: Date.now() }
    });
    await tcbAdd(`db.collection("notifications").add({ data: ${docData} })`);
  } catch (e) {
    // 通知失败不影响主业务
    console.error('发送通知失败', e);
  }
}

/**
 * 批量发送通知给多个用户（自动去重，跳过空值）
 */
export async function sendNotifications(
  targets: (string | undefined | null)[],
  title: string,
  content: string,
  link?: string
) {
  const unique = [...new Set(targets.filter(Boolean))] as string[];
  await Promise.all(unique.map(t => sendNotification(t, title, content, link)));
}
