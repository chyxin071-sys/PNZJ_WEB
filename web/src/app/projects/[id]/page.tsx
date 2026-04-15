"use client";

import { useParams, useRouter } from "next/navigation";
import MainLayout from "../../../components/MainLayout";
import { ArrowLeft, Hammer, CheckCircle2, Clock, AlertTriangle, PlayCircle, HardHat, FileText, ChevronDown, Check, Camera } from "lucide-react";
import { useState, useEffect } from "react";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedNodeIndex, setExpandedNodeIndex] = useState<number | null>(null);

  // 8个标准大节点及子节点定义
  const templateNodes = [
    { name: "开工", subNodes: ["开工仪式", "现场交底", "成品保护", "墙体拆除", "砌筑新建"] },
    { name: "水电", subNodes: ["水电交底", "开槽布管", "线管敷设", "打压测试", "水电验收"] },
    { name: "木工", subNodes: ["木工交底", "吊顶龙骨", "石膏板封样", "隔墙制作", "木工验收"] },
    { name: "瓦工", subNodes: ["瓦工交底", "防水涂刷", "闭水试验", "瓷砖铺贴", "瓦工验收"] },
    { name: "墙面", subNodes: ["墙面交底", "基层找平", "挂网防裂", "腻子批刮", "乳胶漆涂刷", "墙面验收"] },
    { name: "定制", subNodes: ["复尺测量", "柜体安装", "木门安装", "台面安装", "五金挂件"] },
    { name: "软装", subNodes: ["灯具安装", "卫浴安装", "开关面板", "家具进场", "窗帘壁纸"] },
    { name: "交付", subNodes: ["拓荒保洁", "室内空气治理", "竣工验收", "钥匙移交", "合影留念"] }
  ];

  useEffect(() => {
    if (id) fetchProject();
  }, [id]);

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (res.ok) {
        const data = await res.json();
        
        // 数据处理：如果没有 nodesData，基于 currentNode 自动生成
        let projectNodes = data.nodesData || [];
        const currentNodeIndex = (data.currentNode || 1) - 1;
        
        if (projectNodes.length === 0) {
          projectNodes = templateNodes.map((template, index) => {
            let status = 'pending';
            let startDate = '', endDate = '';
            
            // 简单模拟时间
            const sd = new Date(data.startDate ? data.startDate.replace(/-/g, '/') : new Date());
            sd.setDate(sd.getDate() + index * 5);
            startDate = `${sd.getFullYear()}-${String(sd.getMonth()+1).padStart(2,'0')}-${String(sd.getDate()).padStart(2,'0')}`;
            
            const ed = new Date(sd);
            ed.setDate(ed.getDate() + (index < currentNodeIndex ? 3 : 5));
            endDate = `${ed.getFullYear()}-${String(ed.getMonth()+1).padStart(2,'0')}-${String(ed.getDate()).padStart(2,'0')}`;

            if (index < currentNodeIndex) status = 'completed';
            else if (index === currentNodeIndex) status = 'current';
            
            return {
              name: template.name,
              subNodes: template.subNodes,
              status,
              startDate,
              endDate,
              records: []
            };
          });
        }
        
        data.nodesData = projectNodes;
        setProject(data);
        setExpandedNodeIndex(currentNodeIndex); // 默认展开当前节点
      }
    } catch (e) {
      console.error('Failed to fetch project', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteNode = async (e: React.MouseEvent, nodeIndex: number) => {
    e.stopPropagation();
    if (!window.confirm(`确认完成【${project.nodesData[nodeIndex].name}】节点验收并推进到下一阶段吗？`)) return;

    try {
      const newNodesData = [...project.nodesData];
      const nowStr = new Date().toISOString().split('T')[0];
      
      // 更新当前节点状态
      newNodesData[nodeIndex].status = 'completed';
      newNodesData[nodeIndex].endDate = nowStr;

      let newCurrentNode = project.currentNode || 1;
      
      // 如果还有下一个节点，将其状态改为进行中
      if (nodeIndex + 1 < newNodesData.length) {
        newNodesData[nodeIndex + 1].status = 'current';
        newNodesData[nodeIndex + 1].startDate = nowStr;
        
        // 预计5天后完成
        const nextEnd = new Date();
        nextEnd.setDate(nextEnd.getDate() + 5);
        newNodesData[nodeIndex + 1].endDate = `${nextEnd.getFullYear()}-${String(nextEnd.getMonth()+1).padStart(2,'0')}-${String(nextEnd.getDate()).padStart(2,'0')}`;
        
        newCurrentNode = nodeIndex + 2;
      }

      // 如果是最后一个节点，更新项目状态为竣工
      const isFinished = nodeIndex + 1 >= newNodesData.length;
      const newProjectStatus = isFinished ? '已竣工' : project.status;

      const updateData = {
        nodesData: newNodesData,
        currentNode: newCurrentNode,
        status: newProjectStatus
      };

      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (res.ok) {
        setProject({ ...project, ...updateData });
        setExpandedNodeIndex(isFinished ? null : nodeIndex + 1);
        alert("节点已推进！");
      }
    } catch (err) {
      console.error("Failed to update node status", err);
      alert("操作失败，请重试");
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case "正常": return "text-emerald-600 bg-emerald-50 border-emerald-100";
      case "预警": return "text-amber-600 bg-amber-50 border-amber-100";
      case "严重延期": return "text-rose-600 bg-rose-50 border-rose-100";
      default: return "text-zinc-600 bg-zinc-50 border-zinc-100";
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case "正常": return <CheckCircle2 className="w-4 h-4 mr-1.5" />;
      case "预警": return <Clock className="w-4 h-4 mr-1.5" />;
      case "严重延期": return <AlertTriangle className="w-4 h-4 mr-1.5" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="p-8 max-w-[1200px] mx-auto flex items-center justify-center h-64">
          <div className="text-primary-600">加载中...</div>
        </div>
      </MainLayout>
    );
  }

  if (!project) {
    return (
      <MainLayout>
        <div className="p-8 max-w-[1200px] mx-auto text-center py-20 text-primary-500">
          找不到对应的工地数据
        </div>
      </MainLayout>
    );
  }

  // 计算已耗时天数
  let daysElapsed = 0;
  if (project.startDate && project.status !== '未开工') {
    const start = new Date(project.startDate);
    const now = new Date();
    start.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    daysElapsed = Math.max(0, Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  }

  // 预计完工时间
  let expectedEndDate = '-';
  if (project.startDate) {
    const sd = new Date(project.startDate);
    sd.setDate(sd.getDate() + 90);
    expectedEndDate = `${sd.getFullYear()}-${String(sd.getMonth()+1).padStart(2,'0')}-${String(sd.getDate()).padStart(2,'0')}`;
  }

  return (
    <MainLayout>
      <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-6">
        <button 
          onClick={() => router.back()}
          className="flex items-center text-sm font-medium text-primary-500 hover:text-primary-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          返回列表
        </button>

        {/* 顶部概览卡片 */}
        <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary-50 to-transparent rounded-bl-full -z-0 opacity-50"></div>
          
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-primary-900">{project.address || '未知小区'}</h1>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center ${getHealthColor(project.health)}`}>
                  {getHealthIcon(project.health)}
                  {project.health || '正常'}
                </span>
              </div>
              <div className="flex items-center text-sm text-primary-600 mb-6">
                <span className="font-medium text-primary-900">{project.customer}</span>
                <span className="font-mono text-primary-400 ml-2">{project.customerNo || project.id}</span>
                <span className="mx-3 text-primary-200">|</span>
                <span>{project.phone || '无电话'}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8">
                <div>
                  <p className="text-xs text-primary-400 mb-1">开工日期</p>
                  <p className="text-sm font-medium text-primary-900">{project.startDate || '未定'}</p>
                </div>
                <div>
                  <p className="text-xs text-primary-400 mb-1">预计完工</p>
                  <p className="text-sm font-medium text-primary-900">{expectedEndDate}</p>
                </div>
                <div>
                  <p className="text-xs text-primary-400 mb-1">项目经理</p>
                  <p className="text-sm font-medium text-primary-900">{project.manager || '未分配'}</p>
                </div>
                <div>
                  <p className="text-xs text-primary-400 mb-1">已耗时</p>
                  <p className="text-sm font-bold text-amber-600">{daysElapsed} <span className="text-xs font-normal text-amber-600/70">天</span></p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 shrink-0">
              <button 
                onClick={() => alert("网页端看资料及图纸功能开发中")}
                className="flex items-center justify-center px-4 py-2 bg-primary-50 text-primary-900 rounded-lg hover:bg-primary-100 transition-colors text-sm font-medium"
              >
                <FileText className="w-4 h-4 mr-2" />
                项目资料 / 图纸
              </button>
              <button 
                onClick={() => router.push(`/quotes/${project.quoteId || ''}`)}
                className="flex items-center justify-center px-4 py-2 border border-primary-200 text-primary-700 rounded-lg hover:bg-primary-50 transition-colors text-sm font-medium"
              >
                <Hammer className="w-4 h-4 mr-2" />
                关联报价单
              </button>
            </div>
          </div>
        </div>

        {/* 施工节点进度 */}
        <div className="bg-white rounded-xl border border-primary-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-primary-100 bg-primary-50/50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-primary-900 flex items-center gap-2">
              <HardHat className="w-5 h-5 text-primary-500" />
              8大施工节点管控
            </h2>
            <span className="text-sm font-mono text-primary-600">
              当前: <span className="font-bold text-primary-900">{templateNodes[(project.currentNode || 1) - 1]?.name}</span>
            </span>
          </div>

          <div className="p-6">
            <div className="relative">
              {/* 左侧连接线 */}
              <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-primary-100 rounded-full"></div>

              <div className="space-y-6">
                {project.nodesData.map((node: any, index: number) => {
                  const isCompleted = node.status === 'completed';
                  const isCurrent = node.status === 'current';
                  const isPending = node.status === 'pending';
                  const isExpanded = expandedNodeIndex === index;

                  return (
                    <div key={index} className="relative z-10 flex gap-4 group">
                      {/* 节点状态圈 */}
                      <div className="shrink-0 flex flex-col items-center mt-1">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors border-4 border-white shadow-sm
                          ${isCompleted ? 'bg-primary-900 text-white' : 
                            isCurrent ? 'bg-amber-500 text-white ring-4 ring-amber-100 border-none' : 
                            'bg-primary-100 text-primary-400'}`}
                        >
                          {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : 
                           isCurrent ? <PlayCircle className="w-6 h-6" /> : 
                           <span className="font-mono font-bold text-lg">{index + 1}</span>}
                        </div>
                      </div>

                      {/* 节点内容卡片 */}
                      <div className={`flex-1 rounded-xl border transition-all duration-200 overflow-hidden
                        ${isCurrent ? 'border-amber-200 shadow-md ring-1 ring-amber-500/10' : 
                          isCompleted ? 'border-primary-200 bg-white' : 
                          'border-primary-100 bg-zinc-50/50'}`}
                      >
                        {/* 卡片头部（可点击展开） */}
                        <div 
                          className="px-5 py-4 cursor-pointer flex justify-between items-center bg-white hover:bg-zinc-50/50 transition-colors"
                          onClick={() => setExpandedNodeIndex(isExpanded ? null : index)}
                        >
                          <div>
                            <h3 className={`text-lg font-bold mb-1 ${isCurrent ? 'text-amber-600' : isCompleted ? 'text-primary-900' : 'text-primary-400'}`}>
                              {node.name}
                            </h3>
                            <div className="text-xs text-primary-500 flex items-center gap-2">
                              {isCompleted && <span>已完成：{node.startDate} ~ {node.endDate}</span>}
                              {isCurrent && <span>进行中 | 开工：{node.startDate} | 预计：{node.endDate}</span>}
                              {isPending && <span>未开始 | 预计：{node.startDate} ~ {node.endDate}</span>}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            {isCurrent && (
                              <button 
                                onClick={(e) => handleCompleteNode(e, index)}
                                className="px-4 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-full hover:bg-amber-600 transition-colors shadow-sm"
                              >
                                验收完成
                              </button>
                            )}
                            <ChevronDown className={`w-5 h-5 text-primary-300 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                          </div>
                        </div>

                        {/* 展开的详情内容 */}
                        {isExpanded && (
                          <div className="px-5 pb-5 pt-2 bg-zinc-50/30 border-t border-primary-50">
                            {/* 施工小节点展示 */}
                            <div className="mb-6">
                              <p className="text-xs font-medium text-primary-400 mb-3">包含施工工序</p>
                              <div className="flex flex-wrap gap-2">
                                {(node.subNodes || []).map((sub: string, subIdx: number) => (
                                  <span key={subIdx} className="px-3 py-1 bg-white border border-primary-200 rounded-full text-xs text-primary-700 font-medium shadow-sm">
                                    {sub}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* 验收记录 / 留痕 */}
                            <div>
                              <div className="flex justify-between items-center mb-3">
                                <p className="text-xs font-medium text-primary-400">验收留痕记录</p>
                                {(isCurrent || isCompleted) && (
                                  <button 
                                    onClick={() => alert("上传工作留痕功能开发中")}
                                    className="text-xs font-medium text-primary-600 hover:text-primary-900 flex items-center"
                                  >
                                    <Camera className="w-3.5 h-3.5 mr-1" />
                                    添加记录
                                  </button>
                                )}
                              </div>
                              
                              {node.records && node.records.length > 0 ? (
                                <div className="space-y-3">
                                  {node.records.map((record: any, rIdx: number) => (
                                    <div key={rIdx} className="bg-white p-4 rounded-lg border border-primary-100 shadow-sm">
                                      <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold text-primary-900">{record.uploader}</span>
                                        <span className="text-xs text-primary-400">{record.time}</span>
                                      </div>
                                      {record.desc && <p className="text-sm text-primary-700 mb-3">{record.desc}</p>}
                                      {record.files && record.files.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                          {record.files.map((file: any, fIdx: number) => (
                                            file.type === 'image' ? (
                                              <div key={fIdx} className="w-20 h-20 bg-zinc-100 rounded-md border border-primary-100 overflow-hidden flex items-center justify-center text-primary-300">
                                                图
                                              </div>
                                            ) : null
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="py-8 text-center bg-white rounded-lg border border-dashed border-primary-200">
                                  <p className="text-sm text-primary-400">暂无验收留痕记录</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

      </div>
    </MainLayout>
  );
}