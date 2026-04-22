import { NextResponse } from 'next/server';
import { tcbQuery, tcbAdd, tcbCount } from '@/lib/wechat-tcb';
import { sendNotifications } from '@/lib/notify';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('leadId');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '100')));
    const skip = (page - 1) * pageSize;

    const baseWhere = leadId ? `.where({ leadId: "${leadId}" })` : '';
    const [data, total] = await Promise.all([
      tcbQuery(`db.collection("quotes")${baseWhere}.orderBy("createdAt", "desc").skip(${skip}).limit(${pageSize}).get()`),
      tcbCount(`db.collection("quotes")${baseWhere}.count()`)
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
      createdAt: { $date: Date.now() },
      updatedAt: { $date: Date.now() }
    });

    const query = `db.collection("quotes").add({ data: ${docData} })`;
    const res = await tcbAdd(query);
    const newQuoteId = res.id_list?.[0];

    // 通知相关人员
    const targets = Array.from(new Set(['admin', body.sales, body.designer, body.manager])).filter(Boolean);
    sendNotifications(
      targets,
      '新报价单已创建',
      `${body.sales || body.designer || '团队成员'} 为客户【${body.customer || ''}】创建了报价单，成交价 ¥${(body.final || 0).toLocaleString()}`,
      body.leadId ? `/leads/${body.leadId}` : '/quotes'
    );

    // BUG-23: 报价单保存时自动写入跟进记录
    if (body.leadId && newQuoteId) {
      try {
        const now = new Date();
        const nowStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
        const followUpData = JSON.stringify({
          leadId: body.leadId,
          content: `已生成报价单，总价${body.final || 0}元`,
          method: '系统记录',
          createdBy: body.modifier || body.sales || body.designer || '系统',
          createdAt: { $date: Date.now() },
          displayTime: nowStr
        }).replace(/\n/g, '\\n').replace(/\r/g, '\\r');
        await tcbAdd(`db.collection("followUps").add({ data: ${followUpData} })`);
      } catch (e) {
        console.error('Failed to create system followUp for new quote', e);
      }
    }

    return NextResponse.json({ ...res, _id: newQuoteId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
