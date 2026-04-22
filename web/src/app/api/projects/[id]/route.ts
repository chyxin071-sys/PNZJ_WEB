import { NextResponse } from 'next/server';
import { tcbQuery, tcbUpdate, tcbDelete, tcbAdd } from '@/lib/wechat-tcb';
import { sendNotifications } from '@/lib/notify';

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

    // 查旧数据用于对比
    const oldData = await tcbQuery(`db.collection("projects").doc("${id}").get()`);
    const old = oldData?.[0] || {};

    const docData = JSON.stringify({
      ...body,
      updatedAt: { $date: Date.now() }
    }).replace(/\n/g, '\\n').replace(/\r/g, '\\r');

    const query = `db.collection("projects").doc("${id}").update({ data: ${docData} })`;
    const res = await tcbUpdate(query);

    // 触发通知
    const customerName = old.customer || '客户';
    const link = `/projects/${id}`;
    const targets = ['admin', old.manager, old.sales, old.designer];

    // 节点完成通知
    if (body.nodesData && old.nodesData) {
      const oldNodes: any[] = old.nodesData;
      const newNodes: any[] = body.nodesData;
      newNodes.forEach(async (node: any, i: number) => {
        if (node.status === 'completed' && oldNodes[i]?.status !== 'completed') {
          sendNotifications(targets, '施工节点完成', `【${customerName}】工地的【${node.name}】节点已验收完成`, link);
          
          // BUG-25: 节点完成时自动写入跟进记录
          if (old.leadId) {
            try {
              const now = new Date();
              const nowStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
              const followUpData = JSON.stringify({
                leadId: old.leadId,
                content: `施工节点完成\n节点名称：${node.name}\n实际开始：${node.actualStartDate || '未知'}\n实际完工：${node.actualEndDate || '未知'}\n耗时天数：${node.actualDuration || 0} 天`,
                method: '系统记录',
                createdBy: body.manager || old.manager || '系统',
                createdAt: { $date: Date.now() },
                displayTime: nowStr
              }).replace(/\n/g, '\\n').replace(/\r/g, '\\r');
              await tcbAdd(`db.collection("followUps").add({ data: ${followUpData} })`);
            } catch (e) {
              console.error('Failed to create system followUp for node completion', e);
            }
          }
        }
        
        // BUG-26: 排期变更时自动写入跟进记录 (只要日期变了)
        if (node.startDate !== oldNodes[i]?.startDate || node.endDate !== oldNodes[i]?.endDate) {
          if (old.leadId && node.startDate && node.endDate) {
            try {
              const now = new Date();
              const nowStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
              const followUpData = JSON.stringify({
                leadId: old.leadId,
                content: `更新了排期\n节点名称：${node.name}\n原排期：${oldNodes[i]?.startDate || '未定'} ~ ${oldNodes[i]?.endDate || '未定'}\n新排期：${node.startDate} ~ ${node.endDate}`,
                method: '系统记录',
                createdBy: body.manager || old.manager || '系统',
                createdAt: { $date: Date.now() },
                displayTime: nowStr
              }).replace(/\n/g, '\\n').replace(/\r/g, '\\r');
              await tcbAdd(`db.collection("followUps").add({ data: ${followUpData} })`);
            } catch (e) {
              console.error('Failed to create system followUp for schedule update', e);
            }
          }
        }
      });
    }

    // 延期通知
    if (body.health && body.health !== old.health && (body.health === '预警' || body.health === '严重延期')) {
      sendNotifications(['admin', old.manager], '工地进度预警', `【${customerName}】工地健康度变为：${body.health}，请及时跟进`, link);
    }

    // 项目经理变更通知
    if (body.manager && old.manager && body.manager !== old.manager) {
      sendNotifications(
        ['admin', old.manager, body.manager, old.sales, old.designer],
        '项目经理变更',
        `【${customerName}】工地的项目经理已从【${old.manager}】变更为【${body.manager}】`,
        link
      );
    }

    // 竣工通知
    if (body.status === '已竣工' && old.status !== '已竣工') {
      sendNotifications(targets, '🎉 工地竣工', `【${customerName}】工地已竣工！`, link);
    }

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
