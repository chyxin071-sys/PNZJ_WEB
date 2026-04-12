import { NextResponse } from 'next/server';
import cloudbase from '@cloudbase/node-sdk';

// 懒加载初始化数据库连接，避免多次执行
let db: any = null;
function getDb() {
  if (!db) {
    const app = cloudbase.init({
      env: process.env.NEXT_PUBLIC_TCB_ENV_ID,
      secretId: process.env.TCB_SECRET_ID,
      secretKey: process.env.TCB_SECRET_KEY
    });
    db = app.database();
  }
  return db;
}

// 获取全部员工列表
export async function GET(request: Request) {
  try {
    const db = getDb();
    // 按照创建时间倒序获取用户列表
    const res = await db.collection('users').orderBy('created_at', 'desc').limit(100).get();
    
    // 不返回密码字段
    const users = res.data.map((user: any) => {
      const { password, ...safeUser } = user;
      return safeUser;
    });

    return NextResponse.json(users, { status: 200 });
  } catch (error: any) {
    console.error('Fetch Employees Error:', error);
    return NextResponse.json({ error: error.message || '获取员工列表失败' }, { status: 500 });
  }
}

// 添加新员工
export async function POST(request: Request) {
  try {
    const { name, phone, role, password, department, joinDate } = await request.json();

    if (!name || !phone || !role || !password) {
      return NextResponse.json({ error: '请填写完整的员工信息' }, { status: 400 });
    }

    const db = getDb();

    // 检查手机号是否重复
    const exist = await db.collection('users').where({ phone: phone }).get();
    if (exist.data.length > 0) {
      return NextResponse.json({ error: '该手机号已注册，请勿重复添加' }, { status: 400 });
    }

    // 插入新员工
    const newEmployee = {
      name,
      phone,
      role,
      department: department || '',
      joinDate: joinDate || new Date().toISOString().split('T')[0],
      password, // V1.0 明文密码，后续可加密
      is_active: true,
      created_at: new Date()
    };

    const res = await db.collection('users').add(newEmployee);
    
    return NextResponse.json({ 
      message: '员工添加成功', 
      id: res.id 
    }, { status: 201 });

  } catch (error: any) {
    console.error('Create Employee Error:', error);
    return NextResponse.json({ error: error.message || '添加员工失败' }, { status: 500 });
  }
}