import { NextResponse } from 'next/server';
import cloudbase from '@cloudbase/node-sdk';

// 懒加载初始化数据库连接
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

// 启用/停用员工，或修改基本信息
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const body = await request.json();

    if (!id) {
      return NextResponse.json({ error: '缺失员工 ID' }, { status: 400 });
    }

    const db = getDb();
    
    // 只允许更新特定的安全字段
    const updateData: any = {};
    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    if (body.role) updateData.role = body.role;
    if (body.name) updateData.name = body.name;
    if (body.phone) updateData.phone = body.phone;
    if (body.department) updateData.department = body.department;
    if (body.joinDate) updateData.joinDate = body.joinDate;
    if (body.password) updateData.password = body.password; // Admin reset password

    await db.collection('users').doc(id).update(updateData);

    return NextResponse.json({ message: '员工信息已更新' }, { status: 200 });

  } catch (error: any) {
    console.error('Update Employee Error:', error);
    return NextResponse.json({ error: error.message || '更新员工信息失败' }, { status: 500 });
  }
}

// 彻底删除员工（危险操作）
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;

    if (!id) {
      return NextResponse.json({ error: '缺失员工 ID' }, { status: 400 });
    }

    const db = getDb();
    await db.collection('users').doc(id).remove();

    return NextResponse.json({ message: '员工已成功删除' }, { status: 200 });

  } catch (error: any) {
    console.error('Delete Employee Error:', error);
    return NextResponse.json({ error: error.message || '删除员工失败' }, { status: 500 });
  }
}