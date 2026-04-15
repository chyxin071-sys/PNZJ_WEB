import { NextResponse } from 'next/server';
import { tcbQuery, tcbAdd } from '@/lib/wechat-tcb';

export async function GET() {
  try {
    const query = `db.collection("projects").orderBy("createdAt", "desc").limit(100).get()`;
    const data = await tcbQuery(query);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 初始化 8 大节点模板（带标准工期 N 天）
    const templateNodes = [
      { name: "开工", duration: 3, subNodes: ["开工仪式", "现场交底", "成品保护", "墙体拆除", "垃圾清运", "设备定位(空调/新风)", "砌筑新建", "墙体批荡"] },
      { name: "水电", duration: 7, subNodes: ["水电交底", "开槽布管", "排污下水", "线管敷设", "打压测试", "水电验收"] },
      { name: "木工", duration: 10, subNodes: ["木工交底", "吊顶龙骨", "石膏板封样", "背景墙打底", "隔墙制作", "木工验收"] },
      { name: "瓦工", duration: 15, subNodes: ["瓦工交底", "下水管包管", "防水涂刷", "闭水试验", "地面找平", "瓷砖铺贴", "瓷砖美缝", "瓦工验收"] },
      { name: "墙面", duration: 12, subNodes: ["墙面交底", "基层找平", "挂网防裂", "腻子批刮", "乳胶漆涂刷", "墙面验收"] },
      { name: "定制", duration: 20, subNodes: ["复尺测量", "厨卫吊顶", "木地板铺装", "木门安装", "柜体安装", "台面安装", "五金挂件"] },
      { name: "软装", duration: 7, subNodes: ["窗帘壁纸", "灯具安装", "开关面板", "卫浴安装", "大家电进场", "家具进场"] },
      { name: "交付", duration: 3, subNodes: ["拓荒保洁", "室内空气治理", "竣工验收", "钥匙移交", "合影留念"] }
    ];

    const nodesData = templateNodes.map(node => ({
      name: node.name,
      duration: node.duration,
      status: "pending",
      startDate: "",
      endDate: "",
      subNodes: node.subNodes.map(subName => ({
        name: subName,
        status: "pending",
        records: []
      })),
      delayRecords: []
    }));

    const docData = JSON.stringify({
      ...body,
      status: "未开工", // 初始状态为未开工，等待项目经理裁剪并点击“正式开工”
      nodesData,
      createdAt: { $date: Date.now() },
      updatedAt: { $date: Date.now() }
    });
    
    const query = `db.collection("projects").add({ data: ${docData} })`;
    const res = await tcbAdd(query);
    return NextResponse.json(res);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
