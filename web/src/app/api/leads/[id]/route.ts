import { NextResponse } from 'next/server';
import { tcbQuery, tcbUpdate, tcbDelete } from '@/lib/wechat-tcb';
import { sendNotifications } from '@/lib/notify';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const query = `db.collection("leads").doc("${id}").get()`;
    const data = await tcbQuery(query);

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json(data[0]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await request.json();

    // 查旧数据，用于对比分配变化
    const oldData = await tcbQuery(`db.collection("leads").doc("${id}").get()`);
    const old = oldData?.[0] || {};

    const docData = JSON.stringify({
      ...body,
      updatedAt: { $date: Date.now() }
    }).replace(/\n/g, '\\n').replace(/\r/g, '\\r');

    const query = `db.collection("leads").doc("${id}").update({ data: ${docData} })`;
    const res = await tcbUpdate(query);

    // 触发通知（异步，不阻塞响应）
    const leadName = old.name || '客户';
    const phone = old.phone ? old.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '';
    const link = `/leads/${id}`;

    if (body.sales && body.sales !== old.sales) {
      await sendNotifications(['admin', old.sales, body.sales].filter(Boolean), '销售负责人变更', `客户【${leadName}】的销售已从【${old.sales || '无'}】变更为【${body.sales}】`, link);
    }
    if (body.designer && body.designer !== old.designer) {
      await sendNotifications(['admin', old.designer, body.designer].filter(Boolean), '设计师变更', `客户【${leadName}】的设计师已从【${old.designer || '无'}】变更为【${body.designer}】`, link);
    }
    if (body.status === '已签单' && old.status !== '已签单') {
      try {
        const allUsers = await tcbQuery(`db.collection("users").where({ isActive: true }).limit(100).get()`);
        const allNames = allUsers && allUsers.length > 0 ? allUsers.map((e: any) => e.name).filter(Boolean) : ['admin'];
        await sendNotifications(allNames, '🎉 恭喜开单', `好消息！客户【${leadName}】已成功签单，大家再接再厉！`, link);
      } catch (err) {
        console.error('发送签单通知失败', err);
      }
    }

    return NextResponse.json(res);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const query = `db.collection("leads").doc("${id}").remove()`;
    const res = await tcbDelete(query);
    return NextResponse.json(res);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
