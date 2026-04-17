import { NextResponse } from 'next/server';
import { tcbQuery, tcbAdd, tcbCount } from '@/lib/wechat-tcb';
import { sendNotifications } from '@/lib/notify';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '100')));
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      tcbQuery(`db.collection("todos").orderBy("createdAt", "desc").skip(${skip}).limit(${pageSize}).get()`),
      tcbCount(`db.collection("todos").count()`)
    ]);

    if (!searchParams.get('page')) return NextResponse.json(data);
    return NextResponse.json({ data, total, page, pageSize });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const docData = JSON.stringify({
      ...body,
      createdAt: { $date: Date.now() }
    });

    const query = `db.collection("todos").add({ data: ${docData} })`;
    const res = await tcbAdd(query);

    // 通知被指派的人
    const creatorName = body.creatorName || '';
    const assignees: any[] = body.assignees || [];
    const targets = assignees.map((a: any) => a.name).filter(n => n && n !== creatorName);
    if (creatorName) targets.push('admin');
    sendNotifications(targets, '收到新的待办任务', `${creatorName} 给你指派了待办：【${body.title}】`, '/todos');

    return NextResponse.json(res);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
