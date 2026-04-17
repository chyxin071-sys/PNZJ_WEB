import { NextResponse } from 'next/server';
import { tcbQuery, tcbAdd, tcbCount } from '@/lib/wechat-tcb';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '0');
    const pageSize = Math.min(500, Math.max(1, parseInt(searchParams.get('pageSize') || '500')));
    const skip = page > 0 ? (page - 1) * pageSize : 0;
    const limit = page > 0 ? pageSize : 500;

    const [data, total] = await Promise.all([
      tcbQuery(`db.collection("leads").orderBy("createdAt", "desc").skip(${skip}).limit(${limit}).get()`),
      page > 0 ? tcbCount(`db.collection("leads").count()`) : Promise.resolve(0)
    ]);

    if (page > 0) return NextResponse.json({ data, total, page, pageSize });
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 生成客户编号：P + YYYY + 序号
    const year = new Date().getFullYear();
    let sequence = 1;
    
    try {
       // TCB HTTP API 的语法：查出当年最新的一个编号
       const lastLeadQuery = `db.collection("leads").where({ customerNo: db.RegExp({ regexp: '^P${year}', options: 'i' }) }).orderBy("customerNo", "desc").limit(1).get()`;
       const lastLeadData = await tcbQuery(lastLeadQuery);
       if (lastLeadData && lastLeadData.length > 0 && lastLeadData[0].customerNo) {
         const lastNo = lastLeadData[0].customerNo;
         const match = lastNo.match(/P\d{4}(\d{3,})/);
         if (match && match[1]) {
           sequence = parseInt(match[1], 10) + 1;
         }
       }
    } catch(e) {
       console.error("生成客户编号失败，回退到默认", e);
    }
    
    const customerNo = `P${year}${sequence.toString().padStart(3, '0')}`;

    // 为新增数据附加创建时间和更新时间
    const docData = JSON.stringify({
      ...body,
      customerNo,
      createdAt: { $date: Date.now() },
      updatedAt: { $date: Date.now() }
    });
    
    const query = `db.collection("leads").add({ data: ${docData} })`;
    const res = await tcbAdd(query);
    return NextResponse.json(res);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
