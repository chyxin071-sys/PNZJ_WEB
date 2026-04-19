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

    // 生成客户编号：P + YYYY + 时间戳后6位，避免并发冲突
    const year = new Date().getFullYear();
    const customerNo = `P${year}${String(Date.now()).slice(-6)}`;

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
