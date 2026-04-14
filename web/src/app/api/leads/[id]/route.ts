import { NextResponse } from 'next/server';
import { tcbQuery, tcbUpdate, tcbDelete } from '@/lib/wechat-tcb';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const query = `db.collection("leads").doc("${id}").get()`;
    const data = await tcbQuery(query);
    
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }
    
    return NextResponse.json(data[0]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await request.json();
    
    // 附加更新时间
    const docData = JSON.stringify({
      ...body,
      updatedAt: { $date: Date.now() }
    });
    
    const query = `db.collection("leads").doc("${id}").update({ data: ${docData} })`;
    const res = await tcbUpdate(query);
    return NextResponse.json(res);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const query = `db.collection("leads").doc("${id}").remove()`;
    const res = await tcbDelete(query);
    return NextResponse.json(res);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
