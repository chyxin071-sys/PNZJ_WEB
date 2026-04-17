import { NextResponse } from 'next/server';
import { tcbQuery, tcbUpdate, tcbAdd } from '@/lib/wechat-tcb';

// GET /api/settings?key=revenueTargets
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 });

    const query = `db.collection("settings").where({ key: "${key}" }).limit(1).get()`;
    const data = await tcbQuery(query);
    if (data && data.length > 0) {
      return NextResponse.json(data[0].value);
    }
    return NextResponse.json(null);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/settings  body: { key, value }
export async function POST(request: Request) {
  try {
    const { key, value } = await request.json();
    if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 });

    // 先查是否存在
    const checkQuery = `db.collection("settings").where({ key: "${key}" }).limit(1).get()`;
    const existing = await tcbQuery(checkQuery);

    if (existing && existing.length > 0) {
      const id = existing[0]._id;
      const updateQuery = `db.collection("settings").doc("${id}").update({ data: { value: ${JSON.stringify(value)}, updatedAt: { $date: ${Date.now()} } } })`;
      await tcbUpdate(updateQuery);
    } else {
      const docData = JSON.stringify({ key, value, createdAt: { $date: Date.now() } });
      await tcbAdd(`db.collection("settings").add({ data: ${docData} })`);
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
