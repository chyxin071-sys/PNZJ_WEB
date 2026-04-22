import { NextResponse } from 'next/server';
import { tcbQuery, tcbUpdate, tcbDelete } from '@/lib/wechat-tcb';

// 启用/停用员工，或修改基本信息
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const body = await request.json();

    if (!id) {
      return NextResponse.json({ error: '缺失员工 ID' }, { status: 400 });
    }

    // 获取老用户信息以便进行全局名字同步
    const userQuery = `db.collection("users").doc("${id}").get()`;
    const userData = await tcbQuery(userQuery);
    let oldName = '';
    if (userData && userData.length > 0) {
      oldName = userData[0].name;
    }

    // 只允许更新特定的安全字段
    const updateData: any = {};
    if (body.is_active !== undefined) {
      updateData.isActive = body.is_active;
      updateData.is_active = body.is_active;
      updateData.status = body.is_active ? '在职' : '已离职';
    }
    if (body.role) updateData.role = body.role;
    if (body.name) updateData.name = body.name;
    if (body.phone) updateData.phone = body.phone;
    if (body.account) updateData.account = body.account;
    if (body.department) updateData.department = body.department;
    if (body.joinDate) updateData.joinDate = body.joinDate;
    if (body.password) updateData.passwordPlain = body.password; // Admin reset password

    const docData = JSON.stringify({
      ...updateData,
      updated_at: { $date: Date.now() }
    });

    const query = `db.collection("users").doc("${id}").update({ data: ${docData} })`;
    await tcbUpdate(query);

    // 如果名字发生改变，全局同步名字
    if (body.name && oldName && body.name !== oldName) {
      const newName = body.name;
      const syncQueries = [
        `db.collection("leads").where({ creatorName: "${oldName}" }).update({ data: { creatorName: "${newName}" } })`,
        `db.collection("leads").where({ sales: "${oldName}" }).update({ data: { sales: "${newName}" } })`,
        `db.collection("leads").where({ designer: "${oldName}" }).update({ data: { designer: "${newName}" } })`,
        `db.collection("leads").where({ manager: "${oldName}" }).update({ data: { manager: "${newName}" } })`,
        `db.collection("leads").where({ signer: "${oldName}" }).update({ data: { signer: "${newName}" } })`,

        `db.collection("projects").where({ manager: "${oldName}" }).update({ data: { manager: "${newName}" } })`,
        `db.collection("projects").where({ sales: "${oldName}" }).update({ data: { sales: "${newName}" } })`,
        `db.collection("projects").where({ designer: "${oldName}" }).update({ data: { designer: "${newName}" } })`,

        `db.collection("quotes").where({ sales: "${oldName}" }).update({ data: { sales: "${newName}" } })`,
        `db.collection("quotes").where({ modifier: "${oldName}" }).update({ data: { modifier: "${newName}" } })`,

        `db.collection("todos").where({ creatorName: "${oldName}" }).update({ data: { creatorName: "${newName}" } })`,

        `db.collection("followUps").where({ createdBy: "${oldName}" }).update({ data: { createdBy: "${newName}" } })`,
        
        `db.collection("notifications").where({ senderName: "${oldName}" }).update({ data: { senderName: "${newName}" } })`,
        `db.collection("notifications").where({ targetUser: "${oldName}" }).update({ data: { targetUser: "${newName}" } })`
      ];

      for (const sq of syncQueries) {
        try {
          await tcbUpdate(sq);
        } catch (e) {
          console.error('Sync update failed:', sq, e);
        }
      }
      
      // todos assignees 处理
      try {
        const todosData = await tcbQuery(`db.collection("todos").where({ "assignees.name": "${oldName}" }).get()`);
        for (const t of todosData) {
          if (t.assignees) {
            const newAssignees = t.assignees.map((a: any) => a.name === oldName ? { ...a, name: newName } : a);
            const assignedNames = newAssignees.map((a: any) => a.name).join(', ');
            await tcbUpdate(`db.collection("todos").doc("${t._id}").update({ data: { assignees: ${JSON.stringify(newAssignees)}, assignedNames: "${assignedNames}" } })`);
          }
        }
      } catch (e) {
        console.error('Sync todos assignees failed:', e);
      }
    }

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