import { NextResponse } from 'next/server';
import axios from 'axios';

const APPID = process.env.WECHAT_APPID || '';
const APPSECRET = process.env.WECHAT_APPSECRET || '';
const ENV = process.env.NEXT_PUBLIC_TCB_ENV_ID || '';

const getBaseUrl = () => {
  // 如果在微信云托管容器内（有 CVM / K8S 环境变量），才使用内网 HTTP 代理
  // 否则（如本地打包预览 npm start）统一使用 HTTPS 避免 301 重定向导致 POST 变 GET
  if (process.env.CBR_ENV_ID || process.env.KUBERNETES_SERVICE_HOST) {
    return 'http://api.weixin.qq.com';
  }
  return 'https://api.weixin.qq.com';
};

let cachedToken = '';
let tokenExpiresAt = 0;

export async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }
  // 使用 axios 而不是 native fetch，因为微信云托管的内网代理(HTTP_PROXY)在 Node18+ 下不支持原生 fetch
  const res = await axios.get(`${getBaseUrl()}/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${APPSECRET}`);
  const data = res.data;
  if (data.access_token) {
    cachedToken = data.access_token;
    // Token is valid for 7200 seconds, refresh a bit earlier
    tokenExpiresAt = Date.now() + (data.expires_in - 600) * 1000;
    return cachedToken;
  }
  throw new Error(`Failed to get access token: ${JSON.stringify(data)}`);
}

export async function tcbQuery(queryStr: string) {
  const url = `${getBaseUrl()}/tcb/databasequery?access_token=${await getAccessToken()}`;

  const res = await axios.post(url, { env: ENV, query: queryStr });
  const data = res.data;
  if (data.errcode !== 0) throw new Error(data.errmsg || 'Query failed');
  return (data.data || []).map((item: string) => JSON.parse(item));
}

export async function tcbAdd(queryStr: string) {
  const url = `${getBaseUrl()}/tcb/databaseadd?access_token=${await getAccessToken()}`;

  const res = await axios.post(url, { env: ENV, query: queryStr });
  const data = res.data;
  if (data.errcode !== 0) throw new Error(data.errmsg || 'Add failed');
  return data;
}

export async function tcbUpdate(queryStr: string) {
  const url = `${getBaseUrl()}/tcb/databaseupdate?access_token=${await getAccessToken()}`;

  const res = await axios.post(url, { env: ENV, query: queryStr });
  const data = res.data;
  if (data.errcode !== 0) throw new Error(data.errmsg || 'Update failed');
  return data;
}

export async function tcbDelete(queryStr: string) {
  const url = `${getBaseUrl()}/tcb/databasedelete?access_token=${await getAccessToken()}`;

  const res = await axios.post(url, { env: ENV, query: queryStr });
  const data = res.data;
  if (data.errcode !== 0) throw new Error(data.errmsg || 'Delete failed');
  return data;
}

export async function tcbCount(queryStr: string): Promise<number> {
  const url = `${getBaseUrl()}/tcb/databasecount?access_token=${await getAccessToken()}`;

  const res = await axios.post(url, { env: ENV, query: queryStr });
  const data = res.data;
  if (data.errcode !== 0) return 0;
  return data.count || 0;
}
