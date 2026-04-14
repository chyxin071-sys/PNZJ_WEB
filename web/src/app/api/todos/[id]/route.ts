import { NextResponse } from 'next/server';
import { tcbUpdate, tcbDelete } from '@/lib/wechat-tcb';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await request.json();
    
    // Convert object to string to build the query
    const docData = JSON.stringify(body);
    
    const query = `db.collection("todos").doc("${id}").update({ data: ${docData} })`;
    const res = await tcbUpdate(query);
    return NextResponse.json(res);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const query = `db.collection("todos").doc("${id}").remove()`;
    const res = await tcbDelete(query);
    return NextResponse.json(res);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
