import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import axios from 'axios';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret_for_pnzj_12345';
const APPID = process.env.WECHAT_APPID || '';
const APPSECRET = process.env.WECHAT_APPSECRET || '';
const ENV = process.env.NEXT_PUBLIC_TCB_ENV_ID || '';

export async function POST(request: Request) {
  try {
    const { account, password } = await request.json();

    if (!account || !password) {
      return NextResponse.json({ error: '账号或密码不能为空' }, { status: 400 });
    }

    // 1. 获取 access_token (使用 axios 支持微信云托管的 http_proxy 环境变量)
    let url = ``;
    let bodyData: any = { env: ENV, query: `db.collection('users').where(db.command.or([{account: '${account}'}, {phone: '${account}'}])).get()` };

    // 获取 token
    // 强制使用 https 避免微信服务器 301 重定向导致的 GET 方法覆盖
    const getBaseUrl = () => {
      if (process.env.CBR_ENV_ID || process.env.KUBERNETES_SERVICE_HOST) {
        return 'http://api.weixin.qq.com';
      }
      return 'https://api.weixin.qq.com';
    };
    
    const baseUrl = getBaseUrl();
    
    const tokenRes = await axios.get(`${baseUrl}/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${APPSECRET}`);
    const tokenData = tokenRes.data;
    const accessToken = tokenData.access_token;
    
    if (!accessToken) {
      return NextResponse.json({ error: `Token获取失败: ${JSON.stringify(tokenData)}` }, { status: 500 });
    }
    url = `${baseUrl}/tcb/databasequery?access_token=${accessToken}`;

    // 发起查询
    const dbRes = await axios.post(url, bodyData);
    const dbData = dbRes.data;
    
    // 如果 dbData.data 不存在或者为空，说明查询失败或找不到数据
    if (!dbData || dbData.errcode !== 0) {
      return NextResponse.json({ error: `数据库查询失败: ${JSON.stringify(dbData)}` }, { status: 500 });
    }
    
    if (!dbData.data || dbData.data.length === 0) {
      return NextResponse.json({ error: '账号不存在或密码错误' }, { status: 401 });
    }

    // 微信云开发返回的 data 数组里是字符串化的 JSON 对象
    let user;
    try {
      user = JSON.parse(dbData.data[0]);
    } catch (e) {
      return NextResponse.json({ error: '解析用户数据失败' }, { status: 500 });
    }

    // 3. 校验密码 (这里使用 passwordPlain 或 bcrypt 进行容错处理)
    let isMatch = false;

    // 先尝试明文比对
    if (user.passwordPlain === password || user.passwordHash === password) {
      isMatch = true;
    } else if (user.passwordHash) {
      // 否则尝试 bcrypt 比对
      try {
        isMatch = await bcrypt.compare(password, user.passwordHash);
      } catch (err) {
        console.error("Bcrypt compare error:", err);
      }
    }

    if (!isMatch) {
      return NextResponse.json({ error: '账号不存在或密码错误' }, { status: 401 });
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
    return NextResponse.json({ error: '服务器内部错误', details: error.message }, { status: 500 });
  }
}