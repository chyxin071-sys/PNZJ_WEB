import { NextResponse } from 'next/server';
import { tcbQuery, tcbUpdate } from '@/lib/wechat-tcb';

// GET /api/leads/[id]/files — 获取该客户的文件列表
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const query = `db.collection("leads").doc("${id}").get()`;
    const data = await tcbQuery(query);
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }
    const files = data[0].files || [];
    return NextResponse.json(files);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/leads/[id]/files — 更新整个文件列表（上传后调用）
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const { files } = await request.json();

    const docData = JSON.stringify({ files, updatedAt: { $date: Date.now() } });
    const query = `db.collection("leads").doc("${id}").update({ data: ${docData} })`;
    const res = await tcbUpdate(query);
    return NextResponse.json(res);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
