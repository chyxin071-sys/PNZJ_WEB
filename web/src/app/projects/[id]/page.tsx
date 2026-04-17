"use client";

import { useParams, useRouter } from "next/navigation";
import MainLayout from "../../../components/MainLayout";
import { ArrowLeft, CheckCircle2, Clock, AlertTriangle, PlayCircle, HardHat, FileText, ChevronDown, Camera, X, AlertCircle, Edit2, Menu, Plus, User, FileSignature } from "lucide-react";
import CustomerInfo from "../../../components/CustomerInfo";
import CustomerDocuments from "../../../components/CustomerDocuments";
import { useState, useEffect } from "react";
import { getNextWorkingDay, calculateEndDate, formatDate } from "../../../lib/date";

// 8大节点标准模板
const TEMPLATE_NODES = [
  { name: "开工", duration: 10, subNodes: [{name:"开工仪式",duration:1},{name:"现场交底",duration:1},{name:"成品保护",duration:1},{name:"墙体拆除",duration:2},{name:"垃圾清运",duration:1},{name:"设备定位",duration:1},{name:"砌筑新建",duration:2},{name:"墙体批荡",duration:1}] },
  { name: "水电", duration: 9,  subNodes: [{name:"水电交底",duration:1},{name:"开槽布管",duration:3},{name:"排污下水",duration:1},{name:"线管敷设",duration:2},{name:"打压测试",duration:1},{name:"水电验收",duration:1}] },
  { name: "木工", duration: 10, subNodes: [{name:"木工交底",duration:1},{name:"吊顶龙骨",duration:3},{name:"石膏板封样",duration:2},{name:"背景墙打底",duration:2},{name:"隔墙制作",duration:1},{name:"木工验收",duration:1}] },
  { name: "瓦工", duration: 16, subNodes: [{name:"瓦工交底",duration:1},{name:"下水管包管",duration:1},{name:"防水涂刷",duration:2},{name:"闭水试验",duration:2},{name:"地面找平",duration:2},{name:"瓷砖铺贴",duration:6},{name:"瓷砖美缝",duration:1},{name:"瓦工验收",duration:1}] },
  { name: "墙面", duration: 14, subNodes: [{name:"墙面交底",duration:1},{name:"基层找平",duration:2},{name:"挂网防裂",duration:1},{name:"腻子批刮",duration:4},{name:"乳胶漆涂刷",duration:5},{name:"墙面验收",duration:1}] },
  { name: "定制", duration: 12, subNodes: [{name:"复尺测量",duration:1},{name:"厨卫吊顶",duration:1},{name:"木地板铺装",duration:2},{name:"木门安装",duration:1},{name:"柜体安装",duration:4},{name:"台面安装",duration:1},{name:"五金挂件",duration:2}] },
  { name: "软装", duration: 6,  subNodes: [{name:"窗帘壁纸",duration:1},{name:"灯具安装",duration:1},{name:"开关面板",duration:1},{name:"卫浴安装",duration:1},{name:"大家电进场",duration:1},{name:"家具进场",duration:1}] },
  { name: "交付", duration: 4,  subNodes: [{name:"拓荒保洁",duration:1},{name:"室内空气治理",duration:1},{name:"竣工验收",duration:1},{name:"钥匙移交/合影留念",duration:1}] },
];

