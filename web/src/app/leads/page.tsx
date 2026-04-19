"use client";

import { useState, useEffect, Suspense } from "react";
import { Plus, Search, Filter, MoreHorizontal, MessageSquare, UserPlus, FileText, ChevronDown, X, Check } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import MainLayout from "../../components/MainLayout";
import CustomerInfo from "../../components/CustomerInfo";

function LeadsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeRating, setActiveRating] = useState("全部");
  const [leadsData, setLeadsData] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLead, setNewLead] = useState({
    name: "",
    phone: "",
    rating: "B",
    address: "",
    requirementType: "毛坯",
    area: "",
    budget: "暂无",
    source: "自然进店",
  });

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    scope: "全部线索",
    status: "全部",
    sales: "全部",
    designer: "全部",
    year: new Date().getFullYear().toString(),
    month: "全部",
    day: ""
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // 控制自定义下拉框的展开状态
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showToast, setShowToast] = useState<string | false>(false);
  const [signModal, setSignModal] = useState({ isOpen: false, leadId: '', leadName: '', date: '', signer: '' });
  const [showSignedAnim, setShowSignedAnim] = useState(false);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    const userData = localStorage.getItem("userInfo") || localStorage.getItem("pnzj_user");
    if (userData) {
      try { setCurrentUser(JSON.parse(userData)); } catch (e) { console.error(e); }
    }
    fetchLeads();
    fetch('/api/employees').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setUsers(data);
    }).catch(console.error);

    // 检查是否有刚签单返回的标记，播放 +1 动画
    if (typeof window !== 'undefined') {
      if (sessionStorage.getItem('justSignedLead') === 'true') {
        setShowSignedAnim(true);
        sessionStorage.removeItem('justSignedLead');
        setTimeout(() => setShowSignedAnim(false), 3000);
      }
    }
  }, []);

  const fetchLeads = async () => {
    try {
      const res = await fetch('/api/leads');
      if (res.ok) {
        const data = await res.json();
        const formatted = data.map((item: any) => {
          let dateStr = new Date().toISOString().split('T')[0];
          let timestamp = Date.now();
          if (item.createdAt) {
            try {
              if (item.createdAt.$date) {
                dateStr = new Date(item.createdAt.$date).toISOString().split('T')[0];
                timestamp = item.createdAt.$date;
              } else {
                dateStr = new Date(item.createdAt).toISOString().split('T')[0];
                timestamp = new Date(item.createdAt).getTime();
              }
            } catch(err) {
              console.error('Date parse error', err);
            }
          }
          return {
            ...item,
            id: item._id,
            createdAt: dateStr,
            _timestamp: timestamp
          };
        });
        
        // 强制前端按时间倒序排列（最新创建在最上面）
        formatted.sort((a: any, b: any) => b._timestamp - a._timestamp);
        
        setLeadsData(formatted);
      }
    } catch (e) {
      console.error('Failed to fetch leads', e);
    }
  };

  const isAssignedToMe = (lead: any) => {
    if (!currentUser) return false;
    return lead.sales === currentUser.name || lead.designer === currentUser.name;
  };

  const maskName = (name: string, lead: any) => {
    if (!currentUser || currentUser.role === 'admin') return name;
    if (isAssignedToMe(lead)) return name;
    if (!name) return name;
    return name.substring(0, 1) + '**';
  };

  const maskPhone = (phone: string, lead: any) => {
    if (!currentUser || currentUser.role === 'admin') return phone;
    if (isAssignedToMe(lead)) return phone;
    if (!phone || phone.length < 11) return phone;
    return phone.substring(0, 3) + '****' + phone.substring(7);
  };

  const maskAddress = (address: string, lead: any) => {
    if (!currentUser || currentUser.role === 'admin') return address;
    if (isAssignedToMe(lead)) return address;
    if (!address) return address;
    // 简单的打码逻辑：隐藏具体的楼栋号等，比如 "万科星城 3栋1单元1204" -> "万科星城 ***"
    const parts = address.split(' ');
    if (parts.length > 1) {
      return parts[0] + ' ***';
    }
    return address + ' ***';
  };

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isModalOpen]);

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    const lead = {
      ...newLead,
      area: Number(newLead.area) || 0,
      status: "待跟进",
      sales: "",
      designer: "",
      lastFollowUp: "暂无",
      unread: false,
      notes: "新录入客户",
      creatorName: currentUser?.name || '未知'
    };

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead)
      });
      if (res.ok) {
        fetchLeads(); // 重新拉取
        setIsModalOpen(false);
        setNewLead({ name: "", phone: "", rating: "B", address: "", requirementType: "毛坯", area: "", budget: "暂无", source: "自然进店" });
        
        setShowToast("录入成功！");
        setTimeout(() => setShowToast(false), 2500);
      }
    } catch (e) {
      console.error('Failed to create lead', e);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "待跟进": return "bg-zinc-50 text-zinc-700 border-zinc-200";
      case "沟通中": return "bg-blue-50 text-blue-700 border-blue-100";
      case "已量房": return "bg-indigo-50 text-indigo-700 border-indigo-100";
      case "方案阶段": return "bg-purple-50 text-purple-700 border-purple-100";
      case "已交定金": return "bg-pink-50 text-pink-700 border-pink-100";
      case "已签单": return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "已流失": return "bg-zinc-100 text-zinc-500 border-zinc-200";
      default: return "bg-zinc-50 text-zinc-700 border-zinc-200";
    }
  };

  const getRatingBadge = (rating: string) => {
    switch (rating) {
      case "A": return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-rose-50 text-rose-600 border border-rose-100">A</span>;
      case "B": return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-600 border border-amber-100">B</span>;
      case "C": return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">C</span>;
      case "D": return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100">D</span>;
      default: return null;
    }
  };

  const ratings = ["全部", "A", "B", "C", "D"];

  const updateLeadStatus = async (id: string, newStatus: string) => {
    if (newStatus === "已签单") {
      const leadToSign = leadsData.find(l => l.id === id);
      if (leadToSign) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        
        setSignModal({
          isOpen: true,
          leadId: id,
          leadName: leadToSign.name,
          date: `${yyyy}-${mm}-${dd}`,
          signer: currentUser?.name || ''
        });
      }
      return;
    }

    setLeadsData(leadsData.map(lead => lead.id === id ? { ...lead, status: newStatus } : lead));
    await fetch(`/api/leads/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
  };

  const handleConfirmSign = async () => {
    if (!signModal.date || !signModal.signer) {
      alert('请填写签单时间和签单人');
      return;
    }

    setLeadsData(leadsData.map(lead => lead.id === signModal.leadId ? {
      ...lead,
      status: '已签单',
      signDate: signModal.date,
      signer: signModal.signer
    } : lead));

    try {
      const res = await fetch(`/api/leads/${signModal.leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: '已签单',
          signDate: signModal.date,
          signer: signModal.signer
        })
      });
      if (res.ok) {
        setSignModal({ ...signModal, isOpen: false });
        setShowToast('签单保存成功');
        setTimeout(() => setShowToast(false), 2500);
        
        // 触发本地开单动效
        if (typeof window !== 'undefined') {
          setShowSignedAnim(true);
          setTimeout(() => setShowSignedAnim(false), 3000);
        }

        // 写入系统跟进记录（对齐小程序）
        fetch('/api/followUps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId: signModal.leadId,
            content: `将客户状态更改为：已签单 (签单人: ${signModal.signer}, 日期: ${signModal.date})`,
            method: '系统记录',
            createdBy: currentUser?.name || '系统'
          })
        }).catch(console.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateLeadDesigner = async (id: string, newDesigner: string) => {
    setLeadsData(leadsData.map(lead => lead.id === id ? { ...lead, designer: newDesigner } : lead));
    await fetch(`/api/leads/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ designer: newDesigner })
    });
    if (newDesigner !== "未分配") {
      setShowToast(`已成功将线索分配给设计：${newDesigner}`);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  const updateLeadSales = async (id: string, newSales: string) => {
    setLeadsData(leadsData.map(lead => lead.id === id ? { ...lead, sales: newSales } : lead));
    await fetch(`/api/leads/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sales: newSales })
    });
    if (newSales !== "未分配") {
      setShowToast(`已成功将线索分配给销售：${newSales}`);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  const updateLeadRating = async (id: string, newRating: string) => {
    setLeadsData(leadsData.map(lead => lead.id === id ? { ...lead, rating: newRating } : lead));
    await fetch(`/api/leads/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: newRating })
    });
  };
  
  // 初始化从 URL 参数读取状态
  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam === 'active') {
      // 这里的 active 对应跟进中（排除已签单和已流失）
      // 由于我们当前的设计是在高级筛选中进行，我们这里可以通过将不需要的状态排除，或者直接在筛选逻辑中处理
      // 这里为了简单，我们扩展 activeRating 为更通用的筛选
    }
  }, [searchParams]);

  // 分页状态
  // const [currentPage, setCurrentPage] = useState(1);
  // const itemsPerPage = 20;

  // 筛选逻辑
  const filteredLeads = leadsData.filter(l => {
    // 处理从全局看板带过来的 active 状态
    const statusParam = searchParams.get('status');
    if (statusParam === 'active') {
      if (l.status === '已签单' || l.status === '已流失') return false;
    }

    // 评级筛选
    if (activeRating !== "全部" && !activeRating.includes(l.rating)) return false;
    
    // 数据范围筛选
    if (filters.scope === "与我相关" && !isAssignedToMe(l)) return false;

    // 搜索筛选
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!l.name.toLowerCase().includes(q) && 
          !l.phone.includes(q) && 
          !l.address?.toLowerCase().includes(q) &&
          !l.customerNo?.toLowerCase().includes(q) &&
          !l.id.includes(q)) {
        return false;
      }
    }
    
    // 高级筛选
    if (filters.sales !== "全部" && l.sales !== filters.sales) return false;
    if (filters.designer !== "全部" && l.designer !== filters.designer) return false;
    if (filters.status !== "全部" && l.status !== filters.status) return false;
    
    // 日期筛选
    if (filters.year !== "全部" && !l.createdAt.startsWith(filters.year)) return false;
    if (filters.month !== "全部" && !l.createdAt.startsWith(`${filters.year !== "全部" ? filters.year : new Date().getFullYear()}-${filters.month.padStart(2, '0')}`)) return false;
    if (filters.day && !l.createdAt.endsWith(`-${filters.day.padStart(2, '0')}`)) return false;
    
    return true;
  });

  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const paginatedLeads = filteredLeads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <MainLayout>
      <div className="p-8 max-w-[1600px] mx-auto space-y-8">
        {/* 顶部标题区与数据看板 */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-primary-900">客户管理</h1>
            <p className="text-primary-600 mt-2">管理所有客户线索与状态，及时跟进高意向客户</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center min-h-[44px] px-4 py-2.5 bg-primary-900 text-white rounded-lg hover:bg-primary-800 transition-colors shadow-sm font-medium w-full sm:w-auto"
          >
            <Plus className="w-5 h-5 mr-2" />
            录入新客户
          </button>
        </div>

        {/* 数据看板 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-primary-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-primary-500">总客户数</p>
              <p className="text-2xl font-bold text-primary-900">{leadsData.length}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-primary-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-primary-500">高意向 (A/B)</p>
              <p className="text-2xl font-bold text-primary-900">{leadsData.filter(l => l.rating === 'A' || l.rating === 'B').length}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-primary-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-primary-500">跟进中</p>
              <p className="text-2xl font-bold text-primary-900">{leadsData.filter(l => l.status !== '已签单' && l.status !== '已流失').length}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-primary-100 shadow-sm flex items-center gap-4 relative overflow-hidden">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 relative z-10">
              <Check className="w-6 h-6" />
            </div>
            <div className="relative z-10">
              <p className="text-sm font-medium text-primary-500">已签单</p>
              <p className="text-2xl font-bold text-primary-900 flex items-center relative">
                {leadsData.filter(l => l.status === '已签单').length}
                {showSignedAnim && (
                  <span className="absolute left-full ml-2 text-rose-500 text-xl font-black animate-float-up-fade">
                    +1
                  </span>
                )}
              </p>
            </div>
            {showSignedAnim && (
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-50 to-transparent animate-[pulse_2s_ease-in-out] z-0"></div>
            )}
          </div>
        </div>
      </div>

      {/* 筛选与搜索 - 融合风格 */}
      <div className="bg-white p-5 rounded-xl border border-primary-100 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex space-x-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 hide-scrollbar">
          {ratings.map((rating) => (
            <button
              key={rating}
              onClick={() => setActiveRating(rating)}
              className={`min-h-[44px] px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeRating === rating ? "bg-primary-900 text-white shadow-md" : "bg-primary-50 text-primary-600 hover:bg-primary-100"}`}
            >
              {rating}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto relative">
          <button 
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`relative flex items-center justify-center min-w-[44px] min-h-[44px] px-3 sm:px-4 py-2.5 rounded-lg text-sm transition-colors whitespace-nowrap font-medium shrink-0 border ${
              isFilterOpen || Object.values(filters).some(v => v !== "全部" && v !== "")
                ? "bg-primary-50 border-primary-300 text-primary-900 ring-2 ring-primary-100" 
                : "bg-white border-primary-100 hover:bg-primary-50 text-primary-900"
            }`}
          >
            <Filter className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">高级筛选</span>
            {(filters.scope !== "全部线索" || filters.sales !== "全部" || filters.designer !== "全部" || filters.status !== "全部" || filters.year !== "全部" || filters.month !== "全部" || filters.day) && (
              <span className="absolute top-2.5 right-2.5 sm:static sm:ml-2 w-2 h-2 rounded-full bg-rose-500"></span>
            )}
            <ChevronDown className={`hidden sm:inline-block w-4 h-4 ml-1 opacity-50 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {/* 高级筛选浮层 */}
          {isFilterOpen && (
            <>
              <div className="fixed inset-0 z-40 bg-black/20 sm:bg-transparent" onClick={() => setIsFilterOpen(false)} />
              <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-[340px] sm:absolute sm:top-full sm:left-0 sm:-translate-x-0 sm:-translate-y-0 sm:transform-none sm:w-80 sm:max-w-none mt-0 sm:mt-2 z-50 bg-white border border-primary-100 rounded-xl shadow-xl p-4 sm:p-5 animate-in fade-in zoom-in-95 sm:zoom-in-100 slide-in-from-top-2 duration-150">
                <div className="space-y-4">
                  <div className="relative z-50">
                    <label className="block text-xs font-medium text-primary-600 mb-1">数据范围</label>
                    <div className="flex gap-2">
                      {["全部线索", "与我相关"].map((option) => (
                        <button
                          key={option}
                          onClick={() => setFilters({ ...filters, scope: option })}
                          className={`flex-1 py-2 rounded-lg text-sm transition-colors border ${
                            filters.scope === option
                              ? "bg-primary-900 text-white border-primary-900 shadow-sm font-medium"
                              : "bg-primary-50 text-primary-600 border-transparent hover:bg-primary-100"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="relative z-40">
                    <label className="block text-xs font-medium text-primary-600 mb-1">跟进状态</label>
                    <div 
                      onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === 'filter-status' ? null : 'filter-status'); }}
                      className={`w-full px-3 py-2 bg-primary-50 border border-transparent rounded-lg text-sm transition-all cursor-pointer flex justify-between items-center ${openDropdown === 'filter-status' ? 'bg-white border-primary-300 ring-2 ring-primary-100' : 'hover:bg-primary-100/50'}`}
                    >
                      <span className="text-primary-900">{filters.status}</span>
                      <ChevronDown className={`w-4 h-4 text-primary-400 transition-transform duration-200 ${openDropdown === 'filter-status' ? 'rotate-180' : ''}`} />
                    </div>
                    {openDropdown === 'filter-status' && (
                      <div className="absolute z-40 w-full mt-1.5 bg-white border border-primary-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 py-1" onClick={e => e.stopPropagation()}>
                        {["全部", "待跟进", "沟通中", "已量房", "方案阶段", "已交定金", "已签单", "已流失"].map(option => (
                          <div 
                            key={option}
                            onClick={() => { setFilters({...filters, status: option}); setOpenDropdown(null); }}
                            className="px-2 py-1 mx-1"
                          >
                            <div className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${filters.status === option ? 'bg-primary-50/80 text-primary-900 font-medium' : 'text-primary-700 hover:bg-primary-50'}`}>
                              <span className="text-sm">{option}</span>
                              {filters.status === option && <Check className="w-4 h-4 text-primary-900" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="relative z-40">
                    <label className="block text-xs font-medium text-primary-600 mb-1">销售人员</label>
                    <div 
                      onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === 'filter-sales' ? null : 'filter-sales'); }}
                      className={`w-full px-3 py-2 bg-primary-50 border border-transparent rounded-lg text-sm transition-all cursor-pointer flex justify-between items-center ${openDropdown === 'filter-sales' ? 'bg-white border-primary-300 ring-2 ring-primary-100' : 'hover:bg-primary-100/50'}`}
                    >
                      <span className="text-primary-900">{filters.sales}</span>
                      <ChevronDown className={`w-4 h-4 text-primary-400 transition-transform duration-200 ${openDropdown === 'filter-sales' ? 'rotate-180' : ''}`} />
                    </div>
                    {openDropdown === 'filter-sales' && (
                      <div className="absolute z-40 w-full mt-1.5 bg-white border border-primary-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 py-1" onClick={e => e.stopPropagation()}>
                        {["全部", ...users.filter(u => u.role === 'sales' || u.role === 'admin').map(u => u.name)].map(option => (
                          <div
                            key={option}
                            onClick={() => { setFilters({...filters, sales: option}); setOpenDropdown(null); }}
                            className="px-2 py-1 mx-1"
                          >
                            <div className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${filters.sales === option ? 'bg-primary-50/80 text-primary-900 font-medium' : 'text-primary-700 hover:bg-primary-50'}`}>
                              <span className="text-sm">{option}</span>
                              {filters.sales === option && <Check className="w-4 h-4 text-primary-900" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="relative z-30">
                    <label className="block text-xs font-medium text-primary-600 mb-1">设计人员</label>
                    <div 
                      onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === 'filter-designer' ? null : 'filter-designer'); }}
                      className={`w-full px-3 py-2 bg-primary-50 border border-transparent rounded-lg text-sm transition-all cursor-pointer flex justify-between items-center ${openDropdown === 'filter-designer' ? 'bg-white border-primary-300 ring-2 ring-primary-100' : 'hover:bg-primary-100/50'}`}
                    >
                      <span className="text-primary-900">{filters.designer}</span>
                      <ChevronDown className={`w-4 h-4 text-primary-400 transition-transform duration-200 ${openDropdown === 'filter-designer' ? 'rotate-180' : ''}`} />
                    </div>
                    {openDropdown === 'filter-designer' && (
                      <div className="absolute z-40 w-full mt-1.5 bg-white border border-primary-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 py-1" onClick={e => e.stopPropagation()}>
                        {["全部", "未分配", ...users.filter(u => u.role === 'designer' || u.role === 'admin').map(u => u.name)].map(option => (
                          <div
                            key={option}
                            onClick={() => { setFilters({...filters, designer: option}); setOpenDropdown(null); }}
                            className="px-2 py-1 mx-1"
                          >
                            <div className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${filters.designer === option ? 'bg-primary-50/80 text-primary-900 font-medium' : 'text-primary-700 hover:bg-primary-50'}`}>
                              <span className="text-sm">{option}</span>
                              {filters.designer === option && <Check className="w-4 h-4 text-primary-900" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="relative z-20">
                    <label className="block text-xs font-medium text-primary-600 mb-1">创建日期</label>
                    <div className="flex items-center gap-2">
                      <div className="relative z-10 w-1/3">
                        <div 
                          onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === 'filter-year' ? null : 'filter-year'); }}
                          className={`w-full px-2 py-2 bg-primary-50 border border-transparent rounded-lg text-xs transition-all cursor-pointer flex justify-between items-center ${openDropdown === 'filter-year' ? 'bg-white border-primary-300 ring-2 ring-primary-100' : 'hover:bg-primary-100/50'}`}
                        >
                          <span className="text-primary-900 truncate">{filters.year === "全部" ? "年份" : filters.year}</span>
                          <ChevronDown className={`w-3 h-3 text-primary-400 transition-transform duration-200 shrink-0 ${openDropdown === 'filter-year' ? 'rotate-180' : ''}`} />
                        </div>
                        {openDropdown === 'filter-year' && (
                          <div className="absolute z-40 w-full mt-1.5 bg-white border border-primary-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 py-1 max-h-48 overflow-y-auto" onClick={e => e.stopPropagation()}>
                            {["全部", "2026", "2025", "2024", "2023", "2022", "2021", "2020"].map(option => (
                              <div 
                                key={option}
                                onClick={() => { setFilters({...filters, year: option}); setOpenDropdown(null); }}
                                className="px-1 py-1"
                              >
                                <div className={`flex items-center justify-center px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${filters.year === option ? 'bg-primary-50/80 text-primary-900 font-medium' : 'text-primary-700 hover:bg-primary-50'}`}>
                                  <span className="text-xs">{option === "全部" ? "全部" : option}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="text-primary-400 text-xs">-</span>
                      <div className="relative z-10 w-1/3">
                        <div 
                          onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === 'filter-month' ? null : 'filter-month'); }}
                          className={`w-full px-2 py-2 bg-primary-50 border border-transparent rounded-lg text-xs transition-all cursor-pointer flex justify-between items-center ${openDropdown === 'filter-month' ? 'bg-white border-primary-300 ring-2 ring-primary-100' : 'hover:bg-primary-100/50'}`}
                        >
                          <span className="text-primary-900 truncate">{filters.month === "全部" ? "月份" : filters.month}</span>
                          <ChevronDown className={`w-3 h-3 text-primary-400 transition-transform duration-200 shrink-0 ${openDropdown === 'filter-month' ? 'rotate-180' : ''}`} />
                        </div>
                        {openDropdown === 'filter-month' && (
                          <div className="absolute z-40 w-full mt-1.5 bg-white border border-primary-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 py-1 max-h-48 overflow-y-auto" onClick={e => e.stopPropagation()}>
                            {["全部", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].map(option => (
                              <div 
                                key={option}
                                onClick={() => { setFilters({...filters, month: option}); setOpenDropdown(null); }}
                                className="px-1 py-1"
                              >
                                <div className={`flex items-center justify-center px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${filters.month === option ? 'bg-primary-50/80 text-primary-900 font-medium' : 'text-primary-700 hover:bg-primary-50'}`}>
                                  <span className="text-xs">{option === "全部" ? "全部" : option}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="text-primary-400 text-xs">-</span>
                      <input 
                        type="number" 
                        placeholder="日"
                        min="1"
                        max="31"
                        value={filters.day}
                        onChange={e => setFilters({...filters, day: e.target.value})}
                        className="w-1/3 px-2 py-2 bg-primary-50 border border-transparent rounded-lg text-xs focus:border-primary-300 focus:bg-white focus:ring-2 focus:ring-primary-100 outline-none transition-all text-primary-900 text-center placeholder:text-primary-400"
                      />
                    </div>
                  </div>
                  <div className="pt-2 flex gap-2">
                    <button 
                      onClick={() => setFilters({ scope: "全部线索", status: "全部", sales: "全部", designer: "全部", year: new Date().getFullYear().toString(), month: "全部", day: "" })}
                      className="flex-1 px-3 py-2 border border-primary-200 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors text-sm font-medium"
                    >
                      重置
                    </button>
                    <button 
                      onClick={() => setIsFilterOpen(false)}
                      className="flex-1 px-3 py-2 bg-primary-900 text-white rounded-lg hover:bg-primary-800 transition-colors shadow-sm text-sm font-medium"
                    >
                      应用
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-600" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索编号/姓名/电话/地址..."
              className="w-full min-h-[44px] pl-9 pr-10 py-2.5 bg-primary-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary-900 focus:bg-white transition-all outline-none text-primary-900 placeholder:text-primary-600/60"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-400 hover:text-primary-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 数据表格 - 极简高级感 */}
      <div className="bg-white rounded-xl border border-primary-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-primary-50/50 border-b border-primary-100 text-primary-600 text-sm">
                <th className="py-4 px-6 font-medium whitespace-nowrap">客户编号 / 姓名</th>
                <th className="py-4 px-6 font-medium whitespace-nowrap">评级</th>
                <th className="py-4 px-6 font-medium whitespace-nowrap">状态</th>
                <th className="py-4 px-6 font-medium whitespace-nowrap">房屋信息</th>
                <th className="py-4 px-6 font-medium whitespace-nowrap">负责人员</th>
                <th className="py-4 px-6 font-medium whitespace-nowrap">创建时间</th>
                <th className="py-4 px-6 font-medium whitespace-nowrap">最新跟进</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-100 text-sm">
              {paginatedLeads
                .map((lead) => (
                <tr 
                  key={lead.id} 
                  onClick={(e) => {
                    // 如果点击的是下拉菜单相关的内容，不触发跳转
                    if ((e.target as HTMLElement).closest('.prevent-row-click')) {
                      return;
                    }
                    if (currentUser?.role === 'admin' || isAssignedToMe(lead)) {
                      router.push(`/leads/${lead.id}`);
                    } else {
                      setShowToast("您暂无权限查看此客户的详细信息");
                      setTimeout(() => setShowToast(false), 3000);
                    }
                  }}
                  className={`transition-colors group ${
                    currentUser?.role === 'admin' || isAssignedToMe(lead) 
                      ? 'hover:bg-primary-50/50 cursor-pointer' 
                      : 'opacity-80 cursor-default'
                  } ${isAssignedToMe(lead) ? 'bg-amber-50/30' : ''}`}
                >
                  <td className="py-4 px-6 whitespace-nowrap">
                    <div className="flex items-start gap-2">
                      <div className="w-2 pt-1.5 shrink-0 flex justify-center">
                        {(lead as any).unread && (
                          <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                        )}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <CustomerInfo 
                            name={maskName(lead.name, lead)}
                            phone={maskPhone(lead.phone, lead)}
                            customerNo={lead.customerNo || lead.id.substring(0, 6)}
                          />
                          {isAssignedToMe(lead) && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">我</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 whitespace-nowrap prevent-row-click">
                    <div className="relative inline-block w-auto" title="点击修改评级">
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (currentUser?.role === 'admin' || isAssignedToMe(lead)) {
                            setOpenDropdown(openDropdown === `rating-${lead.id}` ? null : `rating-${lead.id}`);
                          }
                        }}
                        className={currentUser?.role === 'admin' || isAssignedToMe(lead) ? "cursor-pointer hover:opacity-80" : ""}
                      >
                        {getRatingBadge(lead.rating)}
                      </div>
                      {openDropdown === `rating-${lead.id}` && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setOpenDropdown(null); }} />
                          <div className="absolute z-20 w-16 mt-1.5 bg-white border border-primary-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 py-1 left-0">
                            {["A", "B", "C", "D"].map(option => (
                              <div 
                                key={option}
                                onClick={(e) => { e.stopPropagation(); updateLeadRating(lead.id, option); setOpenDropdown(null); }}
                                className="px-1 py-0.5 mx-1"
                              >
                                <div className={`flex items-center justify-center px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${lead.rating === option ? 'bg-primary-50/80 text-primary-900 font-medium' : 'text-primary-700 hover:bg-primary-50'}`}>
                                  <span className="text-sm">{option}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6 whitespace-nowrap prevent-row-click">
                    <div className="relative inline-block w-auto">
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (currentUser?.role === 'admin' || isAssignedToMe(lead)) {
                            setOpenDropdown(openDropdown === `status-${lead.id}` ? null : `status-${lead.id}`);
                          }
                        }}
                        className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium border whitespace-nowrap transition-colors ${getStatusColor(lead.status)} ${currentUser?.role === 'admin' || isAssignedToMe(lead) ? 'cursor-pointer hover:opacity-80' : ''}`}
                      >
                        {lead.status}
                        {(currentUser?.role === 'admin' || isAssignedToMe(lead)) && (
                          <ChevronDown className={`w-3.5 h-3.5 ml-1.5 opacity-50 transition-transform ${openDropdown === `status-${lead.id}` ? 'rotate-180' : ''}`} />
                        )}
                      </div>
                      {openDropdown === `status-${lead.id}` && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
                          <div className="absolute z-20 w-32 mt-1.5 bg-white border border-primary-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 py-1 left-0">
                            {["待跟进", "沟通中", "已量房", "方案阶段", "已交定金", "已签单", "已流失"].map(option => (
                              <div 
                                key={option}
                                onClick={(e) => { e.stopPropagation(); updateLeadStatus(lead.id, option); setOpenDropdown(null); }}
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
                  </td>
                  <td className="py-4 px-6 whitespace-nowrap">
                    <p className="text-sm font-medium text-primary-900 truncate max-w-[200px]" title={lead.address}>{maskAddress(lead.address, lead)}</p>
                    <p className="text-xs text-primary-600 mt-0.5">{lead.requirementType} · {lead.area}m² · 预算: {lead.budget}</p>
                  </td>
                  <td className="py-4 px-6 whitespace-nowrap prevent-row-click">
                    <div className="text-sm text-primary-900 flex items-center relative">
                      <span className="text-primary-600 w-12 text-xs">销售:</span>
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (currentUser?.role === 'admin' || isAssignedToMe(lead)) {
                            setOpenDropdown(openDropdown === `sales-${lead.id}` ? null : `sales-${lead.id}`);
                          }
                        }}
                        className={`transition-colors border px-2 py-0.5 rounded text-xs font-medium flex items-center group/sales ${
                          lead.sales === "未分配" 
                            ? "text-amber-600 bg-amber-50 border-amber-100" 
                            : "text-primary-700 bg-white border-primary-200"
                        } ${currentUser?.role === 'admin' || isAssignedToMe(lead) ? 'cursor-pointer hover:bg-primary-50' : ''}`}
                      >
                        {lead.sales === "未分配" && <UserPlus className="w-3 h-3 mr-1" />}
                        {lead.sales}
                        {(currentUser?.role === 'admin' || isAssignedToMe(lead)) && (
                          <ChevronDown className="w-3 h-3 ml-1 opacity-0 group-hover/sales:opacity-100 transition-opacity" />
                        )}
                      </div>
                      {openDropdown === `sales-${lead.id}` && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setOpenDropdown(null); }} />
                          <div className="absolute z-20 w-36 mt-8 bg-white border border-primary-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 py-1 left-12">
                            {["未分配", ...users.filter(u => u.role === 'sales' || u.role === 'admin').map(u => u.name)].map(option => (
                              <div
                                key={option}
                                onClick={(e) => { e.stopPropagation(); updateLeadSales(lead.id, option); setOpenDropdown(null); }}
                                className="px-2 py-1 mx-1"
                              >
                                <div className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${lead.sales === option ? 'bg-primary-50/80 text-primary-900 font-medium' : 'text-primary-700 hover:bg-primary-50'}`}>
                                  <span className="text-sm">{option}</span>
                                  {lead.sales === option && <Check className="w-4 h-4 text-primary-900" />}
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                    <div className="text-sm text-primary-900 flex items-center mt-2 relative">
                      <span className="text-primary-600 w-12 text-xs">设计:</span>
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (currentUser?.role === 'admin' || isAssignedToMe(lead)) {
                            setOpenDropdown(openDropdown === `designer-${lead.id}` ? null : `designer-${lead.id}`);
                          }
                        }}
                        className={`transition-colors border px-2 py-0.5 rounded text-xs font-medium flex items-center group/designer ${
                          lead.designer === "未分配" 
                            ? "text-amber-600 bg-amber-50 border-amber-100" 
                            : "text-primary-700 bg-white border-primary-200"
                        } ${currentUser?.role === 'admin' || isAssignedToMe(lead) ? 'cursor-pointer hover:bg-primary-50' : ''}`}
                      >
                        {lead.designer === "未分配" && <UserPlus className="w-3 h-3 mr-1" />}
                        {lead.designer}
                        {(currentUser?.role === 'admin' || isAssignedToMe(lead)) && (
                          <ChevronDown className="w-3 h-3 ml-1 opacity-0 group-hover/designer:opacity-100 transition-opacity" />
                        )}
                      </div>
                      {openDropdown === `designer-${lead.id}` && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setOpenDropdown(null); }} />
                          <div className="absolute z-20 w-36 mt-8 bg-white border border-primary-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 py-1 left-12">
                            {["未分配", ...users.filter(u => u.role === 'designer' || u.role === 'admin').map(u => u.name)].map(option => (
                              <div
                                key={option}
                                onClick={(e) => { e.stopPropagation(); updateLeadDesigner(lead.id, option); setOpenDropdown(null); }}
                                className="px-2 py-1 mx-1"
                              >
                                <div className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${lead.designer === option ? 'bg-primary-50/80 text-primary-900 font-medium' : 'text-primary-700 hover:bg-primary-50'}`}>
                                  <span className="text-sm">{option}</span>
                                  {lead.designer === option && <Check className="w-4 h-4 text-primary-900" />}
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6 whitespace-nowrap">
                    <p className="text-sm text-primary-900">{lead.createdAt}</p>
                  </td>
                  <td className="py-4 px-6 min-w-[200px]">
                    <p className="text-sm font-medium text-primary-900">{lead.lastFollowUp}</p>
                    <p className="text-xs text-primary-600 mt-1 line-clamp-2 whitespace-normal" title={lead.notes}>{lead.notes || "暂无跟进记录"}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-primary-100 p-4 flex flex-col sm:flex-row items-center justify-between text-sm text-primary-600 shrink-0 bg-primary-50/30 gap-4">
          <p>显示 {(currentPage - 1) * itemsPerPage + 1} 至 {Math.min(currentPage * itemsPerPage, filteredLeads.length)} 条，共 {filteredLeads.length} 条</p>
          <div className="flex space-x-2">
            <button 
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 min-h-[44px] flex items-center justify-center border border-primary-100 rounded-lg hover:bg-white disabled:opacity-50 font-medium transition-colors bg-transparent"
            >
              上一页
            </button>
            <button 
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-4 py-2 min-h-[44px] flex items-center justify-center border border-primary-100 rounded-lg hover:bg-white disabled:opacity-50 font-medium transition-colors bg-transparent"
            >
              下一页
            </button>
          </div>
        </div>
      </div>

      {/* 新建线索弹窗 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-6 border-b border-primary-100 rounded-t-2xl bg-white">
              <h2 className="text-xl font-bold text-primary-900">录入新线索</h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-primary-400 hover:text-primary-900 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* 点击外部关闭下拉框的透明遮罩 */}
            {openDropdown && (
              <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
            )}
            <form onSubmit={handleAddLead} className="p-6 space-y-4 relative z-20">
                <div>
                  <label className="block text-sm font-medium text-primary-900 mb-1">客户姓名 <span className="text-rose-500">*</span></label>
                  <input required type="text" value={newLead.name} onChange={e => setNewLead({...newLead, name: e.target.value})} className="w-full px-4 py-2.5 bg-primary-50 border border-transparent rounded-lg focus:border-primary-300 focus:bg-white focus:ring-2 focus:ring-primary-100 transition-all outline-none text-sm text-primary-900 placeholder:text-primary-400" placeholder="例如：张先生" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary-900 mb-1">联系电话 <span className="text-rose-500">*</span></label>
                  <input required type="tel" value={newLead.phone} onChange={e => setNewLead({...newLead, phone: e.target.value})} className="w-full px-4 py-2.5 bg-primary-50 border border-transparent rounded-lg focus:border-primary-300 focus:bg-white focus:ring-2 focus:ring-primary-100 transition-all outline-none text-sm text-primary-900 placeholder:text-primary-400" placeholder="11位手机号" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-primary-900 mb-1">项目地址 <span className="text-rose-500">*</span></label>
                    <input required type="text" value={newLead.address} onChange={e => setNewLead({...newLead, address: e.target.value})} className="w-full px-4 py-2.5 bg-primary-50 border border-transparent rounded-lg focus:border-primary-300 focus:bg-white focus:ring-2 focus:ring-primary-100 transition-all outline-none text-sm text-primary-900 placeholder:text-primary-400" placeholder="例如：阳光海岸 3栋 2单元 1502" />
                  </div>
                  
                  {/* 需求类型自定义下拉框 */}
                  <div className={`relative ${openDropdown === 'requirement' ? 'z-30' : 'z-10'}`}>
                    <label className="block text-sm font-medium text-primary-900 mb-1">需求类型</label>
                    <div 
                      onClick={() => setOpenDropdown(openDropdown === 'requirement' ? null : 'requirement')}
                      className={`w-full px-4 py-2.5 border rounded-lg transition-all cursor-pointer flex justify-between items-center ${openDropdown === 'requirement' ? 'bg-white border-primary-300 ring-2 ring-primary-100' : 'bg-primary-50 border-transparent hover:bg-primary-100/50'}`}
                    >
                      <span className="text-primary-900 text-sm">{newLead.requirementType}</span>
                      <ChevronDown className={`w-4 h-4 text-primary-400 transition-transform duration-200 ${openDropdown === 'requirement' ? 'rotate-180' : ''}`} />
                    </div>
                    {openDropdown === 'requirement' && (
                      <div className="absolute z-30 w-full mt-1.5 bg-white border border-primary-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 py-1">
                        {["毛坯", "旧改", "精装微调"].map(option => (
                          <div 
                            key={option}
                            onClick={() => { setNewLead({...newLead, requirementType: option}); setOpenDropdown(null); }}
                            className="px-2 py-1 mx-1"
                          >
                            <div className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${newLead.requirementType === option ? 'bg-primary-50/80 text-primary-900 font-medium' : 'text-primary-700 hover:bg-primary-50'}`}>
                              <span className="text-sm">{option}</span>
                              {newLead.requirementType === option && <Check className="w-4 h-4 text-primary-900" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 客户来源自定义下拉框 */}
                  <div className={`relative ${openDropdown === 'source' ? 'z-30' : 'z-10'}`}>
                    <label className="block text-sm font-medium text-primary-900 mb-1">客户来源</label>
                    <div 
                      onClick={() => setOpenDropdown(openDropdown === 'source' ? null : 'source')}
                      className={`w-full px-4 py-2.5 border rounded-lg transition-all cursor-pointer flex justify-between items-center ${openDropdown === 'source' ? 'bg-white border-primary-300 ring-2 ring-primary-100' : 'bg-primary-50 border-transparent hover:bg-primary-100/50'}`}
                    >
                      <span className="text-primary-900 text-sm">{newLead.source}</span>
                      <ChevronDown className={`w-4 h-4 text-primary-400 transition-transform duration-200 ${openDropdown === 'source' ? 'rotate-180' : ''}`} />
                    </div>
                    {openDropdown === 'source' && (
                      <div className="absolute z-30 w-full mt-1.5 bg-white border border-primary-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 py-1">
                        {["自然进店", "老介新", "抖音", "小红书", "大众点评", "自有关系", "其他"].map(option => (
                          <div 
                            key={option}
                            onClick={() => { setNewLead({...newLead, source: option}); setOpenDropdown(null); }}
                            className="px-2 py-1 mx-1"
                          >
                            <div className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${newLead.source === option ? 'bg-primary-50/80 text-primary-900 font-medium' : 'text-primary-700 hover:bg-primary-50'}`}>
                              <span className="text-sm">{option}</span>
                              {newLead.source === option && <Check className="w-4 h-4 text-primary-900" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* 意向评级自定义下拉框 */}
                  <div className={`relative ${openDropdown === 'rating' ? 'z-30' : 'z-10'}`}>
                    <label className="block text-sm font-medium text-primary-900 mb-1">意向评级</label>
                    <div 
                      onClick={() => setOpenDropdown(openDropdown === 'rating' ? null : 'rating')}
                      className={`w-full px-4 py-2.5 border rounded-lg transition-all cursor-pointer flex justify-between items-center ${openDropdown === 'rating' ? 'bg-white border-primary-300 ring-2 ring-primary-100' : 'bg-primary-50 border-transparent hover:bg-primary-100/50'}`}
                    >
                      <span className="text-primary-900 text-sm">{newLead.rating}级 ({newLead.rating === 'A' ? '高意向' : newLead.rating === 'B' ? '对比中' : newLead.rating === 'C' ? '观望中' : '无意向'})</span>
                      <ChevronDown className={`w-4 h-4 text-primary-400 transition-transform duration-200 ${openDropdown === 'rating' ? 'rotate-180' : ''}`} />
                    </div>
                    {openDropdown === 'rating' && (
                      <div className="absolute z-30 w-full mt-1.5 bg-white border border-primary-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 py-1">
                        {[
                          { val: 'A', label: 'A级 (高意向)' },
                          { val: 'B', label: 'B级 (对比中)' },
                          { val: 'C', label: 'C级 (观望中)' },
                          { val: 'D', label: 'D级 (无意向)' }
                        ].map(option => (
                          <div 
                            key={option.val}
                            onClick={() => { setNewLead({...newLead, rating: option.val}); setOpenDropdown(null); }}
                            className="px-2 py-1 mx-1"
                          >
                            <div className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${newLead.rating === option.val ? 'bg-primary-50/80 text-primary-900 font-medium' : 'text-primary-700 hover:bg-primary-50'}`}>
                              <span className="text-sm">{option.label}</span>
                              {newLead.rating === option.val && <Check className="w-4 h-4 text-primary-900" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-900 mb-1">预算</label>
                  <input type="text" value={newLead.budget} onChange={e => setNewLead({...newLead, budget: e.target.value})} className="w-full px-4 py-2.5 bg-primary-50 border border-transparent rounded-lg focus:border-primary-300 focus:bg-white focus:ring-2 focus:ring-primary-100 transition-all outline-none text-sm text-primary-900 placeholder:text-primary-400" placeholder="例如：15万左右" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary-900 mb-1">房屋面积 (m²)</label>
                  <input type="number" value={newLead.area} onChange={e => setNewLead({...newLead, area: e.target.value})} className="w-full px-4 py-2.5 bg-primary-50 border border-transparent rounded-lg focus:border-primary-300 focus:bg-white focus:ring-2 focus:ring-primary-100 transition-all outline-none text-sm text-primary-900 placeholder:text-primary-400" placeholder="例如：120" />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 border border-primary-200 text-primary-700 rounded-lg hover:bg-primary-50 transition-colors font-medium">取消</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-primary-900 text-white rounded-lg hover:bg-primary-800 transition-colors shadow-sm font-medium">保存线索</button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>

      {/* 签单确认弹窗 */}
      {signModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 text-center p-8">
            <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-rose-600" />
            </div>
            <h3 className="text-2xl font-bold text-rose-600 mb-2">品诺筑家签单确认</h3>
            <p className="text-sm text-primary-600 mb-6">
              【<span className="font-bold text-primary-900">{signModal.leadName}</span>】项目确认签单？
            </p>
            <div className="space-y-4 text-left mb-6">
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
                  onClick={() => setOpenDropdown(openDropdown === 'sign-signer' ? null : 'sign-signer')}
                  className={`w-full px-4 py-2.5 bg-primary-50 border border-primary-200 rounded-lg text-sm transition-all cursor-pointer flex justify-between items-center ${openDropdown === 'sign-signer' ? 'bg-white border-primary-400' : ''}`}
                >
                  <span className={signModal.signer ? 'text-primary-900' : 'text-primary-400'}>
                    {signModal.signer || '请选择签单人'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-primary-400 transition-transform ${openDropdown === 'sign-signer' ? 'rotate-180' : ''}`} />
                </div>
                {openDropdown === 'sign-signer' && (
                  <div className="absolute z-30 w-full mt-1 bg-white border border-primary-100 rounded-xl shadow-xl overflow-hidden py-1 max-h-48 overflow-y-auto">
                    {users.map(u => (
                      <div
                        key={u._id}
                        onClick={() => { setSignModal({...signModal, signer: u.name}); setOpenDropdown(null); }}
                        className="px-4 py-2 text-sm text-primary-700 hover:bg-primary-50 cursor-pointer flex items-center justify-between"
                      >
                        <span>{u.name}</span>
                        <span className="text-xs text-primary-400">{u.role === 'admin' ? '管理员' : u.role === 'sales' ? '销售' : u.role === 'designer' ? '设计' : '项目'}</span>
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

      {showToast && (
        <div className="fixed top-24 right-8 z-[70] bg-white border border-primary-100 rounded-xl shadow-lg p-4 flex items-start gap-3 animate-in slide-in-from-top-5 fade-in duration-300">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <Check className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-primary-900">分配成功</p>
            <p className="text-xs text-primary-500 mt-0.5">{showToast}</p>
          </div>
        </div>
      )}

    </MainLayout>
  );
}

export default function LeadsPage() {
  return (
    <Suspense fallback={
      <MainLayout>
        <div className="p-8 max-w-[1600px] mx-auto flex items-center justify-center h-64">
          <div className="text-primary-600">加载中...</div>
        </div>
      </MainLayout>
    }>
      <LeadsContent />
    </Suspense>
  );
}

