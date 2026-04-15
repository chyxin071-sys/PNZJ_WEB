import { NextResponse } from 'next/server';

const APPID = 'wxc9f24e9a9f57bc7a';
const APPSECRET = '41bc50ad8d277918037ea0107d0a07b0';
const ENV = 'cloud1-8grodf5s3006f004';

let cachedToken = '';
let tokenExpiresAt = 0;

export async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }
  const res = await fetch(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${APPSECRET}`);
  const data = await res.json();
  if (data.access_token) {
    cachedToken = data.access_token;
    // Token is valid for 7200 seconds, refresh a bit earlier
    tokenExpiresAt = Date.now() + (data.expires_in - 600) * 1000;
    return cachedToken;
  }
  throw new Error('Failed to get access token');
}

export async function tcbQuery(queryStr: string) {
  const isCloudRun = !!process.env.CBR_ENV_ID || process.env.NODE_ENV === 'production';
  const url = isCloudRun 
    ? `http://api.weixin.qq.com/tcb/databasequery`
    : `https://api.weixin.qq.com/tcb/databasequery?access_token=${await getAccessToken()}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ env: ENV, query: queryStr })
  });
  const data = await res.json();
  if (data.errcode !== 0) throw new Error(data.errmsg || 'Query failed');
  return (data.data || []).map((item: string) => JSON.parse(item));
}

export async function tcbAdd(queryStr: string) {
  const isCloudRun = !!process.env.CBR_ENV_ID || process.env.NODE_ENV === 'production';
  const url = isCloudRun 
    ? `http://api.weixin.qq.com/tcb/databaseadd`
    : `https://api.weixin.qq.com/tcb/databaseadd?access_token=${await getAccessToken()}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ env: ENV, query: queryStr })
  });
  const data = await res.json();
  if (data.errcode !== 0) throw new Error(data.errmsg || 'Add failed');
  return data;
}

export async function tcbUpdate(queryStr: string) {
  const isCloudRun = !!process.env.CBR_ENV_ID || process.env.NODE_ENV === 'production';
  const url = isCloudRun 
    ? `http://api.weixin.qq.com/tcb/databaseupdate`
    : `https://api.weixin.qq.com/tcb/databaseupdate?access_token=${await getAccessToken()}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ env: ENV, query: queryStr })
  });
  const data = await res.json();
  if (data.errcode !== 0) throw new Error(data.errmsg || 'Update failed');
  return data;
}

export async function tcbDelete(queryStr: string) {
  const isCloudRun = !!process.env.CBR_ENV_ID || process.env.NODE_ENV === 'production';
  const url = isCloudRun 
    ? `http://api.weixin.qq.com/tcb/databasedelete`
    : `https://api.weixin.qq.com/tcb/databasedelete?access_token=${await getAccessToken()}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ env: ENV, query: queryStr })
  });
  const data = await res.json();
  if (data.errcode !== 0) throw new Error(data.errmsg || 'Delete failed');
  return data;
}
