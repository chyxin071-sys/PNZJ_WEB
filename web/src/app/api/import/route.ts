import { NextResponse } from 'next/server';
import { tcbAdd } from '@/lib/wechat-tcb';

export async function POST(request: Request) {
  try {
    const { leads, materials } = await request.json();
    
    const results = {
      leadsAdded: 0,
      materialsAdded: 0,
      errors: [] as string[]
    };

    // 导入线索
    if (leads && Array.isArray(leads)) {
      for (const lead of leads) {
        try {
          const year = new Date().getFullYear();
          const docData = JSON.stringify({
            ...lead,
            customerNo: `P${year}IMP${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
            createdAt: { $date: Date.now() },
            updatedAt: { $date: Date.now() }
          });
          const query = `db.collection("leads").add({ data: ${docData} })`;
          await tcbAdd(query);
          results.leadsAdded++;
        } catch (e: any) {
          results.errors.push(`导入线索 ${lead.name} 失败: ${e.message}`);
        }
      }
    }

    // 导入材料
    if (materials && Array.isArray(materials)) {
      for (const mat of materials) {
        try {
          const docData = JSON.stringify({
            ...mat,
            createdAt: { $date: Date.now() },
            updatedAt: { $date: Date.now() }
          });
          const query = `db.collection("materials").add({ data: ${docData} })`;
          await tcbAdd(query);
          results.materialsAdded++;
        } catch (e: any) {
          results.errors.push(`导入材料 ${mat.name} 失败: ${e.message}`);
        }
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}