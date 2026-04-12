import { NextResponse } from 'next/server';
import cloudbase from '@cloudbase/node-sdk';

export async function POST(request: Request) {
  try {
    const { phone, password } = await request.json();

    if (!phone || !password) {
      return NextResponse.json({ error: '手机号和密码不能为空' }, { status: 400 });
    }

    // 初始化腾讯云 SDK
    const app = cloudbase.init({
      env: process.env.NEXT_PUBLIC_TCB_ENV_ID,
      secretId: process.env.TCB_SECRET_ID,
      secretKey: process.env.TCB_SECRET_KEY
    });

    const db = app.database();

    // 1. 在 users 集合中查找手机号
    const result = await db.collection('users').where({ phone: phone }).get();

    if (result.data.length === 0) {
      return NextResponse.json({ error: '账号不存在或未授权' }, { status: 401 });
    }

    const user = result.data[0];

    // 2. 检查账号是否被停用
    if (!user.is_active) {
      return NextResponse.json({ error: '该账号已被禁用，请联系管理员' }, { status: 403 });
    }

    // 3. 校验密码 (V1 采用明文对比，未来可升级为 bcrypt 哈希)
    if (user.password !== password) {
      return NextResponse.json({ error: '密码错误' }, { status: 401 });
    }

    // 4. 登录成功，返回不包含密码的用户信息
    const { password: _, ...safeUserInfo } = user;
    
    return NextResponse.json({ 
      message: '登录成功',
      user: safeUserInfo 
    }, { status: 200 });

  } catch (error) {
    console.error('Login API Error:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}