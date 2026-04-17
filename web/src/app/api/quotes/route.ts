import { NextResponse } from 'next/server';
import { tcbQuery, tcbAdd, tcbCount } from '@/lib/wechat-tcb';
import { sendNotification } from '@/lib/notify';

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

    // 通知 admin
    sendNotification(
      'admin',
      '新报价单已创建',
      `${body.sales || '销售'} 为客户【${body.customer || ''}】创建了报价单，成交价 ¥${(body.final || 0).toLocaleString()}`,
      body.leadId ? `/leads/${body.leadId}` : '/quotes'
    );

    return NextResponse.json(res);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
