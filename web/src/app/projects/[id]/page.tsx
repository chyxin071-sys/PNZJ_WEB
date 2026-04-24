"use client";

import { useParams, useRouter } from "next/navigation";
import MainLayout from "../../../components/MainLayout";
import { ArrowLeft, CheckCircle2, Clock, AlertTriangle, PlayCircle, HardHat, FileText, ChevronDown, Camera, X, AlertCircle, Edit2, Menu, Plus, User, FileSignature } from "lucide-react";
import CustomerInfo from "../../../components/CustomerInfo";
import CustomerDocuments from "../../../components/CustomerDocuments";
import { useState, useEffect } from "react";
import { getNextWorkingDay, calculateEndDate, formatDate } from "../../../lib/date";
import DatePicker from "../../../components/DatePicker";

// 8大节点标准模板
const TEMPLATE_NODES = [
  { name: "开工", duration: 10, subNodes: [{name:"开工交底",duration:1},{name:"成品保护",duration:1},{name:"墙体拆除",duration:2},{name:"垃圾清运",duration:1},{name:"设备定位",duration:1},{name:"砌筑新建",duration:2},{name:"墙体批荡",duration:1},{name:"阶段验收",duration:1}] },
  { name: "水电", duration: 9,  subNodes: [{name:"水电交底",duration:1},{name:"开槽布管",duration:3},{name:"排污下水",duration:1},{name:"线管敷设",duration:2},{name:"打压测试",duration:1},{name:"阶段验收",duration:1}] },
  { name: "木工", duration: 10, subNodes: [{name:"木工作交底",duration:1},{name:"吊顶龙骨",duration:3},{name:"石膏板封样",duration:2},{name:"背景墙打底",duration:2},{name:"隔墙制作",duration:1},{name:"阶段验收",duration:1}] },
  { name: "瓦工", duration: 16, subNodes: [{name:"泥瓦交底",duration:1},{name:"下水管包管",duration:1},{name:"防水涂刷",duration:2},{name:"闭水试验",duration:2},{name:"地面找平",duration:2},{name:"瓷砖铺贴",duration:6},{name:"瓷砖美缝",duration:1},{name:"阶段验收",duration:1}] },
  { name: "墙面", duration: 14, subNodes: [{name:"油漆交底",duration:1},{name:"基层找平",duration:2},{name:"挂网防裂",duration:1},{name:"腻子批刮",duration:4},{name:"乳胶漆涂刷",duration:5},{name:"阶段验收",duration:1}] },
  { name: "定制", duration: 12, subNodes: [{name:"复尺测量",duration:1},{name:"厨卫吊顶",duration:1},{name:"木地板铺装",duration:2},{name:"木门安装",duration:1},{name:"柜体安装",duration:4},{name:"台面安装",duration:1},{name:"五金挂件",duration:2},{name:"阶段验收",duration:1}] },
  { name: "软装", duration: 6,  subNodes: [{name:"软装进场交底",duration:1},{name:"窗帘壁纸",duration:1},{name:"灯具安装",duration:1},{name:"开关面板",duration:1},{name:"卫浴安装",duration:1},{name:"大家电进场",duration:1},{name:"家具进场",duration:1},{name:"阶段验收",duration:1}] },
  { name: "交付", duration: 4,  subNodes: [{name:"交付启动交底",duration:1},{name:"拓荒保洁",duration:1},{name:"室内空气治理",duration:1},{name:"钥匙移交/合影留念",duration:1},{name:"竣工验收",duration:1}] },
];

