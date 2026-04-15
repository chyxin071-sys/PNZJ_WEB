import { NextResponse } from 'next/server';
import { tcbQuery, tcbAdd } from '@/lib/wechat-tcb';

// 获取全部员工列表
export async function GET(request: Request) {
  try {
    const query = `db.collection("users").orderBy("created_at", "desc").limit(100).get()`;
    const data = await tcbQuery(query);
    
    // 不返回密码字段
    const users = data.map((user: any) => {
      const { passwordHash, passwordPlain, ...safeUser } = user;
      return safeUser;
    });

    return NextResponse.json(users, { status: 200 });
  } catch (error: any) {
    console.error('Fetch Employees Error:', error);
    return NextResponse.json({ error: error.message || '获取员工列表失败' }, { status: 500 });
  }
}

// 添加新员工
export async function POST(request: Request) {
  try {
    const { name, phone, role, password, department, joinDate } = await request.json();

    if (!name || !phone || !role || !password) {
      return NextResponse.json({ error: '请填写完整的员工信息' }, { status: 400 });
    }

    // 检查手机号是否重复
    const existQuery = `db.collection("users").where({ phone: '${phone}' }).get()`;
    const existData = await tcbQuery(existQuery);
    
    if (existData && existData.length > 0) {
      return NextResponse.json({ error: '该手机号已注册，请使用其他手机号' }, { status: 400 });
    }

    // 生成新账号：找出当前最大账号
    let newAccount = 'PN001';
    try {
      const lastUserQuery = `db.collection("users").where({ account: db.RegExp({ regexp: '^PN\\\\d{3}$', options: 'i' }) }).orderBy("created_at", "desc").limit(1).get()`;
      const lastUserData = await tcbQuery(lastUserQuery);
      if (lastUserData && lastUserData.length > 0 && lastUserData[0].account) {
        const lastNo = lastUserData[0].account;
        const match = lastNo.match(/PN(\d{3})/);
        if (match && match[1]) {
          const sequence = parseInt(match[1], 10) + 1;
          newAccount = `PN${sequence.toString().padStart(3, '0')}`;
        }
      }
    } catch(e) {
      console.error("生成账号失败，回退到默认", e);
    }

    // 使用 passwordPlain 保存（为了简单同步）
    const newUser = JSON.stringify({
      name,
      account: newAccount,
      phone,
      role,
      passwordPlain: password,
      department: department || '未知部门',
      joinDate: joinDate || new Date().toISOString().split('T')[0],
      status: '在职',
      isActive: true,
      is_active: true,
      created_at: { $date: Date.now() },
      updated_at: { $date: Date.now() }
    });

    const addQuery = `db.collection("users").add({ data: ${newUser} })`;
    const result = await tcbAdd(addQuery);

    return NextResponse.json({ 
      success: true, 
      id: result.id_list[0], 
      message: '添加员工成功' 
    }, { status: 201 });
  } catch (error: any) {
    console.error('Create Employee Error:', error);
    return NextResponse.json({ error: error.message || '添加员工失败' }, { status: 500 });
  }
}