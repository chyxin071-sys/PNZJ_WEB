import { NextResponse } from 'next/server';
import { tcbQuery, tcbAdd } from '@/lib/wechat-tcb';

export async function GET(request: Request) {
  try {
    // 获取最新 200 条材料库数据
    const query = `db.collection("materials").orderBy("createdAt", "desc").limit(200).get()`;
    const data = await tcbQuery(query);
    return NextResponse.json(data);
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
    
    const query = `db.collection("materials").add({ data: ${docData} })`;
    const res = await tcbAdd(query);
    return NextResponse.json(res);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
