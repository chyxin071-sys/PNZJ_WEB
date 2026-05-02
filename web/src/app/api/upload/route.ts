import { NextResponse } from 'next/server';

const APPID = process.env.WECHAT_APPID!;
const APPSECRET = process.env.WECHAT_APPSECRET!;
const ENV = process.env.NEXT_PUBLIC_TCB_ENV_ID!;

export async function POST(request: Request) {
  try {
    const role = request.headers.get('x-user-role');
    if (role === 'sales') {
      return NextResponse.json({ error: '权限不足：销售角色禁止上传文件' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const path = formData.get('path') as string;

    if (!file || !path) {
      return NextResponse.json({ error: 'Missing file or path' }, { status: 400 });
    }

    // 1. 获取 access_token
    const tokenRes = await fetch(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${APPSECRET}`);
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    
    if (!accessToken) {
      return NextResponse.json({ error: 'Failed to get access token' }, { status: 500 });
    }

    // 2. 获取上传参数
    const uploadInfoRes = await fetch(`https://api.weixin.qq.com/tcb/uploadfile?access_token=${accessToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        env: ENV,
        path: path
      })
    });
    
    const uploadInfo = await uploadInfoRes.json();
    if (uploadInfo.errcode !== 0) {
      return NextResponse.json({ error: 'Failed to get upload info', details: uploadInfo }, { status: 500 });
    }

    // 3. 构造 formData 上传文件到腾讯云 COS
    const cosFormData = new FormData();
    cosFormData.append('key', path);
    cosFormData.append('Signature', uploadInfo.authorization);
    cosFormData.append('x-cos-security-token', uploadInfo.token);
    cosFormData.append('x-cos-meta-fileid', uploadInfo.cos_file_id);
    cosFormData.append('file', file);

    const uploadRes = await fetch(uploadInfo.url, {
      method: 'POST',
      body: cosFormData
    });

    if (!uploadRes.ok) {
      return NextResponse.json({ error: 'Failed to upload file to COS', status: uploadRes.status }, { status: 500 });
    }

    // 4. 返回云文件 ID
    return NextResponse.json({ 
      fileID: uploadInfo.file_id,
      url: uploadInfo.url // 注：此 URL 不是直接访问的 CDN URL，实际渲染时通常需要转换
    });

  } catch (error: any) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: 'Server error', details: error.message }, { status: 500 });
  }
}