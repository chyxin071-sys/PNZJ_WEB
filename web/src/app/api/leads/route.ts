import { NextResponse } from 'next/server';
import { tcbQuery, tcbAdd } from '@/lib/wechat-tcb';

export async function GET(request: Request) {
  try {
    // 默认按照创建时间倒序获取最新的 100 条线索
    const query = `db.collection("leads").orderBy("createdAt", "desc").limit(100).get()`;
    const data = await tcbQuery(query);
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
    // 查询当年已有多少线索，简单通过统计今年以来的数据（这里用模糊的正则或者拉取当年所有的计算，为了简单可靠，直接查出当年的最新的一个或查总数）
    const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`).getTime();
    const countQuery = `db.collection("leads").where({ createdAt: _.gte(db.serverDate({ offset: ${startOfYear - Date.now()} })) }).count()`;
    
    let sequence = 1;
    try {
       // TCB HTTP API 的 count() 可能需要特殊处理，稳妥起见，拉取当年最后一条数据的编号
       const lastLeadQuery = `db.collection("leads").where({ customerNo: db.RegExp({ regexp: '^P${year}', options: 'i' }) }).orderBy("createdAt", "desc").limit(1).get()`;
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
