import { NextResponse } from 'next/server';
import { tcbQuery, tcbUpdate, tcbDelete } from '@/lib/wechat-tcb';
import { sendNotifications } from '@/lib/notify';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await request.json();

    const oldData = await tcbQuery(`db.collection("todos").doc("${id}").get()`);
    const oldTodo = oldData?.[0] || {};

    const docData = JSON.stringify(body);
    const query = `db.collection("todos").doc("${id}").update({ data: ${docData} })`;
    const res = await tcbUpdate(query);

    // 状态变更为已完成时，发送通知
    if (body.status === 'completed' && oldTodo.status !== 'completed') {
      const assigneeNames = (oldTodo.assignees || []).map((a: any) => a.name);
      const targets = Array.from(new Set([...assigneeNames, oldTodo.createdBy?.name, 'admin'])).filter(Boolean);
      await sendNotifications(
        targets,
        '待办已完成',
        `待办任务【${oldTodo.title}】已完成`,
        '/todos'
      );
    }

    // 修改待办时通知相关的人
    if (body.assignees) {
      const operatorName = body.updatedBy || '';
      
      const oldAssigneeNames = (oldTodo.assignees || []).map((a: any) => a.name);
      const newAssigneeNames = (body.assignees || []).map((a: any) => a.name);
      
      // 所有相关人员（新的、旧的）
      const allTargets = Array.from(new Set([...oldAssigneeNames, ...newAssigneeNames, 'admin'])).filter(n => n && n !== operatorName);
      
      await sendNotifications(allTargets, '待办任务已更新', `${operatorName} 更新了待办：【${body.title}】的执行人或内容`, '/todos');
    }

    return NextResponse.json(res);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const query = `db.collection("todos").doc("${id}").remove()`;
    const res = await tcbDelete(query);
    return NextResponse.json(res);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
