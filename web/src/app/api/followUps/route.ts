import { NextResponse } from 'next/server';
import { tcbQuery, tcbAdd, tcbUpdate, tcbCount } from '@/lib/wechat-tcb';
import { sendNotifications } from '@/lib/notify';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('leadId');
    const page = parseInt(searchParams.get('page') || '0');
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '100')));
    const skip = page > 0 ? (page - 1) * pageSize : 0;
    const limit = page > 0 ? pageSize : 100;

    const whereClause = leadId ? `.where({ leadId: "${leadId}" })` : '';
    const query = `db.collection("followUps")${whereClause}.orderBy("createdAt", "desc").skip(${skip}).limit(${limit}).get()`;
    const data = await tcbQuery(query);

    if (page > 0) {
      const total = await tcbCount(`db.collection("followUps")${whereClause}.count()`);
      return NextResponse.json({ data, total, page, pageSize });
    }
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { leadId, content, method, createdBy } = body;

    if (!leadId || !content) {
      return NextResponse.json({ error: 'leadId and content are required' }, { status: 400 });
    }

    const now = new Date();
    const nowStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    const docData = JSON.stringify({
      leadId,
      content,
      method: method || '手动记录',
      createdBy: createdBy || '未知',
      createdAt: { $date: Date.now() },
      displayTime: nowStr
    }).replace(/\n/g, '\\n').replace(/\r/g, '\\r');

    const addQuery = `db.collection("followUps").add({ data: ${docData} })`;
    const res = await tcbAdd(addQuery);

    // 同步更新 lead 的 lastFollowUp 字段
    try {
      const updateQuery = `db.collection("leads").doc("${leadId}").update({ data: { lastFollowUp: "${nowStr}", updatedAt: { $date: ${Date.now()} } } })`;
      await tcbUpdate(updateQuery);
    } catch (e) {}

    // 所有跟进记录（包括手动和系统自动生成）都触发通知
    const leadData = await tcbQuery(`db.collection("leads").doc("${leadId}").get()`);
    const lead = leadData?.[0];
    if (lead) {
      const targets = [lead.sales, lead.designer, lead.manager, lead.creatorName].filter(n => n && n !== createdBy);
      if (createdBy !== 'admin') targets.push('admin');
      
      const notifyTitle = method === '系统记录' ? '客户有新系统记录' : '客户有新跟进';
      const notifyContent = method === '系统记录' 
        ? `系统对客户【${lead.name}】生成了新记录：${content.substring(0, 20)}...`
        : `${createdBy} 对客户【${lead.name}】添加了跟进记录。`;
        
      sendNotifications(targets, notifyTitle, notifyContent, `/leads/${leadId}`);
    }

    return NextResponse.json({ ...res, createdAt: nowStr });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}