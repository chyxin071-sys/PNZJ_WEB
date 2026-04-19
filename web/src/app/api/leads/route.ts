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

    // 生成客户编号：统一对齐小程序端，使用 P + YYYY + 3位递增流水号
    const year = new Date().getFullYear().toString();
    
    // 我们不能直接用简单的降序排列，因为 P2026226187 会被排在 P2026002 前面。
    // 为了修复之前错误数据导致的问题，我们在获取时做一些清洗。
    const allLeadsThisYear = await tcbQuery(`db.collection("leads").where({ customerNo: db.RegExp({ regexp: '^P${year}', options: 'i' }) }).get()`);
    
    let sequence = 1;
    if (allLeadsThisYear && allLeadsThisYear.length > 0) {
      // 过滤出真正符合 3 位或以上规则（排除掉那几条因为时间戳产生的 6 位错误数据），或者找出所有提取的数字里的最大值
      const validSequences = allLeadsThisYear
        .map((l: any) => {
          if (!l.customerNo) return 0;
          const match = l.customerNo.match(/P\d{4}(\d{3,})/i);
          // 如果长度大于等于6，说明是之前的时间戳遗留数据，直接忽略它们
          if (match && match[1] && match[1].length < 6) {
            return parseInt(match[1], 10);
          }
          return 0;
        })
        .filter((seq: number) => seq > 0);
        
      if (validSequences.length > 0) {
        sequence = Math.max(...validSequences) + 1;
      }
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
