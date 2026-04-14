import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'pnzj-super-secret-key-123';
const APPID = 'wxc9f24e9a9f57bc7a';
const APPSECRET = '41bc50ad8d277918037ea0107d0a07b0';
const ENV = 'cloud1-8grodf5s3006f004';

export async function POST(request: Request) {
  try {
    const { phone, password } = await request.json();

    if (!phone || !password) {
      return NextResponse.json({ error: '手机号或密码不能为空' }, { status: 400 });
    }

    // 1. 获取微信接口调用凭证 (access_token)
    const tokenRes = await fetch(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${APPSECRET}`);
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.json({ error: '无法连接云数据库' }, { status: 500 });
    }

    // 2. 查询云数据库中的用户
    const query = `db.collection('users').where({phone: '${phone}'}).get()`;
    const dbRes = await fetch(`https://api.weixin.qq.com/tcb/databasequery?access_token=${accessToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ env: ENV, query })
    });
    
    const dbData = await dbRes.json();
    if (dbData.errcode !== 0 || !dbData.data || dbData.data.length === 0) {
      return NextResponse.json({ error: '账号不存在或密码错误' }, { status: 401 });
    }

    // 微信云开发返回的 data 数组里是字符串化的 JSON 对象
    const user = JSON.parse(dbData.data[0]);

    // 3. 校验密码 (这里暂时使用 passwordPlain 比较，因为这是真实使用的过渡方案)
    // 之前脚本中已经将明文密码存入了 passwordPlain，也可以比较 bcrypt 哈希，但为了简化同步
    if (user.passwordPlain !== password && user.passwordHash !== password) {
      // 这里也提供对原始 bcrypt 校验的退路，由于 Web 端直接比较需要 bcrypt，我们可以简单判断
      const bcrypt = require('bcryptjs');
      const isMatch = user.passwordHash ? await bcrypt.compare(password, user.passwordHash) : false;
      if (!isMatch) {
        return NextResponse.json({ error: '账号不存在或密码错误' }, { status: 401 });
      }
    }

    if (user.status !== 'active') {
      return NextResponse.json({ error: '该账号已被停用' }, { status: 403 });
    }

    // 4. 生成 Token
    const token = jwt.sign(
      { 
        id: user._id, 
        phone: user.phone, 
        role: user.role, 
        name: user.name
      },
      JWT_SECRET,
      { expiresIn: '7d' } // 7天过期
    );

    const safeUser = {
      _id: user._id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      status: user.status
    };

    return NextResponse.json({ 
      message: '登录成功', 
      token, 
      user: safeUser 
    }, { status: 200 });

  } catch (error: any) {
    console.error('Login Error:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}