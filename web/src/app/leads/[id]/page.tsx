"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, MapPin, User, Calendar, MessageSquare, FileText, FolderOpen, ArrowRight, Plus, Edit2, Check, ChevronDown, Trash2, X, Pencil, CheckCircle2, Clock } from "lucide-react";
import MainLayout from "../../../components/MainLayout";
import CustomerDocuments from "../../../../src/components/CustomerDocuments";
import CustomerInfo from "../../../components/CustomerInfo";
import { getNextWorkingDay, calculateEndDate, formatDate } from "../../../lib/date";

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.id as string;
  
  const [lead, setLead] = useState<any>(null);
  const [newNote, setNewNote] = useState("");
  const [timeline, setTimeline] = useState<any[]>([]);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteContent, setEditNoteContent] = useState("");
  
  // UI states
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  
  // 确认更换人员的弹窗状态
  const [personnelConfirm, setPersonnelConfirm] = useState<{ role: string, oldName: string, newName: string } | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [signModal, setSignModal] = useState({ isOpen: false, date: '', signer: '' });
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);

  // 设计进度状态
  const [activeLeftTab, setActiveLeftTab] = useState<'follow' | 'design'>('follow');
  const [showStartDesignModal, setShowStartDesignModal] = useState(false);
  const [showEditDesignModal, setShowEditDesignModal] = useState(false);
  const [designStartDate, setDesignStartDate] = useState('');
  const [editDesignNodes, setEditDesignNodes] = useState<any[]>([]);

  useEffect(() => {
    const userData = localStorage.getItem("pnzj_user") || localStorage.getItem("userInfo") || localStorage.getItem("user");
    if (userData) {
      try {
        setCurrentUser(JSON.parse(userData));
      } catch (e) {
        console.error(e);
      }
    }
    
    // 获取所有的 users 列表以供分配和签单人选择
    fetch('/api/employees')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setUsers(data);
      })
      .catch(console.error);
  }, []);

  const isAssignedToMe = (leadData: any) => {
    if (!currentUser) return false;
    return leadData.sales === currentUser.name || leadData.designer === currentUser.name || leadData.creatorName === currentUser.name || leadData.signer === currentUser.name;
  };

  const maskName = (name: string, leadData: any) => {
    if (!currentUser || currentUser.role === 'admin') return name;
    if (isAssignedToMe(leadData)) return name;
    if (!name) return name;
    return name.substring(0, 1) + '**';
  };

  const maskPhone = (phone: string, leadData: any) => {
    if (!currentUser || currentUser.role === 'admin') return phone;
    if (isAssignedToMe(leadData)) return phone;
    if (!phone || phone.length < 11) return phone;
    return phone.substring(0, 3) + '****' + phone.substring(7);
  };

  const maskAddress = (address: string, leadData: any) => {
    if (!currentUser || currentUser.role === 'admin') return address;
    if (isAssignedToMe(leadData)) return address;
    if (!address) return address;
    const parts = address.split(' ');
    if (parts.length > 1) {
      return parts[0] + ' ***';
    }
    return address + ' ***';
  };

  const fetchLeadDetail = async () => {
    try {
      const res = await fetch(`/api/leads/${leadId}`);
      if (res.ok) {
        const data = await res.json();
        let dateStr = "未知";
        if (data.createdAt) {
          try {
            if (data.createdAt.$date) {
              dateStr = new Date(data.createdAt.$date).toISOString().split('T')[0];
            } else {
              dateStr = new Date(data.createdAt).toISOString().split('T')[0];
            }
          } catch(err) {}
        }
        const formatted = {
          ...data,
          id: data._id,
          createdAt: dateStr,
          lastFollowUp: data.lastFollowUp || "暂无"
        };
        setLead(formatted);
        setEditForm(formatted);
        
        // 从云端拉取真实跟进记录
        fetch(`/api/followUps?leadId=${leadId}`)
          .then(res => res.json())
          .then(followUpsData => {
             const timelineData = Array.isArray(followUpsData) ? followUpsData.map((f: any) => {
                // createdAt 可能是字符串 "2025-01-01 10:00" 或 { $date: timestamp }
                let timeStr = '';
                if (f.createdAt && typeof f.createdAt === 'object' && f.createdAt.$date) {
                  const d = new Date(f.createdAt.$date);
                  timeStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
                } else if (f.createdAt && typeof f.createdAt === 'string') {
                  timeStr = f.createdAt.substring(0, 16);
                }
                return {
                  id: f._id,
                  type: f.method === '系统记录' ? 'system' : 'user',
                  user: f.createdBy || f.user || '未知',
                  time: timeStr,
                  content: f.content || ''
                };
             }) : [];

             // 如果云端没有数据，添加一条默认记录
             if (timelineData.length === 0) {
               timelineData.push({
                 id: '1',
                 type: 'system',
                 user: '系统',
                 time: `${formatted.createdAt} 10:15`,
                 content: `【系统日志】线索已录入系统，初步意向评级：${formatted.rating}。`
               });
             }
             setTimeline(timelineData);
          });
      }
    } catch (e) {
      console.error('Failed to fetch lead details', e);
    }
  };

  const fetchQuoteStatus = async (id: string) => {
    try {
      const res = await fetch(`/api/quotes?leadId=${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setQuoteId(data[0]._id);
        } else {
          setQuoteId(null);
        }
      }
    } catch (e) {
      console.error('Failed to fetch quote status', e);
    }
  };

  const fetchProjectStatus = async (id: string) => {
    try {
      const res = await fetch(`/api/projects?leadId=${id}`);
      if (res.ok) {
        const data = await res.json();
        setProjectId(data && data.length > 0 ? data[0]._id : null);
      }
    } catch (e) {
      console.error('Failed to fetch project status', e);
    }
  };

  useEffect(() => {
    if (leadId) {
      fetchLeadDetail();
      fetchQuoteStatus(leadId);
      fetchProjectStatus(leadId);
    }
  }, [leadId]);

  if (!lead) {
    return (
      <MainLayout>
        <div className="p-8 text-center text-primary-500">正在加载客户信息...</div>
      </MainLayout>
    );
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    try {
      const res = await fetch('/api/followUps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          content: newNote,
          method: '手动记录',
          createdBy: currentUser?.name || '未知用户'
        })
      });
      if (res.ok) {
        setNewNote("");
        fetchLeadDetail();
      }
    } catch (e) {
      console.error('保存跟进记录失败', e);
    }
  };

  const handleEditNote = async (id: string) => {
    if (!editNoteContent.trim()) return;
    try {
      await fetch(`/api/followUps/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editNoteContent })
      });
      setEditingNoteId(null);
      fetchLeadDetail();
    } catch (e) {}
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await fetch(`/api/followUps/${id}`, { method: 'DELETE' });
      setDeleteConfirmId(null);
      fetchLeadDetail();
    } catch (e) {}
  };

  const handleRatingChange = async (option: string) => {
    if (lead.rating === option) return;
    setOpenDropdown(null);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: option })
      });
      if (res.ok) {
        setLead({ ...lead, rating: option });
        fetch('/api/followUps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId,
            content: `将客户意向评级更改为：${option}级`,
            method: '系统记录',
            createdBy: currentUser?.name || '系统'
          })
        }).then(() => fetchLeadDetail());
      }
    } catch (e) {}
  };

  const handleStatusChange = async (option: string) => {
    if (lead.status === option) return;
    setOpenDropdown(null);

    if (option === '已签单') {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      
      setSignModal({
        isOpen: true,
        date: `${yyyy}-${mm}-${dd}`,
        signer: currentUser?.name || ''
      });
      return;
    }

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: option })
      });
      if (res.ok) {
        setLead({ ...lead, status: option });
        // 写入系统跟进记录
        fetch('/api/followUps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId,
            content: `将客户状态更改为：${option}`,
            method: '系统记录',
            createdBy: currentUser?.name || '系统'
          })
        }).then(() => fetchLeadDetail());
      }
    } catch (e) {}
  };

  const handleConfirmSign = async () => {
    if (!signModal.date || !signModal.signer) {
      alert('请填写签单时间和签单人');
      return;
    }
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: '已签单',
          signDate: signModal.date,
          signer: signModal.signer
        })
      });
      if (res.ok) {
        setLead({ ...lead, status: '已签单', signDate: signModal.date, signer: signModal.signer });
        setSignModal({ ...signModal, isOpen: false });
        
        // 记录跟进记录
        await fetch('/api/followUps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId,
            content: `将客户状态更改为：已签单 (签单人: ${signModal.signer}, 日期: ${signModal.date})`,
            method: '系统记录',
            createdBy: currentUser?.name || '系统'
          })
        });

        // 标记已签单，用于返回列表时播放动画
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('justSignedLead', 'true');
        }

        // 显示庆祝弹窗
        setShowSuccessModal(true);
        fetchLeadDetail();
      }
    } catch (e) {}
  };

  const handleUpdateInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        setLead(editForm);
        setIsEditModalOpen(false);
      }
    } catch (e) {
      console.error('Failed to update lead', e);
    }
  };

  const handleConfirmPersonnelChange = async () => {
    if (!personnelConfirm) return;

    const fieldMap: Record<string, string> = { '销售': 'sales', '设计': 'designer', '项目经理': 'manager' };
    const field = fieldMap[personnelConfirm.role];

    try {
      await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: personnelConfirm.newName })
      });

      if (personnelConfirm.role === '销售') setLead({...lead, sales: personnelConfirm.newName});
      if (personnelConfirm.role === '设计') setLead({...lead, designer: personnelConfirm.newName});
      if (personnelConfirm.role === '项目经理') setLead({...lead, manager: personnelConfirm.newName});

      // 写入系统跟进记录
      await fetch('/api/followUps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          content: `将${personnelConfirm.role}从【${personnelConfirm.oldName}】更换为【${personnelConfirm.newName}】`,
          method: '系统记录',
          createdBy: currentUser?.name || '系统'
        })
      });
      fetchLeadDetail();
    } catch (e) {
      console.error('更换人员失败', e);
    }

    setPersonnelConfirm(null);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // ===== 设计进度工具函数 =====
  const recalcDesignGantt = (nodes: any[], startDate: string) => {
    let cursor = startDate;
    return nodes.map(n => {
      if (n.status === 'completed') {
        if (n.actualEndDate) cursor = formatDate(getNextWorkingDay(new Date(n.actualEndDate.replace(/-/g, '/'))));
        return n;
      }
      const start = n.manualStartDate || cursor;
      const end = calculateEndDate(start, Number(n.duration) || 1);
      cursor = formatDate(getNextWorkingDay(new Date(end.replace(/-/g, '/'))));
      return { ...n, startDate: start, endDate: end };
    });
  };

  const openStartDesignModal = () => {
    const today = new Date().toISOString().split('T')[0];
    const defaultNodes = [
      { id: Date.now() + 1, name: '平面布局', duration: 2, status: 'current' },
      { id: Date.now() + 2, name: '效果图渲染', duration: 5, status: 'pending' },
      { id: Date.now() + 3, name: '施工图深化', duration: 3, status: 'pending' },
      { id: Date.now() + 4, name: '定制图纸绘制', duration: 5, status: 'pending' },
    ];
    setDesignStartDate(today);
    setEditDesignNodes(recalcDesignGantt(defaultNodes, today));
    setShowStartDesignModal(true);
  };

  const openEditDesignModal = () => {
    if (!lead?.designNodes) return;
    const nodes = JSON.parse(JSON.stringify(lead.designNodes));
    const start = lead.designStartDate || new Date().toISOString().split('T')[0];
    setEditDesignNodes(recalcDesignGantt(nodes, start));
    setShowEditDesignModal(true);
  };

  const handleDesignNodeNameChange = (idx: number, val: string) => {
    const nodes = [...editDesignNodes];
    nodes[idx] = { ...nodes[idx], name: val };
    setEditDesignNodes(nodes);
  };

  const handleDesignNodeDurChange = (idx: number, val: string) => {
    const nodes = [...editDesignNodes];
    nodes[idx] = { ...nodes[idx], duration: parseInt(val) || 1 };
    const start = lead?.designStartDate || designStartDate || new Date().toISOString().split('T')[0];
    setEditDesignNodes(recalcDesignGantt(nodes, start));
  };

  const handleDesignStartDateChange = (val: string) => {
    setDesignStartDate(val);
    setEditDesignNodes(recalcDesignGantt(editDesignNodes, val));
  };

  const addDesignNode = () => {
    const nodes = [...editDesignNodes, { id: Date.now(), name: '新设计节点', duration: 1, status: 'pending' }];
    const start = lead?.designStartDate || designStartDate || new Date().toISOString().split('T')[0];
    setEditDesignNodes(recalcDesignGantt(nodes, start));
  };

  const removeDesignNode = (idx: number) => {
    const nodes = editDesignNodes.filter((_, i) => i !== idx);
    const start = lead?.designStartDate || designStartDate || new Date().toISOString().split('T')[0];
    setEditDesignNodes(recalcDesignGantt(nodes, start));
  };

  const confirmStartDesign = async () => {
    if (!designStartDate || editDesignNodes.length === 0) return;
    const nodes = recalcDesignGantt(editDesignNodes.map((n, i) => ({ ...n, status: i === 0 ? 'current' : 'pending' })), designStartDate);
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ designNodes: nodes, designStartDate })
      });
      setLead({ ...lead, designNodes: nodes, designStartDate });
      setShowStartDesignModal(false);
      await fetch('/api/followUps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, content: `开启了设计出图工作流，预计从 ${designStartDate} 开始`, method: '系统记录', createdBy: currentUser?.name || '系统' })
      });
      fetchLeadDetail();
    } catch (e) { console.error(e); }
  };

  const confirmEditDesign = async () => {
    if (editDesignNodes.length === 0) return;
    const start = lead?.designStartDate || new Date().toISOString().split('T')[0];
    const nodes = recalcDesignGantt(editDesignNodes, start);
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ designNodes: nodes })
      });
      setLead({ ...lead, designNodes: nodes });
      setShowEditDesignModal(false);
      await fetch('/api/followUps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, content: '修改并重算了设计出图排期', method: '系统记录', createdBy: currentUser?.name || '系统' })
      });
      fetchLeadDetail();
    } catch (e) { console.error(e); }
  };

  const completeDesignNode = async (idx: number) => {
    if (!lead?.designNodes) return;
    const nodes: any[] = JSON.parse(JSON.stringify(lead.designNodes));
    const today = new Date().toISOString().split('T')[0];
    const nodeName = nodes[idx].name;
    nodes[idx].status = 'completed';
    nodes[idx].actualEndDate = today;
    if (idx + 1 < nodes.length) {
      nodes[idx + 1].status = 'current';
      nodes[idx + 1].startDate = today;
    }
    const start = lead.designStartDate || today;
    const recalced = recalcDesignGantt(nodes, start);
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ designNodes: recalced })
      });
      setLead({ ...lead, designNodes: recalced });
      await fetch('/api/followUps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, content: `已完成设计出图节点：【${nodeName}】`, method: '系统记录', createdBy: currentUser?.name || '系统' })
      });
      fetchLeadDetail();
    } catch (e) { console.error(e); }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "沟通中": return "bg-blue-50 text-blue-700 border-blue-100";
      case "已量房": return "bg-indigo-50 text-indigo-700 border-indigo-100";
      case "已交定金": return "bg-pink-50 text-pink-700 border-pink-100";
      case "方案阶段": return "bg-purple-50 text-purple-700 border-purple-100";
      case "已签单": return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "已流失": return "bg-zinc-100 text-zinc-500 border-zinc-200";
      default: return "bg-zinc-50 text-zinc-700 border-zinc-200";
    }
  };

  return (
    <MainLayout>
      <div className="p-8 max-w-[1200px] mx-auto space-y-6">
        {/* 返回按钮 */}
        <button 
          onClick={() => router.back()}
          className="flex items-center text-sm font-medium text-primary-600 hover:text-primary-900 mb-2 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          返回线索列表
        </button>

        {/* 顶部客户名片 */}
        <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-6 relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4 md:gap-6 pr-12">
              <div className="w-16 h-16 rounded-2xl bg-primary-900 text-white flex items-center justify-center text-2xl font-bold shrink-0 shadow-md">
                {lead.name.charAt(0)}
              </div>
              <div className="space-y-3 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold text-primary-900 flex items-center gap-2">
                    <CustomerInfo 
                      name={maskName(lead.name, lead)}
                      phone={maskPhone(lead.phone, lead)}
                      customerNo={lead.customerNo || lead.id}
                      className="text-2xl"
                    />
                    {isAssignedToMe(lead) && (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">我</span>
                    )}
                  </h1>
                  
                  {/* 状态和评级徽章移到这里，与名字同行，移动端自动折行 */}
                  <div className="flex items-center gap-2">
                    {/* 意向评级下拉 */}
                    <div className="relative">
                      <div 
                        onClick={() => setOpenDropdown(openDropdown === 'rating' ? null : 'rating')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer flex items-center transition-colors hover:opacity-80 ${
                          lead.rating === 'A' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                          lead.rating === 'B' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                          lead.rating === 'C' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                          'bg-blue-50 text-blue-600 border border-blue-100'
                        }`}
                      >
                        {lead.rating}级
                        <ChevronDown className="w-3 h-3 ml-1 opacity-60" />
                      </div>
                      {openDropdown === 'rating' && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
                          <div className="absolute left-0 z-20 w-32 mt-1.5 bg-white border border-primary-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 py-1">
                            {['A', 'B', 'C', 'D'].map(option => (
                              <div 
                                key={option}
                                onClick={() => handleRatingChange(option)}
                                className="px-2 py-1 mx-1"
                              >
                                <div className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${lead.rating === option ? 'bg-primary-50/80 text-primary-900 font-medium' : 'text-primary-700 hover:bg-primary-50'}`}>
                                  <span className="text-sm">{option}级</span>
                                  {lead.rating === option && <Check className="w-4 h-4 text-primary-900" />}
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* 状态下拉 */}
                    <div className="relative">
                      <div 
                        onClick={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer flex items-center transition-colors hover:opacity-80 border ${getStatusColor(lead.status)}`}
                      >
                        {lead.status}
                        <ChevronDown className="w-3 h-3 ml-1 opacity-60" />
                      </div>
                      {openDropdown === 'status' && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
                          <div className="absolute left-0 z-20 w-32 mt-1.5 bg-white border border-primary-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 py-1">
                            {["沟通中", "已量房", "方案阶段", "已交定金", "已签单", "已流失"].map(option => (
                              <div 
                                key={option}
                                onClick={() => handleStatusChange(option)}
                                className="px-2 py-1 mx-1"
                              >
                                <div className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${lead.status === option ? 'bg-primary-50/80 text-primary-900 font-medium' : 'text-primary-700 hover:bg-primary-50'}`}>
                                  <span className="text-sm">{option}</span>
                                  {lead.status === option && <Check className="w-4 h-4 text-primary-900" />}
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* 编辑信息按钮 */}
                  {(currentUser?.role === 'admin' || isAssignedToMe(lead)) && (
                    <button 
                      onClick={() => { setEditForm(lead); setIsEditModalOpen(true); }}
                      className="p-1.5 text-primary-400 hover:text-primary-900 hover:bg-primary-50 rounded-md transition-colors relative z-10"
                      title="编辑客户信息"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}

                  {/* 删除按钮 */}
                  {currentUser?.role === 'admin' && (
                    <div className="relative z-20">
                      <button 
                        onClick={() => setDeleteConfirmId(lead.id)}
                        className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        title="删除此线索"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {deleteConfirmId === lead.id && (
                        <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-rose-100 rounded-xl shadow-xl p-4 z-50 animate-in fade-in zoom-in-95">
                          <div className="flex items-start gap-3 mb-4">
                            <div className="p-2 bg-rose-100 text-rose-600 rounded-full shrink-0">
                              <Trash2 className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-primary-900 mb-1">确定要删除此线索吗？</h4>
                              <p className="text-xs text-primary-500 leading-relaxed whitespace-normal text-left">删除后，该客户相关的所有记录及资料将无法恢复。</p>
                            </div>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <button 
                              onClick={() => setDeleteConfirmId(null)} 
                              className="px-3 py-1.5 border border-primary-200 text-primary-600 rounded-lg text-xs font-medium hover:bg-primary-50 transition-colors"
                            >
                              取消
                            </button>
                            <button 
                              onClick={() => {
                                setDeleteConfirmId(null);
                                router.push('/leads');
                              }} 
                              className="px-3 py-1.5 bg-rose-500 text-white rounded-lg text-xs font-medium hover:bg-rose-600 transition-colors shadow-sm shadow-rose-200"
                            >
                              确认删除
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 text-sm text-primary-700">
                  <span className="flex items-center"><MapPin className="w-4 h-4 mr-2 text-primary-400" /> {maskAddress(lead.address, lead)}</span>
                  <span className="flex items-center"><Calendar className="w-4 h-4 mr-2 text-primary-400" /> 录入于 {lead.createdAt}</span>
                </div>
              </div>
            </div>
          
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-primary-50/50 rounded-lg mt-4">
                  <div>
                    <p className="text-xs text-primary-500 mb-1">房屋面积</p>
                    <p className="text-sm font-medium text-primary-900">{lead.area} m²</p>
                  </div>
                  <div>
                    <p className="text-xs text-primary-500 mb-1">需求类型</p>
                    <p className="text-sm font-medium text-primary-900">{lead.requirementType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-primary-500 mb-1">预估预算</p>
                    <p className="text-sm font-medium text-primary-900">{lead.budget}</p>
                  </div>
                  <div>
                    <p className="text-xs text-primary-500 mb-1">客户来源</p>
                    <p className="text-sm font-medium text-primary-900">{lead.source}</p>
                  </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-stretch">
          {/* 左侧：跟进记录 / 设计进度 */}
          <div className="flex-1 flex flex-col h-[800px]">
            <div className="bg-white rounded-xl border border-primary-100 shadow-sm flex flex-col h-full">
              {/* Tab 头 */}
              <div className="p-4 border-b border-primary-100 flex items-center justify-between shrink-0">
                <div className="flex gap-1">
                  <button
                    onClick={() => setActiveLeftTab('follow')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeLeftTab === 'follow' ? 'bg-primary-900 text-white' : 'text-primary-600 hover:bg-primary-50'}`}
                  >
                    跟进记录
                  </button>
                  <button
                    onClick={() => setActiveLeftTab('design')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeLeftTab === 'design' ? 'bg-primary-900 text-white' : 'text-primary-600 hover:bg-primary-50'}`}
                  >
                    设计进度
                  </button>
                </div>
                {activeLeftTab === 'design' && lead.designNodes?.length > 0 && (
                  <button
                    onClick={openEditDesignModal}
                    className="text-xs text-primary-500 hover:text-primary-900 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-primary-50 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" /> 编辑排期
                  </button>
                )}
              </div>
              
              {/* 设计进度 Tab */}
              {activeLeftTab === 'design' && (
                <div className="flex-1 overflow-y-auto p-6">
                  {!lead.designNodes || lead.designNodes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-primary-400">
                      <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mb-4">
                        <Pencil className="w-7 h-7 opacity-40" />
                      </div>
                      <p className="text-sm mb-1">暂未开启设计出图进度管理</p>
                      {(currentUser?.role === 'admin' || isAssignedToMe(lead)) && (
                        <button
                          onClick={openStartDesignModal}
                          className="mt-4 px-6 py-2.5 bg-primary-900 text-white rounded-xl text-sm font-medium hover:bg-primary-800 transition-colors"
                        >
                          开启设计工作流
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-0 relative">
                      {/* 竖线 */}
                      <div className="absolute left-[15px] top-4 bottom-4 w-px bg-primary-100" />
                      {lead.designNodes.map((node: any, idx: number) => (
                        <div key={node.id || idx} className="flex gap-4 pb-6 relative z-10">
                          {/* 状态圆点 */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ring-4 ring-white shadow-sm border text-xs font-bold ${
                            node.status === 'completed' ? 'bg-emerald-500 border-emerald-400 text-white' :
                            node.status === 'current' ? 'bg-primary-900 border-primary-800 text-white' :
                            'bg-white border-primary-200 text-primary-400'
                          }`}>
                            {node.status === 'completed' ? <Check className="w-4 h-4" /> :
                             node.status === 'current' ? <Clock className="w-3.5 h-3.5" /> : null}
                          </div>
                          {/* 内容 */}
                          <div className="flex-1 pt-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-sm font-bold ${node.status === 'completed' ? 'text-primary-400 line-through' : 'text-primary-900'}`}>
                                {node.name}
                                <span className="ml-2 text-xs font-normal text-primary-400">{node.duration}天</span>
                              </span>
                              {node.status === 'current' && (currentUser?.role === 'admin' || isAssignedToMe(lead)) && (
                                <button
                                  onClick={() => completeDesignNode(idx)}
                                  className="text-xs px-3 py-1 bg-emerald-500 text-white rounded-full font-medium hover:bg-emerald-600 transition-colors"
                                >
                                  完成
                                </button>
                              )}
                              {node.status === 'completed' && (
                                <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">已完成</span>
                              )}
                            </div>
                            <p className="text-xs text-primary-400">
                              {node.status === 'completed' ? `实际完成: ${node.actualEndDate}` :
                               node.status === 'current' ? `预计完成: ${node.endDate}` :
                               `预计开始: ${node.startDate}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 跟进记录 Tab */}
              {activeLeftTab === 'follow' && (
              <div className="flex-1 overflow-y-auto p-6 relative">
                {/* 垂直线 */}
                <div className="absolute left-[39px] top-8 bottom-8 w-px bg-primary-100"></div>
                
                <div className="space-y-8 relative z-10">
                  {timeline.map((item) => (
                    <div key={item.id} className="flex gap-4 group">
                      {item.type === 'system' ? (
                        <div className="w-8 h-8 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 ring-4 ring-white shadow-sm border border-primary-100">
                          <Plus className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary-900 text-white flex items-center justify-center shrink-0 ring-4 ring-white shadow-sm">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                      
                      <div className="pt-1.5 w-full">
                        <div className="flex items-baseline justify-between mb-2">
                          <div className="flex items-baseline gap-2">
                            <span className="font-bold text-sm text-primary-900">{item.user}</span>
                            <span className="text-xs text-primary-400 font-mono">{item.time}</span>
                          </div>
                          {item.type === 'user' && (
                            <div className="flex items-center space-x-1 relative">
                              <button onClick={() => { setEditingNoteId(item.id); setEditNoteContent(item.content); }} className="p-1.5 text-primary-400 hover:text-primary-900 transition-colors bg-primary-50 rounded-md hover:bg-primary-100">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setDeleteConfirmId(item.id)} className="p-1.5 text-primary-400 hover:text-rose-600 transition-colors bg-primary-50 rounded-md hover:bg-rose-50">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              {deleteConfirmId === item.id && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-primary-100 rounded-lg shadow-lg p-3 z-20">
                                  <p className="text-xs text-primary-900 font-medium mb-3">确定删除这条记录吗？</p>
                                  <div className="flex gap-2">
                                    <button onClick={() => setDeleteConfirmId(null)} className="flex-1 px-2 py-1.5 border border-primary-200 text-primary-600 rounded-md text-xs font-medium hover:bg-primary-50">取消</button>
                                    <button onClick={() => handleDeleteNote(item.id)} className="flex-1 px-2 py-1.5 bg-rose-500 text-white rounded-md text-xs font-medium hover:bg-rose-600">删除</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {editingNoteId === item.id ? (
                          <div className="flex gap-2">
                            <input 
                              type="text"
                              value={editNoteContent}
                              onChange={(e) => setEditNoteContent(e.target.value)}
                              className="flex-1 px-3 py-2 text-sm border border-primary-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                              autoFocus
                            />
                            <button onClick={() => handleEditNote(item.id)} className="px-3 py-2 bg-primary-900 text-white rounded-lg text-sm font-medium">保存</button>
                            <button onClick={() => setEditingNoteId(null)} className="px-3 py-2 border border-primary-200 text-primary-600 rounded-lg text-sm font-medium">取消</button>
                          </div>
                        ) : (
                          <div className={`text-sm leading-relaxed p-4 rounded-xl border ${item.type === 'system' ? 'bg-zinc-50 border-zinc-100 text-primary-600' : 'bg-primary-50/50 border-primary-100 text-primary-800'}`}>
                            {item.content}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              )}

              {/* 输入框（仅跟进记录 Tab 显示） */}
              {activeLeftTab === 'follow' && (
              <div className="p-4 border-t border-primary-100 bg-primary-50/30 shrink-0">
                <form onSubmit={handleAddNote} className="flex gap-3">
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="输入最新的跟进情况、客户需求或售后记录..."
                    className="flex-1 px-4 py-2.5 border border-primary-200 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 text-sm"
                  />
                  <button type="submit" className="px-6 py-2.5 bg-primary-900 text-white rounded-lg hover:bg-primary-800 transition-colors font-medium text-sm flex items-center shrink-0 shadow-sm">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    发送
                  </button>
                </form>
              </div>
              )}
            </div>
          </div>

          {/* 右侧：资料、报价与施工流转 */}
          <div className="w-full lg:w-80 shrink-0 flex flex-col gap-6 h-[800px] overflow-y-auto hide-scrollbar">
            
            {/* 负责人员卡片 */}
            <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-5">
              <h2 className="text-sm font-bold text-primary-900 mb-4">负责人员</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 text-xs font-bold">销售</div>
                    <span className="text-sm font-medium text-primary-900">{lead.sales}</span>
                  </div>
                  <button 
                    onClick={() => setOpenDropdown(openDropdown === 'edit-sales' ? null : 'edit-sales')}
                    className="text-xs text-primary-500 hover:text-primary-900 relative"
                  >
                    更改
                    {openDropdown === 'edit-sales' && (
                      <>
                        <div className="fixed inset-0 z-10 cursor-default" onClick={(e) => { e.stopPropagation(); setOpenDropdown(null); }} />
                        <div className="absolute right-0 top-full z-20 w-36 mt-1.5 bg-white border border-primary-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 py-1 text-left cursor-default max-h-48 overflow-y-auto" onClick={e => e.stopPropagation()}>
                          {users.filter(u => u.role === 'sales' || u.role === 'admin').map(u => (
                            <div
                              key={u._id}
                              onClick={() => {
                                if (lead.sales !== u.name) {
                                  setPersonnelConfirm({ role: '销售', oldName: lead.sales, newName: u.name });
                                }
                                setOpenDropdown(null);
                              }}
                              className="px-2 py-1 mx-1"
                            >
                              <div className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${lead.sales === u.name ? 'bg-primary-50/80 text-primary-900 font-medium' : 'text-primary-700 hover:bg-primary-50'}`}>
                                <span className="text-sm">{u.name}</span>
                                {lead.sales === u.name && <Check className="w-4 h-4 text-primary-900" />}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 text-xs font-bold">设计</div>
                    {lead.designer === "未分配" ? (
                      <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded">未分配</span>
                    ) : (
                      <span className="text-sm font-medium text-primary-900">{lead.designer}</span>
                    )}
                  </div>
                  <button 
                    onClick={() => setOpenDropdown(openDropdown === 'edit-designer' ? null : 'edit-designer')}
                    className="text-xs text-primary-500 hover:text-primary-900 relative"
                  >
                    {lead.designer === "未分配" ? "分配" : "更改"}
                    {openDropdown === 'edit-designer' && (
                      <>
                        <div className="fixed inset-0 z-10 cursor-default" onClick={(e) => { e.stopPropagation(); setOpenDropdown(null); }} />
                        <div className="absolute right-0 top-full z-20 w-36 mt-1.5 bg-white border border-primary-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 py-1 text-left cursor-default max-h-48 overflow-y-auto" onClick={e => e.stopPropagation()}>
                          {[{ _id: 'unassigned', name: '未分配' }, ...users.filter(u => u.role === 'designer' || u.role === 'admin')].map(u => (
                            <div
                              key={u._id}
                              onClick={() => {
                                if (lead.designer !== u.name) {
                                  setPersonnelConfirm({ role: '设计', oldName: lead.designer, newName: u.name });
                                }
                                setOpenDropdown(null);
                              }}
                              className="px-2 py-1 mx-1"
                            >
                              <div className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${lead.designer === u.name ? 'bg-primary-50/80 text-primary-900 font-medium' : 'text-primary-700 hover:bg-primary-50'}`}>
                                <span className="text-sm">{u.name}</span>
                                {lead.designer === u.name && <Check className="w-4 h-4 text-primary-900" />}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </button>
                </div>

                {(lead.status === "已签单" || lead.status === "施工中") && (
                  <div className="flex items-center justify-between pt-4 border-t border-primary-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 text-xs font-bold">项目经理</div>
                      <span className="text-sm font-medium text-primary-900">{lead.manager || "待指派"}</span>
                    </div>
                    <button 
                      onClick={() => setOpenDropdown(openDropdown === 'edit-manager' ? null : 'edit-manager')}
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-medium relative"
                    >
                      {lead.manager ? "更改" : "指派"}
                      {openDropdown === 'edit-manager' && (
                        <>
                          <div className="fixed inset-0 z-10 cursor-default" onClick={(e) => { e.stopPropagation(); setOpenDropdown(null); }} />
                          <div className="absolute right-0 top-full z-20 w-36 mt-1.5 bg-white border border-primary-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 py-1 text-left cursor-default max-h-48 overflow-y-auto" onClick={e => e.stopPropagation()}>
                            {users.filter(u => u.role === 'manager' || u.role === 'admin').map(u => (
                              <div
                                key={u._id}
                                onClick={() => {
                                  if (lead.manager !== u.name) {
                                    setPersonnelConfirm({ role: '项目经理', oldName: lead.manager || '待指派', newName: u.name });
                                  }
                                  setOpenDropdown(null);
                                }}
                                className="px-2 py-1 mx-1"
                              >
                                <div className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${lead.manager === u.name ? 'bg-primary-50/80 text-primary-900 font-medium' : 'text-primary-700 hover:bg-primary-50'}`}>
                                  <span className="text-sm">{u.name}</span>
                                  {lead.manager === u.name && <Check className="w-4 h-4 text-primary-900" />}
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 状态流转卡片 */}
            <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-5">
              <h2 className="text-sm font-bold text-primary-900 mb-4">业务流转</h2>
              <div className="space-y-3">
                <button 
                  onClick={() => router.push(quoteId ? `/quotes/${quoteId}` : `/quotes/new?leadId=${lead.id}`)}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-primary-200 hover:border-primary-900 hover:bg-primary-50 transition-colors group"
                >
                  <div className="flex items-center">
                    <FileText className="w-5 h-5 text-primary-600 group-hover:text-primary-900 mr-3" />
                    <span className="font-medium text-primary-900 text-sm">{quoteId ? '查看 / 编辑报价单' : '生成报价单'}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-primary-400 group-hover:text-primary-900" />
                </button>
                
                {(lead.status === "已签单" || lead.status === "施工中") && (
                  <button
                    onClick={() => projectId
                      ? router.push(`/projects/${projectId}`)
                      : router.push(`/projects/new?leadId=${lead.id}`)
                    }
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-colors group"
                  >
                    <div className="flex items-center">
                      <FolderOpen className="w-5 h-5 text-emerald-600 mr-3" />
                      <span className="font-medium text-emerald-900 text-sm">{projectId ? '查看工地详情' : '新建关联工地'}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-emerald-600" />
                  </button>
                )}
              </div>
            </div>

            {/* 文件与图纸 */}
            <div className="flex-1 min-h-[400px]">
              <CustomerDocuments
                leadId={leadId}
                canUpload={!!(currentUser?.role === 'admin' || isAssignedToMe(lead))}
                uploaderName={currentUser?.name}
              />
            </div>

          </div>
        </div>
      </div>
      {/* 开启设计工作流弹窗 */}
      {showStartDesignModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-primary-100 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-bold text-primary-900">开启设计工作流</h3>
              <button onClick={() => setShowStartDesignModal(false)} className="p-1.5 text-primary-400 hover:text-primary-900 rounded-lg hover:bg-primary-50"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-1.5">设计启动日期</label>
                <input type="date" value={designStartDate} onChange={e => handleDesignStartDateChange(e.target.value)}
                  className="w-full px-4 py-2.5 bg-primary-50 border border-primary-200 rounded-lg text-sm text-primary-900 focus:outline-none focus:border-primary-400" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-primary-700">自定义工序与周期</label>
                </div>
                <div className="space-y-3">
                  {editDesignNodes.map((node, idx) => (
                    <div key={node.id || idx} className="flex items-center gap-2">
                      <input type="text" value={node.name} onChange={e => handleDesignNodeNameChange(idx, e.target.value)}
                        className="flex-1 px-3 py-2 border border-primary-200 rounded-lg text-sm focus:outline-none focus:border-primary-400" placeholder="节点名称" />
                      <div className="flex items-center gap-1 shrink-0">
                        <input type="number" value={node.duration} onChange={e => handleDesignNodeDurChange(idx, e.target.value)}
                          className="w-14 px-2 py-2 border border-primary-200 rounded-lg text-sm text-center focus:outline-none focus:border-primary-400" min={1} />
                        <span className="text-xs text-primary-400">天</span>
                      </div>
                      <button onClick={() => removeDesignNode(idx)} className="p-1.5 text-primary-300 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button onClick={addDesignNode} className="mt-3 w-full py-2 border border-dashed border-primary-200 text-primary-500 rounded-lg text-sm hover:border-primary-400 hover:text-primary-700 transition-colors">
                  + 添加新节点
                </button>
              </div>
            </div>
            <div className="p-5 border-t border-primary-100 flex gap-3 shrink-0">
              <button onClick={() => setShowStartDesignModal(false)} className="flex-1 px-4 py-2.5 border border-primary-200 text-primary-700 rounded-xl font-medium hover:bg-primary-50 transition-colors">取消</button>
              <button onClick={confirmStartDesign} className="flex-1 px-4 py-2.5 bg-primary-900 text-white rounded-xl font-medium hover:bg-primary-800 transition-colors">确认开启</button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑设计排期弹窗 */}
      {showEditDesignModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-primary-100 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-bold text-primary-900">编辑出图排期</h3>
              <button onClick={() => setShowEditDesignModal(false)} className="p-1.5 text-primary-400 hover:text-primary-900 rounded-lg hover:bg-primary-50"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="space-y-3">
                {editDesignNodes.map((node, idx) => (
                  <div key={node.id || idx} className="flex items-center gap-2">
                    <input type="text" value={node.name} onChange={e => handleDesignNodeNameChange(idx, e.target.value)}
                      disabled={node.status === 'completed'}
                      className="flex-1 px-3 py-2 border border-primary-200 rounded-lg text-sm focus:outline-none focus:border-primary-400 disabled:bg-primary-50 disabled:text-primary-400" />
                    <div className="flex items-center gap-1 shrink-0">
                      <input type="number" value={node.duration} onChange={e => handleDesignNodeDurChange(idx, e.target.value)}
                        disabled={node.status === 'completed'}
                        className="w-14 px-2 py-2 border border-primary-200 rounded-lg text-sm text-center focus:outline-none focus:border-primary-400 disabled:bg-primary-50 disabled:text-primary-400" min={1} />
                      <span className="text-xs text-primary-400">天</span>
                    </div>
                    {node.status !== 'completed' && (
                      <button onClick={() => removeDesignNode(idx)} className="p-1.5 text-primary-300 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    {node.status === 'completed' && <div className="w-8 shrink-0" />}
                  </div>
                ))}
              </div>
              <button onClick={addDesignNode} className="mt-3 w-full py-2 border border-dashed border-primary-200 text-primary-500 rounded-lg text-sm hover:border-primary-400 hover:text-primary-700 transition-colors">
                + 添加新节点
              </button>
            </div>
            <div className="p-5 border-t border-primary-100 flex gap-3 shrink-0">
              <button onClick={() => setShowEditDesignModal(false)} className="flex-1 px-4 py-2.5 border border-primary-200 text-primary-700 rounded-xl font-medium hover:bg-primary-50 transition-colors">取消</button>
              <button onClick={confirmEditDesign} className="flex-1 px-4 py-2.5 bg-primary-900 text-white rounded-xl font-medium hover:bg-primary-800 transition-colors">保存重算</button>
            </div>
          </div>
        </div>
      )}

      {/* 更换人员确认弹窗 */}
      {personnelConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4 mx-auto">
                <User className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-center text-primary-900 mb-2">确认更换{personnelConfirm.role}</h3>
              <p className="text-sm text-center text-primary-600 mb-6">
                您确定要将该线索的{personnelConfirm.role}从 <span className="font-semibold text-primary-900">{personnelConfirm.oldName}</span> 更改为 <span className="font-semibold text-primary-900">{personnelConfirm.newName}</span> 吗？
                <br /><br />
                <span className="text-xs text-primary-400">系统将会发送消息通知相关人员。</span>
              </p>
              <div className="flex gap-3">
                <button onClick={() => setPersonnelConfirm(null)} className="flex-1 px-4 py-2 border border-primary-200 text-primary-700 rounded-lg hover:bg-primary-50 transition-colors font-medium">取消</button>
                <button onClick={handleConfirmPersonnelChange} className="flex-1 px-4 py-2 bg-primary-900 text-white rounded-lg hover:bg-primary-800 transition-colors font-medium">确认更换</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 模拟全局通知 Toast */}
      {showToast && (
        <div className="fixed top-4 right-4 z-[70] bg-white border border-primary-100 rounded-xl shadow-lg p-4 flex items-start gap-3 animate-in slide-in-from-top-5 fade-in duration-300">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <Check className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-primary-900">人员已更换</p>
            <p className="text-xs text-primary-500 mt-0.5">已通过右上角 🔔 发送系统通知给相关人员。</p>
          </div>
        </div>
      )}

      {/* 恭喜签单弹窗 */}
      {signModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 text-center p-8">
            <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-rose-600" />
            </div>
            <h3 className="text-2xl font-bold text-rose-600 mb-2">品诺筑家签单确认</h3>
            <p className="text-sm text-primary-600 mb-8">
              【<span className="font-bold text-primary-900">{lead.name}</span>】项目确认签单？
            </p>
            <div className="space-y-4 text-left mb-8">
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-1">签单时间</label>
                <input 
                  type="date" 
                  value={signModal.date} 
                  onChange={e => setSignModal({...signModal, date: e.target.value})}
                  className="w-full px-4 py-2.5 bg-primary-50 border border-primary-200 rounded-lg focus:border-primary-400 focus:bg-white transition-all outline-none text-sm text-primary-900" 
                />
              </div>
              <div className="relative">
                <label className="block text-sm font-medium text-primary-700 mb-1">签单人</label>
                <div 
                  onClick={() => setOpenDropdown(openDropdown === 'signer' ? null : 'signer')}
                  className={`w-full px-4 py-2.5 bg-primary-50 border border-primary-200 rounded-lg text-sm transition-all cursor-pointer flex justify-between items-center ${openDropdown === 'signer' ? 'bg-white border-primary-400' : ''}`}
                >
                  <span className={signModal.signer ? 'text-primary-900' : 'text-primary-400'}>
                    {signModal.signer || '请选择签单人'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-primary-400 transition-transform ${openDropdown === 'signer' ? 'rotate-180' : ''}`} />
                </div>
                {openDropdown === 'signer' && (
                  <div className="absolute z-30 w-full mt-1 bg-white border border-primary-100 rounded-xl shadow-xl overflow-hidden py-1 max-h-48 overflow-y-auto">
                    {users.map(u => (
                      <div 
                        key={u._id}
                        onClick={() => {
                          setSignModal({...signModal, signer: u.name});
                          setOpenDropdown(null);
                        }}
                        className="px-4 py-2 text-sm text-primary-700 hover:bg-primary-50 cursor-pointer"
                      >
                        {u.name} ({u.role === 'admin' ? '管理员' : u.role === 'sales' ? '销售' : u.role === 'designer' ? '设计' : '项目'})
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setSignModal({...signModal, isOpen: false})} className="flex-1 px-4 py-3 border border-primary-200 text-primary-700 rounded-lg hover:bg-primary-50 transition-colors font-bold">再想想</button>
              <button onClick={handleConfirmSign} className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-bold shadow-lg shadow-amber-500/20">确认签单</button>
            </div>
          </div>
        </div>
      )}

      {/* 签单成功庆祝弹窗 */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-300 flex flex-col">
            <div className="bg-gradient-to-br from-amber-500 to-rose-600 p-8 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
              <div className="inline-block bg-white/20 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-sm font-bold tracking-widest mb-4 border border-white/30 shadow-sm">
                开单喜报
              </div>
              <h3 className="text-3xl font-black text-white drop-shadow-md mb-2">品诺筑家 恭喜签约</h3>
              <p className="text-white/90 text-sm">携手共筑美好家园</p>
            </div>
            <div className="p-8 text-center">
              <p className="text-primary-600 mb-2 text-sm">成功签约客户</p>
              <p className="text-2xl font-bold text-primary-900 mb-8 pb-4 border-b border-primary-100">
                {lead.name} <span className="text-base text-primary-400 font-normal">女士/先生</span>
              </p>
              <button 
                onClick={() => setShowSuccessModal(false)} 
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-xl hover:from-amber-600 hover:to-rose-600 transition-colors font-bold shadow-lg shadow-rose-500/30"
              >
                好的，继续工作
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑客户信息弹窗 */}
      {isEditModalOpen && editForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-6 border-b border-primary-100 rounded-t-2xl bg-white">
              <h2 className="text-xl font-bold text-primary-900">编辑客户信息</h2>
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="text-primary-400 hover:text-primary-900 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateInfo} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-primary-900 mb-1">客户姓名</label>
                  <input required type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full px-4 py-2.5 bg-primary-50 border border-transparent rounded-lg focus:border-primary-300 focus:bg-white focus:ring-2 focus:ring-primary-100 transition-all outline-none text-sm text-primary-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary-900 mb-1">联系电话</label>
                  <input required type="tel" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full px-4 py-2.5 bg-primary-50 border border-transparent rounded-lg focus:border-primary-300 focus:bg-white focus:ring-2 focus:ring-primary-100 transition-all outline-none text-sm text-primary-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary-900 mb-1">项目地址</label>
                  <input required type="text" value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} className="w-full px-4 py-2.5 bg-primary-50 border border-transparent rounded-lg focus:border-primary-300 focus:bg-white focus:ring-2 focus:ring-primary-100 transition-all outline-none text-sm text-primary-900" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className={`relative ${openDropdown === 'edit-requirement' ? 'z-30' : 'z-10'}`}>
                    <label className="block text-sm font-medium text-primary-900 mb-1">需求类型</label>
                    <div 
                      onClick={() => setOpenDropdown(openDropdown === 'edit-requirement' ? null : 'edit-requirement')}
                      className={`w-full px-4 py-2.5 border rounded-lg transition-all cursor-pointer flex justify-between items-center ${openDropdown === 'edit-requirement' ? 'bg-white border-primary-300 ring-2 ring-primary-100' : 'bg-primary-50 border-transparent hover:bg-primary-100/50'}`}
                    >
                      <span className="text-primary-900 text-sm">{editForm.requirementType}</span>
                      <ChevronDown className={`w-4 h-4 text-primary-400 transition-transform duration-200 ${openDropdown === 'edit-requirement' ? 'rotate-180' : ''}`} />
                    </div>
                    {openDropdown === 'edit-requirement' && (
                      <div className="absolute z-30 w-full mt-1.5 bg-white border border-primary-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 py-1">
                        {["毛坯", "旧改", "精装微调"].map(option => (
                          <div 
                            key={option}
                            onClick={() => { setEditForm({...editForm, requirementType: option}); setOpenDropdown(null); }}
                            className="px-2 py-1 mx-1"
                          >
                            <div className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${editForm.requirementType === option ? 'bg-primary-50/80 text-primary-900 font-medium' : 'text-primary-700 hover:bg-primary-50'}`}>
                              <span className="text-sm">{option}</span>
                              {editForm.requirementType === option && <Check className="w-4 h-4 text-primary-900" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className={`relative ${openDropdown === 'edit-source' ? 'z-30' : 'z-10'}`}>
                    <label className="block text-sm font-medium text-primary-900 mb-1">客户来源</label>
                    <div 
                      onClick={() => setOpenDropdown(openDropdown === 'edit-source' ? null : 'edit-source')}
                      className={`w-full px-4 py-2.5 border rounded-lg transition-all cursor-pointer flex justify-between items-center ${openDropdown === 'edit-source' ? 'bg-white border-primary-300 ring-2 ring-primary-100' : 'bg-primary-50 border-transparent hover:bg-primary-100/50'}`}
                    >
                      <span className="text-primary-900 text-sm">{editForm.source}</span>
                      <ChevronDown className={`w-4 h-4 text-primary-400 transition-transform duration-200 ${openDropdown === 'edit-source' ? 'rotate-180' : ''}`} />
                    </div>
                    {openDropdown === 'edit-source' && (
                      <div className="absolute z-30 w-full mt-1.5 bg-white border border-primary-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 py-1">
                        {["自然进店", "老介新", "抖音", "小红书", "大众点评", "自有关系", "其他"].map(option => (
                          <div 
                            key={option}
                            onClick={() => { setEditForm({...editForm, source: option}); setOpenDropdown(null); }}
                            className="px-2 py-1 mx-1"
                          >
                            <div className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${editForm.source === option ? 'bg-primary-50/80 text-primary-900 font-medium' : 'text-primary-700 hover:bg-primary-50'}`}>
                              <span className="text-sm">{option}</span>
                              {editForm.source === option && <Check className="w-4 h-4 text-primary-900" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-900 mb-1">房屋面积 (m²)</label>
                    <input type="number" value={editForm.area} onChange={e => setEditForm({...editForm, area: e.target.value})} className="w-full px-4 py-2.5 bg-primary-50 border border-transparent rounded-lg focus:border-primary-300 focus:bg-white focus:ring-2 focus:ring-primary-100 transition-all outline-none text-sm text-primary-900" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-900 mb-1">预算</label>
                    <input type="text" value={editForm.budget} onChange={e => setEditForm({...editForm, budget: e.target.value})} className="w-full px-4 py-2.5 bg-primary-50 border border-transparent rounded-lg focus:border-primary-300 focus:bg-white focus:ring-2 focus:ring-primary-100 transition-all outline-none text-sm text-primary-900" />
                  </div>
                </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 px-4 py-2.5 border border-primary-200 text-primary-700 rounded-lg hover:bg-primary-50 transition-colors font-medium">取消</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-primary-900 text-white rounded-lg hover:bg-primary-800 transition-colors shadow-sm font-medium">保存修改</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
