import { NextResponse } from 'next/server';
import { tcbQuery, tcbAdd } from '@/lib/wechat-tcb';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userName = searchParams.get('userName');
    const role = searchParams.get('role');
    const onlyUnread = searchParams.get('unread') === '1';

    let query: string;

    if (!userName) {
      // 未传用户名，返回全部（管理后台用）
      query = `db.collection("notifications").orderBy("createTime", "desc").limit(100).get()`;
    } else if (role === 'admin') {
      // admin 看自己的 + all + admin 标签的
      query = `db.collection("notifications").where({ targetUser: db.command.in(["${userName}", "all", "admin"]) }).orderBy("createTime", "desc").limit(100).get()`;
    } else {
      // 普通用户看自己的 + all
      query = `db.collection("notifications").where({ targetUser: db.command.in(["${userName}", "all"]) }).orderBy("createTime", "desc").limit(100).get()`;
    }

    let data = await tcbQuery(query);

    if (onlyUnread) {
      data = data.filter((n: any) => !n.isRead);
    }

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
      isRead: false,
      isStarred: false,
      createTime: { $date: Date.now() }
    });

    const query = `db.collection("notifications").add({ data: ${docData} })`;
    const res = await tcbAdd(query);
    return NextResponse.json(res);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
