import { NextResponse } from 'next/server';
import { tcbUpdate, tcbDelete } from '@/lib/wechat-tcb';

// 启用/停用员工，或修改基本信息
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const body = await request.json();

    if (!id) {
      return NextResponse.json({ error: '缺失员工 ID' }, { status: 400 });
    }

    // 只允许更新特定的安全字段
    const updateData: any = {};
    if (body.is_active !== undefined) updateData.status = body.is_active ? 'active' : 'inactive';
    if (body.role) updateData.role = body.role;
    if (body.name) updateData.name = body.name;
    if (body.phone) updateData.phone = body.phone;
    if (body.department) updateData.department = body.department;
    if (body.joinDate) updateData.joinDate = body.joinDate;
    if (body.password) updateData.passwordPlain = body.password; // Admin reset password

    const docData = JSON.stringify({
      ...updateData,
      updated_at: { $date: Date.now() }
    });

    const query = `db.collection("users").doc("${id}").update({ data: ${docData} })`;
    await tcbUpdate(query);

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

    const query = `db.collection("users").doc("${id}").remove()`;
    await tcbDelete(query);

    return NextResponse.json({ message: '员工已删除' }, { status: 200 });

  } catch (error: any) {
    console.error('Delete Employee Error:', error);
    return NextResponse.json({ error: error.message || '删除员工失败' }, { status: 500 });
  }
}