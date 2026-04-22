import { NextResponse } from 'next/server';
import { tcbQuery, tcbUpdate, tcbDelete, tcbAdd } from '@/lib/wechat-tcb';
import { sendNotifications } from '@/lib/notify';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const query = `db.collection("quotes").doc("${id}").get()`;
    const data = await tcbQuery(query);
    
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
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
    
    const docData = JSON.stringify({
      ...body,
      updatedAt: { $date: Date.now() }
    }).replace(/\n/g, '\\n').replace(/\r/g, '\\r');
    
    const query = `db.collection("quotes").doc("${id}").update({ data: ${docData} })`;
    const res = await tcbUpdate(query);

    // 发送通知
    const targets = Array.from(new Set(['admin', body.sales, body.designer, body.manager])).filter(Boolean);
    await sendNotifications(
      targets,
      '报价单已更新',
      `${body.modifier || body.sales || body.designer || '团队成员'} 更新了客户【${body.customer || ''}】的报价单，最新总价 ¥${(body.final || 0).toLocaleString()}`,
      body.leadId ? `/leads/${body.leadId}` : '/quotes'
    );

    // BUG-23: 报价单保存时自动写入跟进记录
    if (body.leadId) {
      try {
        const now = new Date();
        const nowStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
        const followUpData = JSON.stringify({
          leadId: body.leadId,
          content: `已更新报价单，总价${body.final || 0}元`,
          method: '系统记录',
          createdBy: body.modifier || body.sales || body.designer || '未知',
          createdAt: { $date: Date.now() },
          displayTime: nowStr
        }).replace(/\n/g, '\\n').replace(/\r/g, '\\r');
        await tcbAdd(`db.collection("followUps").add({ data: ${followUpData} })`);
      } catch (e) {
        console.error('Failed to create system followUp for quote update', e);
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
    const query = `db.collection("quotes").doc("${id}").remove()`;
    const res = await tcbDelete(query);
    return NextResponse.json(res);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
