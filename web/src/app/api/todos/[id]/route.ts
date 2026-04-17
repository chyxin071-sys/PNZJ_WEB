import { NextResponse } from 'next/server';
import { tcbQuery, tcbUpdate, tcbDelete } from '@/lib/wechat-tcb';
import { sendNotifications } from '@/lib/notify';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await request.json();

    const docData = JSON.stringify(body);
    const query = `db.collection("todos").doc("${id}").update({ data: ${docData} })`;
    const res = await tcbUpdate(query);

    // 修改待办时通知被指派的人
    if (body.assignees) {
      const operatorName = body.updatedBy || '';
      const targets = (body.assignees as any[]).map(a => a.name).filter(n => n && n !== operatorName);
      if (operatorName) targets.push('admin');
      sendNotifications(targets, '待办任务已更新', `${operatorName} 更新了待办：【${body.title}】`, '/todos');
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
