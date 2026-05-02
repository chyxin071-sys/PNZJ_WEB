import { NextResponse } from 'next/server';
import { tcbQuery, tcbAdd, tcbCount } from '@/lib/wechat-tcb';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userName = searchParams.get('userName');
    const role = searchParams.get('role');
    const onlyUnread = searchParams.get('unread') === '1';
    const tab = searchParams.get('tab') || 'all'; // unread | starred | all
    const fetchAll = searchParams.get('all') === '1';
    const page = parseInt(searchParams.get('page') || '0');
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '100')));

    let baseWhere: string;
    if (!userName) {
      baseWhere = '';
    } else if (role === 'admin') {
      baseWhere = `.where({ targetUser: db.command.in(["${userName}", "all", "admin"]) })`;
    } else {
      baseWhere = `.where({ targetUser: db.command.in(["${userName}", "all"]) })`;
    }

    // all=1：先 count 再分批拉取，突破 100 条限制
    // "全部消息" tab 只取一个月内（对齐小程序端）
    if (fetchAll) {
      let countWhere = baseWhere;
      if (tab === 'unread') {
        countWhere = baseWhere
          ? baseWhere.replace('}) })', `}), isRead: db.command.neq(true) })`)
          : `.where({ isRead: db.command.neq(true) })`;
      } else if (tab === 'starred') {
        countWhere = baseWhere
          ? baseWhere.replace('}) })', `}), isStarred: true })`)
          : `.where({ isStarred: true })`;
      } else {
        // 全部消息：限制一个月内
        const oneMonthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        countWhere = baseWhere
          ? baseWhere.replace('}) })', `}), createTime: db.command.gte(new Date(${oneMonthAgo})) })`)
          : `.where({ createTime: db.command.gte(new Date(${oneMonthAgo})) })`;
      }
      const total = await tcbCount(`db.collection("notifications")${countWhere}.count()`);
      const batchSize = 100;
      const batches = Math.ceil(total / batchSize);
      const tasks = [];
      for (let i = 0; i < batches; i++) {
        tasks.push(
          tcbQuery(`db.collection("notifications")${countWhere}.orderBy("createTime", "desc").skip(${i * batchSize}).limit(${batchSize}).get()`)
        );
      }
      const results = await Promise.all(tasks);
      const data = results.flat();
      return NextResponse.json(data);
    }

    const skip = page > 0 ? (page - 1) * pageSize : 0;
    const limit = page > 0 ? pageSize : 100;
    const query = `db.collection("notifications")${baseWhere}.orderBy("createTime", "desc").skip(${skip}).limit(${limit}).get()`;
    let data = await tcbQuery(query);

    if (onlyUnread) {
      data = data.filter((n: any) => !n.isRead);
    }

    if (page > 0) {
      const total = await tcbCount(`db.collection("notifications")${baseWhere}.count()`);
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
