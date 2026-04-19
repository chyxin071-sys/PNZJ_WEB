import { NextResponse } from 'next/server';
import { tcbQuery, tcbAdd, tcbUpdate, tcbCount } from '@/lib/wechat-tcb';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const page = parseInt(searchParams.get('page') || '0');
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '50')));
    const skip = page > 0 ? (page - 1) * pageSize : 0;
    const limit = page > 0 ? pageSize : 100;

    const whereClause = productId ? `.where({ productId: "${productId}" })` : '';
    const query = `db.collection("inventory")${whereClause}.orderBy("createdAt", "desc").skip(${skip}).limit(${limit}).get()`;
    const data = await tcbQuery(query);

    if (page > 0) {
      const total = await tcbCount(`db.collection("inventory")${whereClause}.count()`);
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
    const { productId, type, quantity } = body;

    if (!productId || !type || !quantity) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 1. 写入流水记录
    const docData = JSON.stringify({
      ...body,
      createdAt: { $date: Date.now() }
    });
    const res = await tcbAdd(`db.collection("inventory").add({ data: ${docData} })`);

    // 2. 原子更新 materials 的 stock 字段
    const delta = type === 'inbound' ? quantity : -quantity;
    await tcbUpdate(
      `db.collection("materials").doc("${productId}").update({ data: { stock: db.command.inc(${delta}), updatedAt: { $date: ${Date.now()} } } })`
    );

    return NextResponse.json(res);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
