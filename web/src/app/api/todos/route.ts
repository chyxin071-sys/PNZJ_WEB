import { NextResponse } from 'next/server';
import { tcbQuery, tcbAdd } from '@/lib/wechat-tcb';

export async function GET() {
  try {
    const query = `db.collection("todos").orderBy("createdAt", "desc").limit(100).get()`;
    const data = await tcbQuery(query);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Convert object to string carefully to build the query
    // Use JSON.stringify for the whole object and inject into the query
    const docData = JSON.stringify({
      ...body,
      createdAt: { $date: Date.now() } // simulate serverDate
    });
    
    const query = `db.collection("todos").add({ data: ${docData} })`;
    const res = await tcbAdd(query);
    return NextResponse.json(res);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
