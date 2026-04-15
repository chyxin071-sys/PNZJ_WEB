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
  
  // 新增状态
  const [isEditingNodes, setIsEditingNodes] = useState(false);
  const [isStartingProject, setIsStartingProject] = useState(false);
  const [baseStartDate, setBaseStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [subNodeModal, setSubNodeModal] = useState<{ majorIdx: number, subIdx: number } | null>(null);
  const [delayModal, setDelayModal] = useState<{ nodeIdx: number } | null>(null);
  const [delayDays, setDelayDays] = useState(1);
  const [delayReason, setDelayReason] = useState("");

  // 8个标准大节点及子节点定义
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
              duration: template.duration,
              subNodes: template.subNodes.map(s => ({ name: s, status: "pending", records: [] })),
              status,
              startDate,
              endDate,
              records: [],
              delayRecords: []
            };
          });
        } else {
          // 兼容老数据结构
          projectNodes = projectNodes.map((n: any, idx: number) => ({
            ...n,
            duration: n.duration || templateNodes[idx]?.duration || 5,
            subNodes: (n.subNodes || []).map((s: any) => typeof s === 'string' ? { name: s, status: "pending", records: [] } : s),
            delayRecords: n.delayRecords || []
          }));
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

  const recalculateGantt = (nodes: any[], baseDate: string) => {
    let currentStart = new Date(baseDate);
    
    return nodes.map(node => {
      if (node.status === 'completed') {
        if (node.endDate) currentStart = new Date(node.endDate);
        return node; 
      }
      
      const delayDays = (node.delayRecords || []).reduce((sum: number, r: any) => sum + (Number(r.days) || 0), 0);
      const nodeDuration = (Number(node.duration) || 0) + delayDays;
      
      const sd = new Date(currentStart);
      const ed = new Date(sd);
      ed.setDate(ed.getDate() + nodeDuration);
      
      currentStart = new Date(ed); 

      return {
        ...node,
        startDate: `${sd.getFullYear()}-${String(sd.getMonth()+1).padStart(2,'0')}-${String(sd.getDate()).padStart(2,'0')}`,
        endDate: `${ed.getFullYear()}-${String(ed.getMonth()+1).padStart(2,'0')}-${String(ed.getDate()).padStart(2,'0')}`
      };
    });
  };

  const handleCompleteNode = async (e: React.MouseEvent, nodeIndex: number) => {
    e.stopPropagation();
    
    // 校验所有子节点是否已验收
    const unapprovedSubs = project.nodesData[nodeIndex].subNodes.filter((s: any) => s.status !== 'approved');
    if (unapprovedSubs.length > 0) {
      alert(`当前大节点下还有 ${unapprovedSubs.length} 个子工序未验收通过，无法流转！`);
      return;
    }

    if (!window.confirm(`确认完成【${project.nodesData[nodeIndex].name}】节点验收并推进到下一阶段吗？`)) return;

    try {
      let newNodesData = [...project.nodesData];
      const nowStr = new Date().toISOString().split('T')[0];
      
      newNodesData[nodeIndex].status = 'completed';
      newNodesData[nodeIndex].endDate = nowStr;

      let newCurrentNode = project.currentNode || 1;
      
      if (nodeIndex + 1 < newNodesData.length) {
        newNodesData[nodeIndex + 1].status = 'current';
        newNodesData[nodeIndex + 1].startDate = nowStr;
        newCurrentNode = nodeIndex + 2;
      }

      // 重算甘特图
      newNodesData = recalculateGantt(newNodesData, project.startDate);

      const isFinished = nodeIndex + 1 >= newNodesData.length;
      const newProjectStatus = isFinished ? '已竣工' : project.status;

      const updateData = {
        nodesData: newNodesData,
        currentNode: newCurrentNode,
        status: newProjectStatus,
        expectedEndDate: newNodesData[newNodesData.length - 1].endDate // 更新预计竣工日期
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

  const handleStartProject = async () => {
    if (!baseStartDate) return alert('请选择开工日期');
    
    // 初始化时状态改为 current
    let newNodes = [...project.nodesData];
    newNodes[0].status = 'current';
    newNodes = recalculateGantt(newNodes, baseStartDate);

    const updateData = {
      status: "施工中",
      startDate: baseStartDate,
      expectedEndDate: newNodes[newNodes.length - 1].endDate,
      nodesData: newNodes,
      currentNode: 1
    };

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      if (res.ok) {
        setProject({ ...project, ...updateData });
        setIsStartingProject(false);
        setIsEditingNodes(false);
        setExpandedNodeIndex(0);
      }
    } catch (e) {
      alert('开工失败');
    }
  };

  const handleRemoveSubNode = (majorIdx: number, subIdx: number) => {
    const newNodes = [...project.nodesData];
    newNodes[majorIdx].subNodes.splice(subIdx, 1);
    setProject({ ...project, nodesData: newNodes });
  };

  const handleAddDelaySubmit = async () => {
    if (!delayModal) return;
    const { nodeIdx } = delayModal;
    const newNodes = [...project.nodesData];
    
    newNodes[nodeIdx].delayRecords.push({
      days: delayDays,
      reason: delayReason,
      createdAt: new Date().toISOString()
    });

    const recalculatedNodes = recalculateGantt(newNodes, project.startDate);

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          nodesData: recalculatedNodes,
          expectedEndDate: recalculatedNodes[recalculatedNodes.length - 1].endDate
        })
      });
      if (res.ok) {
        setProject({ ...project, nodesData: recalculatedNodes, expectedEndDate: recalculatedNodes[recalculatedNodes.length - 1].endDate });
        setDelayModal(null);
        setDelayDays(1);
        setDelayReason("");
      }
    } catch (e) {
      alert('记录失败');
    }
  };

  const handleSubNodeAccept = async (result: 'approved' | 'rejected', remark: string, photos: string[]) => {
    if (!subNodeModal) return;
    const { majorIdx, subIdx } = subNodeModal;
    const newNodes = [...project.nodesData];
    const subNode = newNodes[majorIdx].subNodes[subIdx];
    
    subNode.status = result;
    subNode.records.push({
      result,
      remark,
      photos,
      createdAt: new Date().toISOString().split('T')[0]
    });

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodesData: newNodes })
      });
      if (res.ok) {
        setProject({ ...project, nodesData: newNodes });
        setSubNodeModal(null);
      }
    } catch (e) {
      alert('验收提交失败');
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
                  <p className="text-sm font-medium text-primary-900">{project.startDate || '未开工'}</p>
                </div>
                <div>
                  <p className="text-xs text-primary-400 mb-1">预计完工</p>
                  <p className="text-sm font-medium text-primary-900">{project.expectedEndDate || expectedEndDate}</p>
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
              {project.status === '未开工' && (
                <button 
                  onClick={() => setIsStartingProject(true)}
                  className="flex items-center justify-center px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm font-bold shadow-sm"
                >
                  <PlayCircle className="w-4 h-4 mr-2" />
                  准备开工 (裁剪节点)
                </button>
              )}
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
                                {(node.subNodes || []).map((sub: any, subIdx: number) => {
                                  const isSubApproved = sub.status === 'approved';
                                  const isSubRejected = sub.status === 'rejected';
                                  return (
                                    <div key={subIdx} className="relative group/sub">
                                      <button 
                                        onClick={() => {
                                          if (isEditingNodes) return;
                                          if (node.status === 'pending') return alert('前置节点尚未完工，当前阶段未解锁！');
                                          setSubNodeModal({ majorIdx: index, subIdx });
                                        }}
                                        className={`px-3 py-1 border rounded-full text-xs font-medium shadow-sm transition-colors flex items-center gap-1
                                          ${isSubApproved ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                                            isSubRejected ? 'bg-rose-50 border-rose-200 text-rose-700' :
                                            'bg-white border-primary-200 text-primary-700 hover:border-primary-400'}`}
                                      >
                                        {isSubApproved && <CheckCircle2 className="w-3 h-3" />}
                                        {isSubRejected && <AlertTriangle className="w-3 h-3" />}
                                        {sub.name}
                                      </button>
                                      {isEditingNodes && project.status === '未开工' && (
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); handleRemoveSubNode(index, subIdx); }}
                                          className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-sm hover:bg-rose-600 z-10"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* 异常/延误留痕 */}
                            <div className="mb-4">
                              <div className="flex justify-between items-center mb-3">
                                <p className="text-xs font-medium text-primary-400">项目延误 / 停工记录</p>
                                {(isCurrent || isPending) && project.status !== '未开工' && (
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setDelayModal({ nodeIdx: index }); }}
                                    className="text-xs font-medium text-rose-600 hover:text-rose-700 flex items-center bg-rose-50 px-2 py-1 rounded border border-rose-100"
                                  >
                                    <AlertCircle className="w-3.5 h-3.5 mr-1" />
                                    添加延误
                                  </button>
                                )}
                              </div>
                              
                              {node.delayRecords && node.delayRecords.length > 0 ? (
                                <div className="space-y-2 mb-4">
                                  {node.delayRecords.map((delay: any, dIdx: number) => (
                                    <div key={dIdx} className="bg-rose-50/50 p-3 rounded border border-rose-100 flex justify-between items-center">
                                      <span className="text-sm text-rose-700 font-medium">停工延误：{delay.days} 天</span>
                                      <span className="text-xs text-rose-500">{delay.reason} ({delay.createdAt.split('T')[0]})</span>
                                    </div>
                                  ))}
                                </div>
                              ) : null}
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

        {/* 开工与裁剪节点弹窗 */}
        {isStartingProject && (
          <div className="fixed inset-0 bg-primary-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-primary-100 flex justify-between items-center bg-primary-50/50">
                <h2 className="text-lg font-bold text-primary-900">准备开工与工序裁剪</h2>
                <button onClick={() => { setIsStartingProject(false); setIsEditingNodes(false); }} className="text-primary-400 hover:text-primary-900 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <div className="mb-6">
                  <label className="block text-sm font-bold text-primary-900 mb-2">选择总开工日期 <span className="text-rose-500">*</span></label>
                  <input 
                    type="date" 
                    value={baseStartDate}
                    onChange={(e) => setBaseStartDate(e.target.value)}
                    className="w-full p-3 border border-primary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                  />
                  <p className="text-xs text-primary-400 mt-2">选定后，系统将自动使用 (T+N) 算法计算出所有后续 8 大节点的工期和预计完工日期。</p>
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-bold text-primary-900 mb-2">裁剪不需要的施工小节点</label>
                  <button 
                    onClick={() => { setIsEditingNodes(!isEditingNodes); }}
                    className={`w-full py-2.5 rounded-xl border text-sm font-medium transition-colors ${isEditingNodes ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-white border-primary-200 text-primary-600 hover:bg-primary-50'}`}
                  >
                    {isEditingNodes ? '结束裁剪，点击下方确认开工' : '点击开启裁剪模式 (在背景卡片中点击 X 删除)'}
                  </button>
                  <p className="text-xs text-amber-600 mt-2">提示：删除小节点后，工人的手机端将不再显示该任务。正式开工后不可再修改结构！</p>
                </div>
                
                <button 
                  onClick={handleStartProject}
                  className="w-full py-3 bg-primary-900 text-white rounded-xl hover:bg-primary-800 transition-colors font-bold shadow-md shadow-primary-900/20"
                >
                  确认，正式开工
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 添加延误记录弹窗 */}
        {delayModal && (
          <div className="fixed inset-0 bg-primary-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-primary-100 flex justify-between items-center bg-rose-50">
                <h2 className="text-lg font-bold text-rose-900 flex items-center"><AlertCircle className="w-5 h-5 mr-2" /> 记录停工/延误</h2>
                <button onClick={() => setDelayModal(null)} className="text-rose-400 hover:text-rose-900 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-bold text-primary-900 mb-2">延误天数 <span className="text-rose-500">*</span></label>
                  <input 
                    type="number" 
                    min="1"
                    value={delayDays}
                    onChange={(e) => setDelayDays(parseInt(e.target.value) || 1)}
                    className="w-full p-3 border border-primary-200 rounded-xl focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-bold text-primary-900 mb-2">延误原因 / 备注 <span className="text-rose-500">*</span></label>
                  <textarea 
                    rows={3}
                    placeholder="例如：业主中途修改方案、材料未到场..."
                    value={delayReason}
                    onChange={(e) => setDelayReason(e.target.value)}
                    className="w-full p-3 border border-primary-200 rounded-xl focus:outline-none focus:border-rose-500"
                  ></textarea>
                  <p className="text-xs text-rose-600 mt-2">提示：提交后，系统将自动把所有后续未完成节点的日期往后推迟 {delayDays} 天。</p>
                </div>
                <button 
                  onClick={handleAddDelaySubmit}
                  className="w-full py-3 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-colors font-bold shadow-md shadow-rose-600/20"
                >
                  确认记录并重算工期
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 子节点验收弹窗 */}
        {subNodeModal && (() => {
          const { majorIdx, subIdx } = subNodeModal;
          const subNode = project.nodesData[majorIdx].subNodes[subIdx];
          return (
            <div className="fixed inset-0 bg-primary-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-primary-100 flex justify-between items-center bg-primary-50/50 shrink-0">
                  <h2 className="text-lg font-bold text-primary-900">工序验收: {subNode.name}</h2>
                  <button onClick={() => setSubNodeModal(null)} className="text-primary-400 hover:text-primary-900 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6 overflow-y-auto flex-1">
                  <div className="mb-5">
                    <label className="block text-sm font-bold text-primary-900 mb-2">现场照片 (最多9张) <span className="text-rose-500">*</span></label>
                    <div className="grid grid-cols-3 gap-2">
                      <button className="aspect-square bg-zinc-50 border-2 border-dashed border-primary-200 rounded-xl flex flex-col items-center justify-center text-primary-400 hover:bg-primary-50 hover:border-primary-400 transition-colors">
                        <Camera className="w-6 h-6 mb-1" />
                        <span className="text-xs">上传照片</span>
                      </button>
                    </div>
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm font-bold text-primary-900 mb-2">验收说明 / 备注</label>
                    <textarea 
                      rows={3}
                      id="remarkText"
                      placeholder="填写相关施工情况说明..."
                      className="w-full p-3 border border-primary-200 rounded-xl focus:outline-none focus:border-primary-500"
                    ></textarea>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-primary-100">
                    <button 
                      onClick={() => {
                        const remark = (document.getElementById('remarkText') as HTMLTextAreaElement).value;
                        handleSubNodeAccept('rejected', remark, []);
                      }}
                      className="flex-1 py-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl hover:bg-rose-100 transition-colors font-bold"
                    >
                      驳回整改
                    </button>
                    <button 
                      onClick={() => {
                        const remark = (document.getElementById('remarkText') as HTMLTextAreaElement).value;
                        handleSubNodeAccept('approved', remark, []);
                      }}
                      className="flex-1 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-bold shadow-md shadow-emerald-600/20"
                    >
                      通过验收
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      </div>
    </MainLayout>
  );
}