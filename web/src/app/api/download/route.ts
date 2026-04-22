import { NextResponse } from 'next/server';
import { tcbBatchDownloadFile } from '@/lib/wechat-tcb';

export async function POST(request: Request) {
  try {
    const { fileIds } = await request.json();
    
    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json({ error: 'Missing fileIds array' }, { status: 400 });
    }

    // 格式化为微信云开发 batchdownloadfile 要求的格式
    const fileList = fileIds.map((id: string) => ({
      fileid: id,
      max_age: 7200 // 链接有效期 2 小时
    }));

    const result = await tcbBatchDownloadFile(fileList);
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Failed to get download URLs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
