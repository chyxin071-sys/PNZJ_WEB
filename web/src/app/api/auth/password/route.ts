import { NextResponse } from 'next/server';
import cloudbase from '@cloudbase/node-sdk';

export async function POST(request: Request) {
  try {
    const { userId, oldPassword, newPassword } = await request.json();

    if (!userId || !oldPassword || !newPassword) {
      return NextResponse.json({ error: '请填写完整信息' }, { status: 400 });
    }

    const app = cloudbase.init({
      env: process.env.NEXT_PUBLIC_TCB_ENV_ID,
      secretId: process.env.TCB_SECRET_ID,
      secretKey: process.env.TCB_SECRET_KEY
    });

    const db = app.database();

    // 1. 获取用户
    const result = await db.collection('users').doc(userId).get();
    if (result.data.length === 0) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    const user = result.data[0];

    // 2. 校验旧密码
    if (user.passwordPlain !== oldPassword && user.passwordHash !== oldPassword) {
      return NextResponse.json({ error: '原密码错误' }, { status: 401 });
    }

    // 3. 更新新密码
    await db.collection('users').doc(userId).update({
      passwordPlain: newPassword
    });

    return NextResponse.json({ message: '密码修改成功' }, { status: 200 });

  } catch (error: any) {
    console.error('Change Password Error:', error);
    return NextResponse.json({ error: error.message || '修改密码失败' }, { status: 500 });
  }
}
