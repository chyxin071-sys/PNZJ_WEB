import { NextResponse } from 'next/server';
import { tcbQuery, tcbAdd } from '@/lib/wechat-tcb';

export async function GET(request: Request) {
  try {
    const query = `db.collection("quotes").orderBy("createdAt", "desc").limit(100).get()`;
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
    
    const query = `db.collection("quotes").add({ data: ${docData} })`;
    const res = await tcbAdd(query);
    return NextResponse.json(res);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