function formatDateRange(start: string, end: string) {
  if (!start || !end) return `${start || '-'} ~ ${end || '-'}`;
  const startParts = start.split('-');
  const endParts = end.split('-');
  if (startParts.length !== 3 || endParts.length !== 3) return `${start} ~ ${end}`;
  if (startParts[0] === endParts[0]) {
    return `${start} ~ ${endParts[1]}-${endParts[2]}`;
  }
  return `${start} ~ ${end}`;
}

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
  const [users, setUsers] = useState<any[]>([]);
  const [managerDropdownOpen, setManagerDropdownOpen] = useState(false);

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
  const [editDelayReason, setEditDelayReason] = useState('');

  // 锁定背景滚动
  useEffect(() => {
    const hasOpenModal = startModal || subNodeModal || delayModal || durationModal || editProjectModal;
    if (hasOpenModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [startModal, subNodeModal, delayModal, durationModal, editProjectModal]);

  // 编辑节点状态
  const [isEditingNodes, setIsEditingNodes] = useState(false);
  const [originalNodes, setOriginalNodes] = useState<any[]>([]);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('pnzj_user') || localStorage.getItem('user') || '{}');
      setUserRole(u.role || 'admin');
      setUserName(u.name || '未知');
    } catch {}
    fetch('/api/employees').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setUsers(data);
    }).catch(() => {});
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
          subNodes: t.subNodes.map(s => ({ name: s.name, duration: s.duration, status: 'pending', startDate: '', endDate: '', actualStartDate: '', actualEndDate: '', records: [] })),
          status: 'pending', startDate: '', endDate: '', actualStartDate: '', actualEndDate: '', records: [], delayRecords: [],
        }));
      } else {
        nodes = nodes.map((n: any, i: number) => ({
          ...n,
          duration: n.duration || TEMPLATE_NODES[i]?.duration || 5,
          subNodes: (n.subNodes || []).map((s: any) => typeof s === 'string' ? { name: s, duration: 1, status: 'pending', startDate: '', endDate: '', actualStartDate: '', actualEndDate: '', records: [] } : s),
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
    let nodes = [...project.nodesData];

    // 如果开工日期有变化，且不为空，才重新排期
    if (editStartDate && editStartDate !== project.startDate) {
      nodes = recalculateGantt(nodes, editStartDate);
    }

    const patch: any = {
      manager: editManager,
      nodesData: nodes,
      expectedEndDate: nodes.length > 0 ? nodes[nodes.length-1].endDate : ''
    };
    if (editStartDate) {
      patch.startDate = editStartDate;
    }

    if (await save(patch)) {
      setProject({ ...project, ...patch });
      setEditProjectModal(false);

      // 写入系统跟进记录
      if (project.leadId) {
        let changeLog = '';
        if (editManager !== project.manager && editStartDate && editStartDate !== project.startDate) {
          // 两个都改了
          changeLog = `调整了施工排期\n项目经理：${project.manager || '未分配'} → ${editManager}\n开工日期：${project.startDate || '未定'} → ${editStartDate}\n预计完工：${patch.expectedEndDate}`;
        } else if (editManager !== project.manager) {
          // 只改项目经理
          changeLog = `更换了项目经理\n${project.manager || '未分配'} → ${editManager}`;
        } else if (editStartDate && editStartDate !== project.startDate) {
          // 只改开工日期
          changeLog = `调整了施工排期\n开工日期：${project.startDate || '未定'} → ${editStartDate}\n预计完工：${patch.expectedEndDate}`;
        }

        if (changeLog) {
          await fetch('/api/followUps', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              leadId: project.leadId,
              content: changeLog,
              method: '系统记录',
              createdBy: userName
            })
          });
        }
      }
    } else {
      alert('保存失败');
    }
  };

  const handleStartProject = async () => {
    if (!baseStartDate) return alert('请选择开工日期');
    let nodes = [...project.nodesData];
    nodes[0].status = 'current';
    nodes[0].actualStartDate = baseStartDate;
    if (nodes[0].subNodes && nodes[0].subNodes.length > 0) {
      nodes[0].subNodes[0].status = 'current';
      nodes[0].subNodes[0].actualStartDate = baseStartDate;
    }
    nodes = recalculateGantt(nodes, baseStartDate);
    const patch = { status: '施工中', startDate: baseStartDate, expectedEndDate: nodes[nodes.length-1].endDate, nodesData: nodes, currentNode: 1 };
    if (await save(patch)) {
      setProject({ ...project, ...patch });
      setStartModal(false); setIsEditingNodes(false); setExpandedIdx(0);
      
      // 同步到跟进记录
      if (project.leadId) {
        await fetch('/api/followUps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId: project.leadId,
            content: `工地正式开工，预计完工日期：${patch.expectedEndDate}`,
            method: '系统记录',
            createdBy: userName
          })
        });
      }
    }
  };

  const handleDurationSave = async () => {
    if (!durationModal) return;
    const { majorIdx, subIdx } = durationModal;
    let nodes = [...project.nodesData];
    const oldDuration = nodes[majorIdx].subNodes[subIdx].duration;
    nodes[majorIdx].subNodes[subIdx].duration = newDuration;
    nodes = recalculateGantt(nodes, project.startDate);
    const patch = { nodesData: nodes, expectedEndDate: nodes[nodes.length-1].endDate };
    if (await save(patch)) {
      setProject({ ...project, ...patch });
      setDurationModal(null);

      // 写入系统跟进记录
      if (project.leadId) {
        const majorNode = nodes[majorIdx];
        const subNode = majorNode.subNodes[subIdx];
        await fetch('/api/followUps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId: project.leadId,
            content: `调整了施工排期\n【${majorNode.name} - ${subNode.name}】\n工期：${oldDuration}天 → ${newDuration}天\n开工：${subNode.startDate}\n完工：${subNode.endDate}\n预计总完工：${patch.expectedEndDate}`,
            method: '系统记录',
            createdBy: userName
          })
        });
      }
    } else {
      alert('保存失败');
    }
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
    
    const isFirst = subIdx === 0;
    const isLast = subIdx === nodes[majorIdx].subNodes.length - 1;

    if (!sub.actualStartDate) sub.actualStartDate = nowStr;
    sub.actualEndDate = nowStr;
    if (!sub.records) sub.records = [];
    sub.records.push({ remark, photos: tempPhotos, uploader: userName, createdAt: nowStr });

    if (isFirst || isLast) {
      // 首尾特殊工序进入待签字状态
      sub.status = 'awaiting_signature';
      alert('已提交现场记录！该特殊工序现已进入“待签字”状态，请分享给客户确认。');
    } else {
      // 中间工序直接完成
      sub.status = 'completed';
      
      // 检查中间工序是否全部完成
      let allMiddleDone = true;
      for (let i = 1; i < nodes[majorIdx].subNodes.length - 1; i++) {
        if (nodes[majorIdx].subNodes[i].status !== 'completed') {
          allMiddleDone = false;
          break;
        }
      }
      // 如果中间全部完成，激活最后一个验收工序
      if (allMiddleDone) {
        const lastNode = nodes[majorIdx].subNodes[nodes[majorIdx].subNodes.length - 1];
        if (lastNode.status === 'pending') {
          lastNode.status = 'current';
          if (!lastNode.actualStartDate) lastNode.actualStartDate = nowStr;
        }
      }
    }

    // 动态排期重算
    nodes = recalculateGantt(nodes, project.startDate);

    let newCurrentNode = project.currentNode || 1;
    let newStatus = project.status;
    const allDone = nodes[majorIdx].subNodes.every((s: any) => s.status === 'completed');
    
    if (allDone) {
      nodes[majorIdx].status = 'completed';
      nodes[majorIdx].actualEndDate = nowStr;
      if (!nodes[majorIdx].actualStartDate) nodes[majorIdx].actualStartDate = nodes[majorIdx].subNodes[0]?.actualStartDate || nowStr;
      
      if (majorIdx + 1 < nodes.length) { 
        nodes[majorIdx+1].status = 'current'; 
        nodes[majorIdx+1].actualStartDate = nowStr; 
        newCurrentNode = majorIdx + 2; 

        // 自动激活下一个大节点的第一个未完成子工序
        const nextSubNodes = nodes[majorIdx + 1].subNodes;
        if (nextSubNodes && nextSubNodes.length > 0) {
          if (nextSubNodes[0].status !== 'completed') {
            nextSubNodes[0].status = 'current';
            if (!nextSubNodes[0].actualStartDate) nextSubNodes[0].actualStartDate = nowStr;
          }
        }
      }
      nodes = recalculateGantt(nodes, project.startDate);
      if (majorIdx + 1 >= nodes.length) newStatus = '已竣工';
    }
    
    const patch = { nodesData: nodes, currentNode: newCurrentNode, status: newStatus, expectedEndDate: nodes[nodes.length-1].endDate };
    if (await save(patch)) {
      setProject({ ...project, ...patch });
      setSubNodeModal(null); setTempPhotos([]); setRemark('');
      if (allDone && majorIdx + 1 < nodes.length) setExpandedIdx(majorIdx + 1);

      // 写入跟进记录
      if (project.leadId) {
        let content = `工地进度更新：【${nodes[majorIdx].name}】阶段的【${sub.name}】现场记录已提交。`;
        if (isFirst || isLast) {
          content += `\n目前正在等待客户签字确认。`;
        }
        if (allDone) {
          content += `\n此工序完成标志着【${nodes[majorIdx].name}】大阶段已全部验收通过。`;
        }
        await fetch('/api/followUps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId: project.leadId,
            content,
            method: '系统记录',
            createdBy: userName
          })
        });
      }
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
    const expectedEndDate = nodes[nodes.length-1]?.endDate || project.expectedEndDate;
    const patch = { nodesData: nodes, expectedEndDate };
    if (await save(patch)) {
      setProject({ ...project, ...patch });
      setIsEditingNodes(false);
      alert('保存成功，工期已自动重算');
      
      if (project.leadId) {
        const startStr = project.startDate || '未定';
        await fetch('/api/followUps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId: project.leadId,
            content: `修改并重算了工地排期\n预计开工：${startStr}\n预计完工：${expectedEndDate}`,
            method: '系统记录',
            createdBy: currentUser?.name || '系统'
          })
        });
      }
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

  const handleSaveDelayReason = async () => {
    if (!subNodeModal || !editDelayReason.trim()) return alert('请填写逾期原因');
    const { majorIdx, subIdx } = subNodeModal;
    let nodes = [...project.nodesData];
    const sub = nodes[majorIdx].subNodes[subIdx];
    if (!sub.acceptanceRecord) sub.acceptanceRecord = {};
    sub.acceptanceRecord.delayReason = editDelayReason;
    
    const patch = { nodesData: nodes };
    if (await save(patch)) { 
      setProject({ ...project, ...patch }); 
      setEditDelayReason('');
      alert('逾期原因已保存');
    } else {
      alert('保存失败');
    }
  };

  const handleAddMajorNode = () => {
    const nodes = [...project.nodesData];
    nodes.push({
      name: "新大阶段", duration: 1, status: "pending", startDate: "", endDate: "", records: [], delayRecords: [],
      subNodes: [
        { name: "阶段交底", duration: 1, status: "pending", startDate: "", endDate: "", records: [] },
        { name: "阶段验收", duration: 1, status: "pending", startDate: "", endDate: "", records: [] }
      ]
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
    const subNodes = nodes[idx].subNodes;
    if (subNodes.length >= 2) {
      // 插入到验收（最后一个）之前
      const lastSub = subNodes.pop();
      subNodes.push({ name: "新工序", duration: 1, status: "pending", startDate: "", endDate: "", records: [] });
      subNodes.push(lastSub);
    } else {
      subNodes.push({ name: "新工序", duration: 1, status: "pending", startDate: "", endDate: "", records: [] });
    }
    setProject({ ...project, nodesData: nodes });
  };

  const handleDeleteSubNode = (idx: number, sIdx: number) => {
    const nodes = [...project.nodesData];
    const subNodes = nodes[idx].subNodes;
    if (sIdx === 0 || sIdx === subNodes.length - 1) {
      return alert('首尾特殊工序（交底/验收）不可删除，这是客户签字的必经节点！');
    }
    subNodes.splice(sIdx, 1);
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
                  <User className="w-4 h-4 mr-2" /> 客户信息
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
                    <Edit2 className="w-3 h-3" /> 编辑节点
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
                              <button 
                                onClick={() => handleDeleteSubNode(idx, sIdx)} 
                                className={`p-1 shrink-0 transition-opacity ${sIdx === 0 || sIdx === node.subNodes.length - 1 ? 'opacity-20 cursor-not-allowed' : 'opacity-0 group-hover:opacity-100 text-primary-300 hover:text-rose-500'}`} 
                                title={sIdx === 0 || sIdx === node.subNodes.length - 1 ? "首尾特殊工序不可删除" : "删除工序"}
                              >
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
                              <div className="text-[11px] text-primary-400 font-mono mt-1.5 flex flex-col gap-1">
                                <div className="flex">
                                  <span className="w-10">计划：</span>
                                  <span>{formatDateRange(node.startDate, node.endDate)}</span>
                                </div>
                                {(node.actualStartDate || node.actualEndDate) && (
                                  <div className={`flex ${node.status === 'completed' && node.actualEndDate > node.endDate ? 'text-rose-600' : ''}`}>
                                    <span className="w-10">实际：</span>
                                    <span>
                                      {formatDateRange(node.actualStartDate || node.startDate, node.actualEndDate || node.endDate)}
                                      {node.status === 'completed' && node.actualEndDate > node.endDate && <span className="ml-1 font-bold">(延期)</span>}
                                    </span>
                                  </div>
                                )}
                              </div>
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
                                  const isSpecial = si === 0 || si === node.subNodes.length - 1;
                                  const subDone = sub.status === 'completed';
                                  const subCurrent = sub.status === 'current';
                                  const subAwaiting = sub.status === 'awaiting_signature';
                                  const isDelayed = subDone && sub.actualEndDate > sub.endDate;
                                  return (
                                    <div key={si} className={`relative flex items-center gap-3 bg-white border ${isSpecial ? 'border-amber-300 shadow-md' : 'border-primary-100 shadow-sm'} rounded-lg px-4 py-3 hover:border-primary-300 transition-colors cursor-pointer`}
                                      onClick={() => {
                                        if (node.status === 'pending') return alert('前置节点尚未完工，当前阶段未解锁');
                                        setSubNodeModal({ majorIdx: idx, subIdx: si });
                                      }}>
                                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${subDone ? 'bg-primary-900' : (subCurrent || subAwaiting) ? 'bg-amber-400' : 'bg-primary-200'} ${subAwaiting ? 'animate-pulse' : ''}`}></div>
                                      <div className="flex-1 min-w-0 flex items-center justify-between">
                                        <div>
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-sm font-bold ${subDone ? 'text-primary-900' : (subCurrent || subAwaiting) ? 'text-amber-600' : 'text-primary-700'}`}>{sub.name}</span>
                                            {isSpecial && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">需签字</span>}
                                          </div>
                                          <div className="text-[11px] text-primary-400 font-mono inline-flex flex-col gap-1 mt-0.5">
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center">
                                                <span className="w-10">计划：</span>
                                                <span>{formatDateRange(sub.startDate, sub.endDate)}</span>
                                              </div>
                                              <span className="ml-4 px-1.5 py-0.5 bg-primary-50 text-primary-500 rounded text-[10px] font-medium whitespace-nowrap">计划 {sub.duration} 天</span>
                                            </div>
                                            {(sub.actualStartDate || sub.actualEndDate) && (
                                              <div className={`flex items-center justify-between`}>
                                                <div className="flex items-center">
                                                  <span className="w-10">实际：</span>
                                                  <span className="flex items-center">
                                                    {formatDateRange(sub.actualStartDate || sub.startDate, sub.actualEndDate || sub.endDate)}
                                                  </span>
                                                </div>
                                                {subDone && <span className={`ml-4 px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap bg-primary-50 text-primary-600`}>用时 {Math.max(1, Math.floor((new Date(sub.actualEndDate.replace(/-/g, '/')).getTime() - new Date((sub.actualStartDate || sub.startDate).replace(/-/g, '/')).getTime()) / (1000 * 60 * 60 * 24)) + 1)} 天</span>}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        {subDone && (
                                          <div>
                                            {isSpecial ? (
                                              <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full font-medium whitespace-nowrap">已确认</span>
                                            ) : !isDelayed ? (
                                              <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full font-medium whitespace-nowrap">按时完成</span>
                                            ) : (
                                              <span className="text-[10px] px-2 py-0.5 bg-rose-50 text-rose-600 rounded-full font-medium whitespace-nowrap">
                                                逾期 {Math.floor((new Date(sub.actualEndDate.replace(/-/g, '/')).getTime() - new Date(sub.endDate.replace(/-/g, '/')).getTime()) / (1000 * 60 * 60 * 24))} 天
                                              </span>
                                            )}
                                            {isDelayed && (
                                              sub.acceptanceRecord?.delayReason ? (
                                                <div className="mt-2 text-rose-600 bg-rose-50 p-2 rounded border border-rose-100 text-[10px]">
                                                  <span className="font-bold">逾期原因：</span>{sub.acceptanceRecord.delayReason}
                                                </div>
                                              ) : (
                                                <div className="mt-2 text-[10px] text-rose-600">
                                                  * 此工序已逾期，请补充填写逾期原因
                                                  <button onClick={(e) => { e.stopPropagation(); setSubNodeModal({ majorIdx: idx, subIdx: si }); }} className="ml-2 text-primary-600 underline font-bold">去填写</button>
                                                </div>
                                              )
                                            )}
                                          </div>
                                        )}
                                      </div>
                                      {!subDone && active && canEdit && !subAwaiting && (
                                        <button onClick={(e) => { e.stopPropagation(); setDurationModal({ majorIdx: idx, subIdx: si, cur: Number(sub.duration)||0 }); setNewDuration(Number(sub.duration)||0); }}
                                          className="text-[11px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded border border-amber-100 flex items-center shrink-0">
                                          {sub.duration}天 <Edit2 className="w-2.5 h-2.5 ml-0.5" />
                                        </button>
                                      )}
                                      {!active && !subDone && !subAwaiting && (
                                        <span className="text-[11px] bg-primary-50 text-primary-600 px-2 py-0.5 rounded border border-primary-100 font-medium shrink-0">{sub.duration}天</span>
                                      )}
                                      {subAwaiting && <span className="text-[10px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded border border-rose-100 font-bold shrink-0 animate-pulse">待客户签字</span>}
                                      {subDone && <span className="text-[10px] bg-primary-50 text-primary-600 px-2 py-0.5 rounded font-bold shrink-0">已完成</span>}
                                      {subCurrent && (() => {
                                        const isOverdue = new Date() > new Date(sub.endDate.replace(/-/g, '/')) && new Date().toISOString().split('T')[0] !== sub.endDate;
                                        const overdueDays = isOverdue ? Math.floor((new Date().getTime() - new Date(sub.endDate.replace(/-/g, '/')).getTime()) / (1000 * 60 * 60 * 24)) : 0;
                                        return isOverdue ? (
                                          <span className="text-[10px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded font-bold shrink-0 border border-rose-100">逾期 {overdueDays} 天</span>
                                        ) : (
                                          <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded font-bold shrink-0 border border-amber-100">施工中</span>
                                        );
                                      })()}
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
                  <div className="w-full p-3 border border-primary-200 rounded-xl text-sm focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-500">
                    <DatePicker value={baseStartDate} onChange={setBaseStartDate} placeholder="选择开工日期" />
                  </div>
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
          const isAwaiting = sub.status === 'awaiting_signature';
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

                  {/* 等待客户签字提示 */}
                  {isAwaiting && (
                    <div className="bg-amber-50 rounded-xl p-6 border border-amber-100 text-center">
                      <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <AlertTriangle className="w-6 h-6 text-amber-500" />
                      </div>
                      <h3 className="text-sm font-bold text-amber-900 mb-1">正在等待客户签字</h3>
                      <p className="text-xs text-amber-700">您已提交现场记录。客户通过小程序签字确认后，该工序将正式完成。</p>
                    </div>
                  )}

                  {/* 客户签名展示 */}
                  {sub.signature && (
                    <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                      <h3 className="text-sm font-bold text-emerald-900 mb-3 flex items-center">
                        <CheckCircle2 className="w-4 h-4 mr-1.5" /> 客户已确认
                      </h3>
                      <div className="bg-white rounded-lg border border-emerald-200 p-2 h-24 flex items-center justify-center">
                        <img src={sub.signature.url} className="max-h-full max-w-full object-contain" alt="客户签名" />
                      </div>
                      <p className="text-xs text-emerald-600 mt-2 text-right">签字时间: {sub.signature.time}</p>
                    </div>
                  )}

                  {/* 上传区（未完成时显示） */}
                  {canOperate && !isDone && !isAwaiting && (
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

                  {/* 逾期原因补充区 */}
                  {canOperate && isDone && sub.actualEndDate > sub.endDate && !sub.acceptanceRecord?.delayReason && (
                    <div className="bg-rose-50 rounded-xl p-4 border border-rose-100 mt-4">
                      <label className="block text-sm font-bold text-rose-900 mb-2">补充逾期原因</label>
                      <textarea rows={3} value={editDelayReason} onChange={e => setEditDelayReason(e.target.value)}
                        placeholder="请详细说明导致此工序逾期的原因..."
                        className="w-full p-3 border border-rose-200 rounded-lg text-sm focus:outline-none focus:border-rose-400 bg-white mb-3 text-rose-900" />
                      <button onClick={handleSaveDelayReason} className="w-full py-2.5 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700">
                        保存逾期复盘
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
                  <div className="w-full px-4 py-3 bg-primary-50/50 border border-primary-200 rounded-lg text-primary-900 font-medium focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-500 transition-all">
                    <DatePicker value={editStartDate} onChange={setEditStartDate} placeholder="选择开工日期" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-primary-900 mb-2">项目经理</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setManagerDropdownOpen(!managerDropdownOpen)}
                      className="w-full px-4 py-3 bg-primary-50/50 border border-primary-200 rounded-lg text-primary-900 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-left flex justify-between items-center"
                    >
                      <span>{editManager || '请选择项目经理'}</span>
                      <ChevronDown className={`w-4 h-4 text-primary-400 transition-transform ${managerDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {managerDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setManagerDropdownOpen(false)} />
                        <div className="absolute z-20 w-full mt-1 bg-white border border-primary-100 rounded-xl shadow-xl overflow-hidden py-1 max-h-48 overflow-y-auto">
                          {users.filter(u => u.role === 'manager').map(u => (
                            <div
                              key={u._id}
                              onClick={() => { setEditManager(u.name); setManagerDropdownOpen(false); }}
                              className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${editManager === u.name ? 'bg-primary-50 text-primary-900 font-medium' : 'text-primary-700 hover:bg-primary-50'}`}
                            >
                              {u.name}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
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
