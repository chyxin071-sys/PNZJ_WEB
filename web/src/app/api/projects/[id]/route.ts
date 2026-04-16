import { NextResponse } from 'next/server';
import { tcbQuery, tcbUpdate, tcbDelete } from '@/lib/wechat-tcb';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const query = `db.collection("projects").doc("${id}").get()`;
    const data = await tcbQuery(query);
    
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    return NextResponse.json(data[0]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const role = request.headers.get('x-user-role');
    if (role === 'designer' || role === 'sales') {
      return NextResponse.json({ error: '权限不足：只读组（设计/销售）禁止修改项目信息' }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();
    
    const docData = JSON.stringify({
      ...body,
      updatedAt: { $date: Date.now() }
    });
    
    const query = `db.collection("projects").doc("${id}").update({ data: ${docData} })`;
    const res = await tcbUpdate(query);
    return NextResponse.json(res);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const query = `db.collection("projects").doc("${id}").remove()`;
    const res = await tcbDelete(query);
    return NextResponse.json(res);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
