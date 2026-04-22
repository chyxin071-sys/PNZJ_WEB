import { NextResponse } from 'next/server';
import cloudbase from '@cloudbase/node-sdk';

// 懒加载初始化数据库连接
let db: any = null;
function getDb() {
  if (!db) {
    const app = cloudbase.init({
      env: process.env.NEXT_PUBLIC_TCB_ENV_ID,
      secretId: process.env.TCB_SECRET_ID,
      secretKey: process.env.TCB_SECRET_KEY
    });
    db = app.database();
  }
  return db;
}

// 启用/停用员工，或修改基本信息
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const body = await request.json();

    if (!id) {
      return NextResponse.json({ error: '缺失员工 ID' }, { status: 400 });
    }

    const db = getDb();

    // 先查出旧名字，如果修改了名字，需要去同步更新别的表
    const oldUserRes = await db.collection('users').doc(id).get();
    const oldUser = oldUserRes.data && oldUserRes.data.length > 0 ? oldUserRes.data[0] : null;
    const oldName = oldUser ? oldUser.name : '';
    
    // 只允许更新特定的安全字段
    const updateData: any = {};
    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    if (body.role) updateData.role = body.role;
    if (body.name) updateData.name = body.name;
    if (body.phone) updateData.phone = body.phone;
    if (body.department) updateData.department = body.department;
    if (body.joinDate) updateData.joinDate = body.joinDate;
    if (body.password) updateData.password = body.password; // Admin reset password

    await db.collection('users').doc(id).update(updateData);

    // 如果修改了名字，并且旧名字存在，去全库联动更新相关名字
    const newName = updateData.name;
    if (oldName && newName && oldName !== newName) {
      const _ = db.command;
      
      // 更新 leads 表里的 sales, designer, manager
      await db.collection('leads').where(_.or([
        { 'sales._id': id },
        { 'designer._id': id },
        { 'manager._id': id }
      ])).update({
        'sales.name': _.eq('sales._id', id).then(newName),
        'designer.name': _.eq('designer._id', id).then(newName),
        'manager.name': _.eq('manager._id', id).then(newName)
      }).catch(console.error);

      // 为了兼容旧数据只存了名字字符串的情况，直接把字符串等于旧名字的替换掉
      await db.collection('leads').where({ sales: oldName }).update({ sales: newName }).catch(() => {});
      await db.collection('leads').where({ designer: oldName }).update({ designer: newName }).catch(() => {});
      await db.collection('leads').where({ manager: oldName }).update({ manager: newName }).catch(() => {});

      // 更新 projects 表
      await db.collection('projects').where({ 'manager._id': id }).update({ 'manager.name': newName }).catch(() => {});
      await db.collection('projects').where({ manager: oldName }).update({ manager: newName }).catch(() => {});
      await db.collection('projects').where({ sales: oldName }).update({ sales: newName }).catch(() => {});
      await db.collection('projects').where({ designer: oldName }).update({ designer: newName }).catch(() => {});

      // 补充一条全系统的跟进记录
      try {
        const leadRes = await db.collection('leads').where(_.or([
          { sales: newName },
          { designer: newName },
          { manager: newName }
        ])).get();
        if (leadRes.data && leadRes.data.length > 0) {
          const followUps = leadRes.data.map((lead: any) => ({
            leadId: lead._id,
            content: `负责人员更名：【${oldName}】已更名为【${newName}】`,
            method: '系统记录',
            createdBy: '系统',
            createdAt: db.serverDate(),
            displayTime: new Date().toISOString().replace('T', ' ').substring(0, 16)
          }));
          // CloudBase 批量添加
          for (const f of followUps) {
            await db.collection('followUps').add(f);
          }
        }
      } catch(e) { console.error('添加更名跟进记录失败', e); }
    }

    return NextResponse.json({ message: '员工信息已更新' }, { status: 200 });

  } catch (error: any) {
    console.error('Update Employee Error:', error);
    return NextResponse.json({ error: error.message || '更新员工信息失败' }, { status: 500 });
  }
}

// 彻底删除员工（危险操作）
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;

    if (!id) {
      return NextResponse.json({ error: '缺失员工 ID' }, { status: 400 });
    }

    const db = getDb();
    await db.collection('users').doc(id).remove();

    return NextResponse.json({ message: '员工已成功删除' }, { status: 200 });

  } catch (error: any) {
    console.error('Delete Employee Error:', error);
    return NextResponse.json({ error: error.message || '删除员工失败' }, { status: 500 });
  }
}