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
      { name: "开工", duration: 10, subNodes: [{name: "开工仪式", duration: 1}, {name: "现场交底", duration: 1}, {name: "成品保护", duration: 1}, {name: "墙体拆除", duration: 2}, {name: "垃圾清运", duration: 1}, {name: "设备定位(空调/新风)", duration: 1}, {name: "砌筑新建", duration: 2}, {name: "墙体批荡", duration: 1}] },
      { name: "水电", duration: 9, subNodes: [{name: "水电交底", duration: 1}, {name: "开槽布管", duration: 3}, {name: "排污下水", duration: 1}, {name: "线管敷设", duration: 2}, {name: "打压测试", duration: 1}, {name: "水电验收", duration: 1}] },
      { name: "木工", duration: 10, subNodes: [{name: "木工交底", duration: 1}, {name: "吊顶龙骨", duration: 3}, {name: "石膏板封样", duration: 2}, {name: "背景墙打底", duration: 2}, {name: "隔墙制作", duration: 1}, {name: "木工验收", duration: 1}] },
      { name: "瓦工", duration: 16, subNodes: [{name: "瓦工交底", duration: 1}, {name: "下水管包管", duration: 1}, {name: "防水涂刷", duration: 2}, {name: "闭水试验", duration: 2}, {name: "地面找平", duration: 2}, {name: "瓷砖铺贴", duration: 6}, {name: "瓷砖美缝", duration: 1}, {name: "瓦工验收", duration: 1}] },
      { name: "墙面", duration: 14, subNodes: [{name: "墙面交底", duration: 1}, {name: "基层找平", duration: 2}, {name: "挂网防裂", duration: 1}, {name: "腻子批刮", duration: 4}, {name: "乳胶漆涂刷", duration: 5}, {name: "墙面验收", duration: 1}] },
      { name: "定制", duration: 12, subNodes: [{name: "复尺测量", duration: 1}, {name: "厨卫吊顶", duration: 1}, {name: "木地板铺装", duration: 2}, {name: "木门安装", duration: 1}, {name: "柜体安装", duration: 4}, {name: "台面安装", duration: 1}, {name: "五金挂件", duration: 2}] },
      { name: "软装", duration: 6, subNodes: [{name: "窗帘壁纸", duration: 1}, {name: "灯具安装", duration: 1}, {name: "开关面板", duration: 1}, {name: "卫浴安装", duration: 1}, {name: "大家电进场", duration: 1}, {name: "家具进场", duration: 1}] },
      { name: "交付", duration: 4, subNodes: [{name: "拓荒保洁", duration: 1}, {name: "室内空气治理", duration: 1}, {name: "竣工验收", duration: 1}, {name: "钥匙移交/合影留念", duration: 1}] }
    ];

    const nodesData = templateNodes.map(node => ({
      name: node.name,
      duration: node.duration,
      status: "pending",
      startDate: "",
      endDate: "",
      subNodes: node.subNodes.map(sub => ({
        name: sub.name,
        duration: sub.duration,
        status: "pending",
        startDate: "",
        endDate: "",
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
