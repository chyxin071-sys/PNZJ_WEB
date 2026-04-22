import { NextResponse } from 'next/server';
import { tcbQuery, tcbUpdate } from '@/lib/wechat-tcb';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { userId, oldPassword, newPassword } = await request.json();

    if (!userId || !oldPassword || !newPassword) {
      return NextResponse.json({ error: '请填写完整信息' }, { status: 400 });
    }

    // 1. 获取用户
    const users = await tcbQuery(`db.collection("users").doc("${userId}").get()`);
    if (!users || users.length === 0) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    const user = users[0];

    // 2. 校验旧密码
    let isMatch = false;
    if (user.passwordPlain === oldPassword || user.passwordHash === oldPassword) {
      isMatch = true;
    } else if (user.passwordHash) {
      try {
        isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
      } catch (err) {
        console.error("Bcrypt compare error:", err);
      }
    }

    if (!isMatch) {
      return NextResponse.json({ error: '原密码错误' }, { status: 401 });
    }

    // 3. 生成新密码哈希并更新 (同步小程序与网页端登录)
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    const docData = JSON.stringify({
      passwordPlain: newPassword,
      passwordHash: newHash
    });

    await tcbUpdate(`db.collection("users").doc("${userId}").update({ data: ${docData} })`);

    return NextResponse.json({ message: '密码修改成功' }, { status: 200 });

  } catch (error: any) {
    console.error('Change Password Error:', error);
    return NextResponse.json({ error: error.message || '修改密码失败' }, { status: 500 });
  }
}