function recalculateGantt(nodes: any[], baseDate: string): any[] {
  let cursor = baseDate;
  return nodes.map(node => {
    if (node.status === 'completed' && node.actualEndDate) {
      cursor = formatDate(getNextWorkingDay(new Date(node.actualEndDate.replace(/-/g, '/'))));
      return node;
    }
    const nodeStart = cursor;
    let nodeEnd = cursor;
    const updatedSubs = (node.subNodes || []).map((sub: any) => {
      if (sub.status === 'completed' && sub.actualEndDate) {
        cursor = formatDate(getNextWorkingDay(new Date(sub.actualEndDate.replace(/-/g, '/'))));
        return sub;
      }
      const subStart = cursor;
      const dur = Number(sub.duration) || 0;
      const subEnd = dur > 0 ? calculateEndDate(subStart, dur) : subStart;
      if (dur > 0) cursor = formatDate(getNextWorkingDay(new Date(subEnd.replace(/-/g, '/'))));
      nodeEnd = subEnd;
      return { ...sub, startDate: subStart, endDate: subEnd };
    });
    // 延误顺延
    const totalDelay = (node.delayRecords || []).reduce((s: number, r: any) => s + (Number(r.days) || 0), 0);
    if (totalDelay > 0) {
      nodeEnd = calculateEndDate(nodeEnd, totalDelay + 1);
      cursor = formatDate(getNextWorkingDay(new Date(nodeEnd.replace(/-/g, '/'))));
    }
    return {
      ...node,
      startDate: updatedSubs.length > 0 ? updatedSubs[0].startDate : nodeStart,
      endDate: nodeEnd,
      subNodes: updatedSubs,
    };
  });
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [userRole, setUserRole] = useState('admin');
  const [userName, setUserName] = useState('未知');
  const [quoteId, setQuoteId] = useState<string | null>(null);

  // 弹窗状态
  const [startModal, setStartModal] = useState(false);
  const [baseStartDate, setBaseStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [subNodeModal, setSubNodeModal] = useState<{majorIdx:number,subIdx:number}|null>(null);
  const [delayModal, setDelayModal] = useState<{nodeIdx:number}|null>(null);
  const [delayDays, setDelayDays] = useState(1);
  const [delayReason, setDelayReason] = useState('');
  const [durationModal, setDurationModal] = useState<{majorIdx:number,subIdx:number,cur:number}|null>(null);
  const [newDuration, setNewDuration] = useState(0);
  const [editProjectModal, setEditProjectModal] = useState(false);
  const [editStartDate, setEditStartDate] = useState('');
  const [editManager, setEditManager] = useState('');
  const [tempPhotos, setTempPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [remark, setRemark] = useState('');

  // 编辑节点状态
  const [isEditingNodes, setIsEditingNodes] = useState(false);
  const [originalNodes, setOriginalNodes] = useState<any[]>([]);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      setUserRole(u.role || 'admin');
      setUserName(u.name || '未知');
    } catch {}
  }, []);

  useEffect(() => { if (id) fetchProject(); }, [id]);

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      
      // 顺便去查一下报价单
      if (data.leadId) {
        fetch(`/api/quotes?leadId=${data.leadId}`).then(r => r.json()).then(qs => {
          if (qs && qs.length > 0) setQuoteId(qs[0]._id);
        }).catch(()=>{});
      }

      let nodes: any[] = data.nodesData || [];
      if (nodes.length === 0) {
        nodes = TEMPLATE_NODES.map((t, i) => ({
          name: t.name, duration: t.duration,
          subNodes: t.subNodes.map(s => ({ name: s.name, duration: s.duration, status: 'pending', startDate: '', endDate: '', records: [] })),
          status: 'pending', startDate: '', endDate: '', records: [], delayRecords: [],
        }));
      } else {
        nodes = nodes.map((n: any, i: number) => ({
          ...n,
          duration: n.duration || TEMPLATE_NODES[i]?.duration || 5,
          subNodes: (n.subNodes || []).map((s: any) => typeof s === 'string' ? { name: s, duration: 1, status: 'pending', startDate: '', endDate: '', records: [] } : s),
          delayRecords: n.delayRecords || [],
        }));
      }
      data.nodesData = nodes;
      setProject(data);
      const cur = (data.currentNode || 1) - 1;
      setExpandedIdx(cur);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const save = async (patch: any) => {
    const res = await fetch(`/api/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-user-role': userRole },
      body: JSON.stringify(patch),
    });
    return res.ok;
  };

  const handleDeleteProject = async () => {
    if (!confirm('确定要永久删除该工地记录吗？此操作不可恢复！')) return;
    const res = await fetch(`/api/projects/${id}`, { method: 'DELETE', headers: { 'x-user-role': userRole } });
    if (res.ok) {
      alert('删除成功');
      router.push('/projects');
    } else {
      alert('删除失败');
    }
  };

  const handleEditProjectSave = async () => {
    if (!editStartDate || !editManager) return alert('开工日期和项目经理不能为空');
    let nodes = [...project.nodesData];
    // 重新排期
    nodes = recalculateGantt(nodes, editStartDate);
    const patch = { 
      startDate: editStartDate, 
      manager: editManager, 
      nodesData: nodes,
      expectedEndDate: nodes[nodes.length-1].endDate
    };
    if (await save(patch)) {
      setProject({ ...project, ...patch });
      setEditProjectModal(false);
      alert('修改成功，排期已重算');
    } else {
      alert('保存失败');
    }
  };

  const handleStartProject = async () => {
    if (!baseStartDate) return alert('请选择开工日期');
    let nodes = [...project.nodesData];
    nodes[0].status = 'current';
    nodes = recalculateGantt(nodes, baseStartDate);
    const patch = { status: '施工中', startDate: baseStartDate, expectedEndDate: nodes[nodes.length-1].endDate, nodesData: nodes, currentNode: 1 };
    if (await save(patch)) {
      setProject({ ...project, ...patch });
      setStartModal(false); setIsEditingNodes(false); setExpandedIdx(0);
    }
  };

  const handleDurationSave = async () => {
    if (!durationModal) return;
    const { majorIdx, subIdx } = durationModal;
    let nodes = [...project.nodesData];
    nodes[majorIdx].subNodes[subIdx].duration = newDuration;
    nodes = recalculateGantt(nodes, project.startDate);
    const patch = { nodesData: nodes, expectedEndDate: nodes[nodes.length-1].endDate };
    if (await save(patch)) { setProject({ ...project, ...patch }); setDurationModal(null); }
    else alert('保存失败');
  };

  const handleDelaySubmit = async () => {
    if (!delayModal || !delayReason.trim()) return alert('请填写延误原因');
    let nodes = [...project.nodesData];
    nodes[delayModal.nodeIdx].delayRecords.push({ days: delayDays, reason: delayReason, createdAt: new Date().toISOString() });
    nodes = recalculateGantt(nodes, project.startDate);
    const patch = { nodesData: nodes, expectedEndDate: nodes[nodes.length-1].endDate };
    if (await save(patch)) { setProject({ ...project, ...patch }); setDelayModal(null); setDelayDays(1); setDelayReason(''); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (tempPhotos.length + files.length > 9) return alert('最多9张');
    setUploading(true);
    const arr = [...tempPhotos];
    for (const file of files) {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('path', `project_records/${id}/${subNodeModal?.majorIdx}_${subNodeModal?.subIdx}_${Date.now()}.${file.name.split('.').pop()}`);
      try {
        const r = await fetch('/api/upload', { method: 'POST', headers: { 'x-user-role': userRole }, body: fd });
        const d = await r.json();
        if (d.fileID) arr.push(d.fileID);
      } catch {}
    }
    setTempPhotos(arr); setUploading(false);
  };

  const handleSubNodeSubmit = async () => {
    if (!subNodeModal) return;
    if (tempPhotos.length === 0) return alert('请先上传现场影像');
    const { majorIdx, subIdx } = subNodeModal;
    let nodes = [...project.nodesData];
    const sub = nodes[majorIdx].subNodes[subIdx];
    const nowStr = new Date().toISOString().split('T')[0];
    sub.status = 'completed';
    if (!sub.actualStartDate) sub.actualStartDate = nowStr;
    sub.actualEndDate = nowStr;
    if (!sub.records) sub.records = [];
    sub.records.push({ remark, photos: tempPhotos, uploader: userName, createdAt: nowStr });

    let newCurrentNode = project.currentNode || 1;
    let newStatus = project.status;
    const allDone = nodes[majorIdx].subNodes.every((s: any) => s.status === 'completed');
    if (allDone) {
      nodes[majorIdx].status = 'completed';
      nodes[majorIdx].actualEndDate = nowStr;
      nodes[majorIdx].endDate = nowStr;
      if (majorIdx + 1 < nodes.length) { nodes[majorIdx+1].status = 'current'; nodes[majorIdx+1].startDate = nowStr; newCurrentNode = majorIdx + 2; }
      nodes = recalculateGantt(nodes, project.startDate);
      if (majorIdx + 1 >= nodes.length) newStatus = '已竣工';
    }
    const patch = { nodesData: nodes, currentNode: newCurrentNode, status: newStatus, expectedEndDate: nodes[nodes.length-1].endDate };
    if (await save(patch)) {
      setProject({ ...project, ...patch });
      setSubNodeModal(null); setTempPhotos([]); setRemark('');
      if (allDone && majorIdx + 1 < nodes.length) setExpandedIdx(majorIdx + 1);
    } else alert('提交失败');
  };

  // --- 节点编辑模式方法 ---
  const enterEditMode = () => {
    setOriginalNodes(JSON.parse(JSON.stringify(project.nodesData)));
    setIsEditingNodes(true);
    setExpandedIdx(null); // 收起所有节点以便查看
  };

  const cancelEditNodes = () => {
    setProject({ ...project, nodesData: originalNodes });
    setIsEditingNodes(false);
  };

  const saveEditedNodes = async () => {
    let nodes = [...project.nodesData];
    // 重算排期
    nodes = recalculateGantt(nodes, project.startDate || new Date().toISOString().split('T')[0]);
    const patch = { nodesData: nodes, expectedEndDate: nodes[nodes.length-1]?.endDate || project.expectedEndDate };
    if (await save(patch)) {
      setProject({ ...project, ...patch });
      setIsEditingNodes(false);
      alert('保存成功，工期已自动重算');
    } else {
      alert('保存失败');
    }
  };

  const handleDragStart = (e: any, idx: number) => {
    setDraggedIdx(idx);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDropMajorNode = (e: any, targetIdx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIdx) return;
    const nodes = [...project.nodesData];
    const [draggedItem] = nodes.splice(draggedIdx, 1);
    nodes.splice(targetIdx, 0, draggedItem);
    setProject({ ...project, nodesData: nodes });
    setDraggedIdx(null);
  };

  const handleAddMajorNode = () => {
    const nodes = [...project.nodesData];
    nodes.push({
      name: "新大阶段", duration: 1, status: "pending", startDate: "", endDate: "", records: [], delayRecords: [],
      subNodes: [{ name: "新工序", duration: 1, status: "pending", startDate: "", endDate: "", records: [] }]
    });
    setProject({ ...project, nodesData: nodes });
  };

  const handleDeleteMajorNode = (idx: number) => {
    if (!confirm('确定删除该大阶段及其所有子工序吗？')) return;
    const nodes = [...project.nodesData];
    nodes.splice(idx, 1);
    setProject({ ...project, nodesData: nodes });
  };

  const handleUpdateMajorNodeName = (idx: number, name: string) => {
    const nodes = [...project.nodesData];
    nodes[idx].name = name;
    setProject({ ...project, nodesData: nodes });
  };

  const handleAddSubNode = (idx: number) => {
    const nodes = [...project.nodesData];
    nodes[idx].subNodes.push({ name: "新工序", duration: 1, status: "pending", startDate: "", endDate: "", records: [] });
    setProject({ ...project, nodesData: nodes });
  };

  const handleDeleteSubNode = (idx: number, sIdx: number) => {
    const nodes = [...project.nodesData];
    nodes[idx].subNodes.splice(sIdx, 1);
    setProject({ ...project, nodesData: nodes });
  };

  const handleUpdateSubNodeName = (idx: number, sIdx: number, name: string) => {
    const nodes = [...project.nodesData];
    nodes[idx].subNodes[sIdx].name = name;
    setProject({ ...project, nodesData: nodes });
  };

  const handleUpdateSubNodeDuration = (idx: number, sIdx: number, duration: number) => {
    const nodes = [...project.nodesData];
    nodes[idx].subNodes[sIdx].duration = Math.max(0, duration);
    setProject({ ...project, nodesData: nodes });
  };


  if (loading) return <MainLayout><div className="p-8 flex items-center justify-center h-64 text-primary-500">加载中...</div></MainLayout>;
  if (!project) return <MainLayout><div className="p-8 text-center py-20 text-primary-400">找不到项目数据</div></MainLayout>;

  const daysElapsed = project.startDate && project.status !== '未开工'
    ? Math.max(0, Math.ceil((Date.now() - new Date(project.startDate).getTime()) / 86400000))
    : 0;

  const canEdit = ['admin', 'manager'].includes(userRole);

  const healthStyle = (h: string) => {
    if (h === '正常') return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (h === '预警') return 'text-amber-600 bg-amber-50 border-amber-200';
    if (h === '严重延期') return 'text-rose-600 bg-rose-50 border-rose-200';
    return 'text-zinc-500 bg-zinc-50 border-zinc-200';
  };

  return (
    <MainLayout>
      <div className="p-4 md:p-8 max-w-[1100px] mx-auto space-y-6">
        <button onClick={() => router.back()} className="flex items-center text-sm text-primary-500 hover:text-primary-900 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> 返回列表
        </button>

        {/* 顶部概览 */}
        <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-2xl font-bold text-primary-900">{project.address || '未知地址'}</h1>
              </div>
              <div className="mb-5">
                <CustomerInfo name={project.customer} phone={project.phone} customerNo={project.customerNo || project.id} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                <div><p className="text-xs text-primary-400 mb-1">实际开工日期</p><p className="text-sm font-medium text-primary-900">{project.startDate || '未开工'}</p></div>
                <div><p className="text-xs text-primary-400 mb-1">预计完工日期</p><p className="text-sm font-medium text-primary-900">{project.expectedEndDate || '-'}</p></div>
                <div><p className="text-xs text-primary-400 mb-1">项目经理</p><p className="text-sm font-medium text-primary-900">{project.manager || '未分配'}</p></div>
                <div><p className="text-xs text-primary-400 mb-1">已耗工期</p><p className="text-sm font-bold text-amber-600">{daysElapsed} <span className="text-xs font-normal">天</span></p></div>
              </div>
            </div>
            <div className="flex flex-col gap-2 shrink-0 w-full md:w-auto mt-4 md:mt-0">
              <div className="flex flex-wrap gap-2">
                {/* 跳转快捷按钮 */}
                <button onClick={() => project.leadId ? router.push(`/leads/${project.leadId}`) : alert('该项目无关联客户线索')} className="flex items-center justify-center px-4 py-2 bg-primary-50 text-primary-700 rounded-full hover:bg-primary-100 text-sm font-bold border border-primary-200 transition-colors flex-1 md:flex-none">
                  <User className="w-4 h-4 mr-2" /> 客户档案
                </button>
                <button onClick={() => quoteId ? router.push(`/quotes/${quoteId}`) : (project.leadId ? router.push(`/quotes/new?leadId=${project.leadId}`) : alert('该项目无关联客户线索'))} className="flex items-center justify-center px-4 py-2 bg-primary-50 text-primary-700 rounded-full hover:bg-primary-100 text-sm font-bold border border-primary-200 transition-colors flex-1 md:flex-none">
                  <FileSignature className="w-4 h-4 mr-2" /> 报价明细
                </button>
                {canEdit && (
                  <button onClick={() => { setEditStartDate(project.startDate || ''); setEditManager(project.manager || ''); setEditProjectModal(true); }} className="flex items-center justify-center px-4 py-2 bg-primary-50 text-primary-700 rounded-full hover:bg-primary-100 text-sm font-bold border border-primary-200 transition-colors flex-1 md:flex-none">
                    <Edit2 className="w-4 h-4 mr-2" /> 编辑信息
                  </button>
                )}
              </div>

              {project.status === '未开工' && (
                <button onClick={() => setStartModal(true)} className="flex items-center justify-center px-4 py-2 mt-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 text-sm font-bold shadow-sm w-full">
                  <PlayCircle className="w-4 h-4 mr-2" /> 准备开工
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 施工节点 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧主要区域：施工动态 */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-primary-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-primary-100 flex justify-between items-start bg-primary-50/30">
            <h2 className="text-base font-bold text-primary-900 flex items-center gap-2 mt-1">
              <HardHat className="w-5 h-5 text-primary-400" /> 施工动态
            </h2>
            <div className="flex flex-col gap-2 items-end">
              <div className={`px-3 py-1 rounded-full text-xs font-bold border ${healthStyle(project.health)}`}>
                {project.health || '正常'}
              </div>
              {canEdit && (
                isEditingNodes ? (
                  <div className="flex gap-2">
                    <button onClick={cancelEditNodes} className="px-3 py-1.5 text-xs font-bold bg-white text-primary-600 rounded-full border border-primary-200 hover:bg-primary-50">取消</button>
                    <button onClick={saveEditedNodes} className="px-3 py-1.5 text-xs font-bold bg-primary-900 text-white rounded-full hover:bg-primary-800 shadow-sm">保存修改</button>
                  </div>
                ) : (
                  <button onClick={enterEditMode} className="px-3 py-1.5 text-xs font-bold bg-white text-primary-700 rounded-full border border-primary-200 hover:bg-primary-50 flex items-center gap-1 shadow-sm transition-colors">
                    <Edit2 className="w-3 h-3" /> 编辑工序
                  </button>
                )
              )}
            </div>
          </div>
          <div className="p-6">
            <div className="relative">
              <div className="absolute left-6 top-8 bottom-8 w-px bg-primary-100"></div>
              
              {isEditingNodes ? (
                <div className="space-y-4 relative z-10">
                  {project.nodesData.map((node: any, idx: number) => (
                    <div 
                      key={idx} 
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDropMajorNode(e, idx)}
                      className={`bg-white border rounded-xl p-5 flex gap-4 items-start shadow-sm transition-all ${draggedIdx === idx ? 'opacity-50 border-primary-500' : 'border-primary-200 hover:border-primary-300'}`}
                    >
                      <div className="mt-1 cursor-grab text-primary-300 hover:text-primary-600 active:cursor-grabbing">
                        <Menu className="w-5 h-5"/>
                      </div>
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold shrink-0">{idx + 1}</span>
                          <input 
                            value={node.name} 
                            onChange={(e) => handleUpdateMajorNodeName(idx, e.target.value)} 
                            className="font-bold text-base text-primary-900 border-b border-dashed border-primary-300 focus:border-primary-500 outline-none bg-transparent px-1 py-0.5 flex-1 min-w-0" 
                            placeholder="大阶段名称"
                          />
                          <button onClick={() => handleDeleteMajorNode(idx)} className="text-rose-400 hover:text-rose-600 p-1.5 shrink-0" title="删除该阶段">
                            <X className="w-4 h-4"/>
                          </button>
                        </div>
                        <div className="pl-3 border-l-2 border-primary-100 space-y-2 ml-3">
                          {(node.subNodes || []).map((sub: any, sIdx: number) => (
                            <div key={sIdx} className="flex items-center gap-3 bg-zinc-50 border border-zinc-100 p-2.5 rounded-lg group">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary-300 shrink-0"></div>
                              <input 
                                value={sub.name} 
                                onChange={(e) => handleUpdateSubNodeName(idx, sIdx, e.target.value)} 
                                className="flex-1 text-sm bg-transparent border-b border-dashed border-primary-200 focus:border-primary-400 outline-none px-1 py-0.5 text-primary-800 min-w-0" 
                                placeholder="工序名称"
                              />
                              <div className="flex items-center gap-1.5 bg-white border border-primary-200 rounded-md px-2 py-1 shadow-sm shrink-0">
                                <input 
                                  type="number" 
                                  min="0"
                                  value={sub.duration} 
                                  onChange={(e) => handleUpdateSubNodeDuration(idx, sIdx, Number(e.target.value))} 
                                  className="w-10 text-sm text-center outline-none font-medium text-primary-900" 
                                />
                                <span className="text-xs text-primary-500 font-medium">天</span>
                              </div>
                              <button onClick={() => handleDeleteSubNode(idx, sIdx)} className="text-primary-300 hover:text-rose-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" title="删除工序">
                                <X className="w-4 h-4"/>
                              </button>
                            </div>
                          ))}
                          <button onClick={() => handleAddSubNode(idx)} className="text-xs text-primary-600 bg-primary-50 hover:bg-primary-100 border border-primary-100 px-3 py-2 rounded-lg flex items-center gap-1.5 mt-3 transition-colors font-medium">
                            <Plus className="w-3.5 h-3.5"/> 添加小工序
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button onClick={handleAddMajorNode} className="w-full py-4 border-2 border-dashed border-primary-200 text-primary-600 rounded-xl hover:bg-primary-50 hover:border-primary-300 hover:text-primary-700 flex items-center justify-center gap-2 font-bold transition-all bg-white shadow-sm mt-6">
                    <Plus className="w-5 h-5" /> 添加大阶段
                  </button>
                </div>
              ) : (
                <div className="space-y-5 relative z-10">
                  {project.nodesData.map((node: any, idx: number) => {
                    const done = node.status === 'completed';
                    const active = node.status === 'current';
                    const expanded = expandedIdx === idx;
                    return (
                      <div key={idx} className="relative flex gap-4">
                        <div className="shrink-0 mt-1">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 border-white shadow-sm
                            ${done ? 'bg-primary-900 text-white' : active ? 'bg-amber-500 text-white ring-4 ring-amber-100 border-none' : 'bg-primary-100 text-primary-400'}`}>
                            {done ? <CheckCircle2 className="w-6 h-6" /> : active ? <PlayCircle className="w-6 h-6" /> : <span className="font-mono font-bold">{idx+1}</span>}
                          </div>
                        </div>
                        <div className={`flex-1 rounded-xl border overflow-hidden
                          ${active ? 'border-amber-200 shadow-md' : done ? 'border-primary-200' : 'border-primary-100 bg-zinc-50/50'}`}>
                          {/* 节点头 */}
                          <div className="px-5 py-4 cursor-pointer flex justify-between items-center bg-white hover:bg-zinc-50/30 transition-colors"
                            onClick={() => setExpandedIdx(expanded ? null : idx)}>
                            <div>
                              <h3 className={`text-base font-bold mb-0.5 ${active ? 'text-amber-600' : done ? 'text-primary-900' : 'text-primary-400'}`}>{node.name}</h3>
                              <p className="text-xs text-primary-400 font-mono">
                                {done && `已完成：${node.startDate} ~ ${node.actualEndDate || node.endDate}`}
                                {active && `进行中 | 预计开工：${node.startDate} | 预计完工：${node.endDate}`}
                                {!done && !active && `未开始 | 预计：${node.startDate} ~ ${node.endDate}`}
                              </p>
                            </div>
                            <ChevronDown className={`w-5 h-5 text-primary-300 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                          </div>

                          {/* 展开内容 */}
                          {expanded && (
                            <div className="px-5 pb-5 pt-3 border-t border-primary-50 bg-zinc-50/20">
                              {/* 子工序列表 */}
                              <p className="text-xs font-medium text-primary-400 mb-3">施工工序</p>
                              <div className="space-y-2 mb-6">
                                {(node.subNodes || []).map((sub: any, si: number) => {
                                  const subDone = sub.status === 'completed';
                                  let timeStr = '';
                                  if (subDone) timeStr = `实际完工：${sub.actualEndDate || '-'}`;
                                  else timeStr = `预计：${sub.startDate || '-'} ~ ${sub.endDate || '-'}`;
                                  return (
                                    <div key={si} className="relative flex items-center gap-3 bg-white border border-primary-100 rounded-lg px-4 py-3 hover:border-primary-300 transition-colors cursor-pointer shadow-sm"
                                      onClick={() => {
                                        if (node.status === 'pending') return alert('前置节点尚未完工，当前阶段未解锁');
                                        setSubNodeModal({ majorIdx: idx, subIdx: si });
                                      }}>
                                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${subDone ? 'bg-primary-900' : 'bg-primary-200'}`}></div>
                                      <div className="flex-1 min-w-0">
                                        <span className={`text-sm font-medium ${subDone ? 'text-primary-900' : 'text-primary-700'}`}>{sub.name}</span>
                                        <span className="text-[11px] text-primary-400 font-mono ml-3">{timeStr}</span>
                                      </div>
                                      {!subDone && active && canEdit && (
                                        <button onClick={(e) => { e.stopPropagation(); setDurationModal({ majorIdx: idx, subIdx: si, cur: Number(sub.duration)||0 }); setNewDuration(Number(sub.duration)||0); }}
                                          className="text-[11px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded border border-amber-100 flex items-center shrink-0">
                                          {sub.duration}天 <Edit2 className="w-2.5 h-2.5 ml-0.5" />
                                        </button>
                                      )}
                                      {subDone && <span className="text-[10px] bg-primary-50 text-primary-600 px-2 py-0.5 rounded font-bold shrink-0">已完成</span>}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* 延误记录 */}
                              <div className="mb-4">
                                <div className="flex justify-between items-center mb-2">
                                  <p className="text-xs font-medium text-primary-400">延误 / 停工记录</p>
                                  {(active || node.status === 'pending') && project.status !== '未开工' && canEdit && (
                                    <button onClick={() => setDelayModal({ nodeIdx: idx })}
                                      className="text-xs text-rose-600 bg-rose-50 px-2 py-1 rounded border border-rose-100 flex items-center">
                                      <AlertCircle className="w-3 h-3 mr-1" /> 记录延误
                                    </button>
                                  )}
                                </div>
                                {node.delayRecords?.length > 0 ? (
                                  <div className="space-y-1.5">
                                    {node.delayRecords.map((d: any, di: number) => (
                                      <div key={di} className="bg-rose-50 px-3 py-2 rounded border border-rose-100 flex justify-between text-xs">
                                        <span className="text-rose-700 font-medium">停工延误 {d.days} 天</span>
                                        <span className="text-rose-400">{d.reason}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : <p className="text-xs text-primary-300">暂无延误记录</p>}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          </div>

          {/* 右侧边栏：项目资料 */}
          <div className="lg:col-span-1">
            <CustomerDocuments
              leadId={project.leadId || ''}
              canUpload={userRole === 'admin' || userRole === 'manager'}
              uploaderName={userName}
            />
          </div>
        </div>

        {/* 开工弹窗 */}
        {startModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-primary-100 flex justify-between items-center">
                <h2 className="text-base font-bold text-primary-900">准备开工</h2>
                <button onClick={() => { setStartModal(false); }}><X className="w-5 h-5 text-primary-400" /></button>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-bold text-primary-900 mb-2">项目总开工日期 <span className="text-rose-500">*</span></label>
                  <input type="date" value={baseStartDate} onChange={e => setBaseStartDate(e.target.value)}
                    className="w-full p-3 border border-primary-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" />
                  <p className="text-xs text-primary-400 mt-1.5">系统将自动按 T+N 算法推算所有工序的预计开/完工日期，自动跳过周末及法定节假日。</p>
                </div>
                <button onClick={handleStartProject} className="w-full py-3 bg-primary-900 text-white rounded-xl font-bold hover:bg-primary-800 transition-colors mt-4 shadow-md">
                  确认，正式开工
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 修改工期弹窗 */}
        {durationModal && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
              <h3 className="text-base font-bold text-primary-900 mb-4">
                修改「{project.nodesData[durationModal.majorIdx].subNodes[durationModal.subIdx].name}」工期
              </h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-primary-700 mb-2">工序天数（0 表示跳过此工序）</label>
                <input type="number" min="0" value={newDuration} onChange={e => setNewDuration(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-primary-50 border border-primary-200 rounded-lg text-primary-900 font-medium focus:outline-none focus:border-primary-500" />
              </div>
              <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded border border-amber-100 mb-5">
                修改后系统将自动重新推算后续所有工序的预计开/完工日期。
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDurationModal(null)} className="flex-1 py-2.5 bg-primary-50 text-primary-600 rounded-lg font-medium">取消</button>
                <button onClick={handleDurationSave} className="flex-1 py-2.5 bg-primary-900 text-white rounded-lg font-bold">保存并重算</button>
              </div>
            </div>
          </div>
        )}

        {/* 延误弹窗 */}
        {delayModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-rose-100 flex justify-between items-center bg-rose-50">
                <h2 className="text-base font-bold text-rose-900 flex items-center"><AlertCircle className="w-4 h-4 mr-2" />记录停工 / 延误</h2>
                <button onClick={() => setDelayModal(null)}><X className="w-5 h-5 text-rose-400" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-primary-900 mb-2">延误天数</label>
                  <input type="number" min="1" value={delayDays} onChange={e => setDelayDays(parseInt(e.target.value)||1)}
                    className="w-full p-3 border border-primary-200 rounded-xl focus:outline-none focus:border-rose-400" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-primary-900 mb-2">延误原因</label>
                  <textarea rows={3} value={delayReason} onChange={e => setDelayReason(e.target.value)}
                    placeholder="例如：业主中途修改方案、材料未到场..."
                    className="w-full p-3 border border-primary-200 rounded-xl focus:outline-none focus:border-rose-400 text-sm" />
                </div>
                <button onClick={handleDelaySubmit} className="w-full py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700">
                  确认记录并重算工期
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 子工序档案弹窗 */}
        {subNodeModal && (() => {
          const { majorIdx, subIdx } = subNodeModal;
          const sub = project.nodesData[majorIdx].subNodes[subIdx];
          const isDone = sub.status === 'completed';
          const canOperate = ['admin','manager','worker'].includes(userRole);
          return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" style={{zIndex:9999}}>
              <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                <div className="px-6 py-4 border-b border-primary-100 flex justify-between items-center shrink-0">
                  <div>
                    <h2 className="text-base font-bold text-primary-900">{sub.name}</h2>
                    <p className="text-xs text-primary-400 mt-0.5 font-mono">
                      {isDone ? `实际完工：${sub.actualEndDate || '-'}` : `预计：${sub.startDate || '-'} ~ ${sub.endDate || '-'}`}
                    </p>
                  </div>
                  <button onClick={() => { setSubNodeModal(null); setTempPhotos([]); setRemark(''); }}><X className="w-5 h-5 text-primary-400" /></button>
                </div>
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                  {/* 历史影像档案 */}
                  {sub.records?.length > 0 && (
                    <div className="space-y-5">
                      {sub.records.map((rec: any, ri: number) => (
                        <div key={ri} className="border-b border-primary-100 pb-5 last:border-0 last:pb-0">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-sm font-bold text-primary-900">{rec.uploader}</span>
                            <span className="text-xs text-primary-400">{rec.createdAt}</span>
                          </div>
                          {rec.remark && <p className="text-sm text-primary-700 mb-3">{rec.remark}</p>}
                          {rec.photos?.length > 0 && (
                            <div className="grid grid-cols-3 gap-2">
                              {rec.photos.map((p: string, pi: number) => (
                                <img key={pi} src={p.startsWith('cloud://') ? `https://${p.split('cloud://')[1].split('.')[0]}.tcb.qcloud.la/${p.split('/').slice(3).join('/')}` : p}
                                  className="w-full aspect-square object-cover rounded-lg border border-primary-100" alt="现场影像" />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 上传区（未完成时显示） */}
                  {canOperate && !isDone && (
                    <div className="bg-zinc-50 rounded-xl p-4 border border-primary-100">
                      <label className="block text-sm font-bold text-primary-900 mb-3">上传现场影像</label>
                      <div className="grid grid-cols-4 gap-2 mb-4">
                        {tempPhotos.map((p, pi) => (
                          <div key={pi} className="relative aspect-square rounded-lg overflow-hidden border border-primary-200">
                            <img src={p.startsWith('cloud://') ? `https://${p.split('cloud://')[1].split('.')[0]}.tcb.qcloud.la/${p.split('/').slice(3).join('/')}` : p} className="w-full h-full object-cover" alt="" />
                            <button onClick={() => setTempPhotos(tempPhotos.filter((_,i)=>i!==pi))} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5"><X className="w-3 h-3" /></button>
                          </div>
                        ))}
                        <label className="aspect-square bg-white border-2 border-dashed border-primary-200 rounded-lg flex flex-col items-center justify-center text-primary-400 hover:bg-primary-50 cursor-pointer relative">
                          {uploading ? <span className="text-xs">上传中...</span> : <><Camera className="w-5 h-5 mb-1" /><span className="text-xs">上传影像</span></>}
                          <input type="file" multiple accept="image/*,video/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} />
                        </label>
                      </div>
                      <label className="block text-sm font-medium text-primary-700 mb-2">现场说明</label>
                      <textarea rows={2} value={remark} onChange={e => setRemark(e.target.value)}
                        placeholder="填写施工情况说明..."
                        className="w-full p-3 border border-primary-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 bg-white mb-4" />
                      <button onClick={handleSubNodeSubmit} className="w-full py-3 bg-primary-900 text-white rounded-xl font-bold hover:bg-primary-800">
                        提交现场记录
                      </button>
                    </div>
                  )}

                  {isDone && sub.records?.length === 0 && (
                    <div className="py-10 text-center text-primary-400 text-sm">暂无施工档案</div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* 编辑工地信息弹窗 */}
        {editProjectModal && (
          <div className="fixed inset-0 bg-primary-900/20 backdrop-blur-sm flex items-center justify-center p-4" style={{zIndex:9999}}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
              <h3 className="text-lg font-bold text-primary-900 mb-6">编辑工地信息</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-primary-900 mb-2">实际开工日期</label>
                  <input 
                    type="date" 
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full px-4 py-3 bg-primary-50/50 border border-primary-200 rounded-lg text-primary-900 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-primary-900 mb-2">项目经理</label>
                  <input 
                    type="text" 
                    placeholder="输入项目经理姓名"
                    value={editManager}
                    onChange={(e) => setEditManager(e.target.value)}
                    className="w-full px-4 py-3 bg-primary-50/50 border border-primary-200 rounded-lg text-primary-900 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                  />
                </div>
                <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded border border-amber-100">
                  提示：修改开工日期后，系统将自动重新推算所有相关工序的开始和结束日期（自动跳过周末及法定节假日）。
                </p>
              </div>
              <div className="flex gap-3 mt-8">
                <button 
                  onClick={() => setEditProjectModal(false)}
                  className="flex-1 py-3 bg-primary-50 text-primary-600 rounded-lg font-bold hover:bg-primary-100 transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={handleEditProjectSave}
                  className="flex-1 py-3 bg-primary-900 text-white rounded-lg font-bold shadow-md shadow-primary-900/10 hover:bg-primary-800 transition-colors"
                >
                  保存修改
                </button>
              </div>
              <div className="mt-6 pt-4 border-t border-primary-100">
                <button 
                  onClick={handleDeleteProject}
                  className="w-full py-3 bg-rose-50 text-rose-600 rounded-lg font-bold hover:bg-rose-100 transition-colors flex justify-center items-center"
                >
                  删除此工地记录
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
