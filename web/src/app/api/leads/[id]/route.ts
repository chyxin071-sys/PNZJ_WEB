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
    });

    const query = `db.collection("leads").doc("${id}").update({ data: ${docData} })`;
    const res = await tcbUpdate(query);

    // 触发通知（异步，不阻塞响应）
    const leadName = old.name || '客户';
    const phone = old.phone ? old.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '';
    const link = `/leads/${id}`;

    if (body.sales && body.sales !== old.sales) {
      sendNotifications([body.sales], '你有一条新线索', `${leadName}（${phone}）已分配给你跟进`, link);
      sendNotifications(['admin'], '线索已分配', `线索【${leadName}】已分配给销售：${body.sales}`, link);
    }
    if (body.designer && body.designer !== old.designer) {
      sendNotifications([body.designer], '你有一条新设计任务', `客户【${leadName}】已分配给你跟进方案`, link);
      sendNotifications(['admin'], '线索已分配', `线索【${leadName}】已分配给设计师：${body.designer}`, link);
    }
    if (body.status === '已签单' && old.status !== '已签单') {
      try {
        const employees = await tcbQuery(`db.collection("employees").limit(100).get()`);
        const allNames = employees ? employees.map((e: any) => e.name) : ['admin'];
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
