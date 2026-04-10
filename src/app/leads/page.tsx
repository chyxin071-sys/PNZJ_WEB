"use client";

import { useState, useEffect, Suspense } from "react";
import { Plus, Search, Filter, MoreHorizontal, MessageSquare, UserPlus, FileText, ChevronDown, X, Check } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import MainLayout from "../../components/MainLayout";
import initialLeadsData from "../../../mock_data/leads.json";

function LeadsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeRating, setActiveRating] = useState("全部");
  const [leadsData, setLeadsData] = useState(initialLeadsData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLead, setNewLead] = useState({
    name: "",
    phone: "",
    rating: "B",
    address: "",
    requirementType: "毛坯",
    area: "",
    budget: "",
    source: "自然进店",
  });

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: "全部",
    sales: "全部",
    designer: "全部",
    year: "全部",
    month: "全部",
    day: ""
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // 控制自定义下拉框的展开状态
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isModalOpen]);

  const handleAddLead = (e: React.FormEvent) => {
    e.preventDefault();
    const lead = {
      id: `L-${Math.floor(Math.random() * 10000)}`,
      ...newLead,
      area: Number(newLead.area) || 0,
      status: "沟通中",
      sales: "王销售",
      designer: "未分配",
      createdAt: new Date().toISOString().split('T')[0],
      lastFollowUp: new Date().toISOString().split('T')[0],
      unread: false,
      notes: "新录入客户"
    };
    setLeadsData([lead, ...leadsData]);
    setIsModalOpen(false);
    setNewLead({ name: "", phone: "", rating: "B", address: "", requirementType: "毛坯", area: "", budget: "", source: "自然进店" });
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

  const updateLeadStatus = (id: string, newStatus: string) => {
    setLeadsData(leadsData.map(lead => lead.id === id ? { ...lead, status: newStatus } : lead));
  };

  const updateLeadDesigner = (id: string, newDesigner: string) => {
    setLeadsData(leadsData.map(lead => lead.id === id ? { ...lead, designer: newDesigner } : lead));
  };

  const updateLeadSales = (id: string, newSales: string) => {
    setLeadsData(leadsData.map(lead => lead.id === id ? { ...lead, sales: newSales } : lead));
  };

  const updateLeadRating = (id: string, newRating: string) => {
    setLeadsData(leadsData.map(lead => lead.id === id ? { ...lead, rating: newRating } : lead));
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
    
    // 搜索筛选
    if (searchQuery && !l.name.includes(searchQuery) && !l.phone.includes(searchQuery) && !l.address?.includes(searchQuery)) return false;
    
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
        {/* 顶部标题区 */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-primary-900">客户线索</h1>
          <p className="text-primary-600 mt-2">共 {leadsData.length} 条客户记录，请及时跟进高意向客户</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center min-h-[44px] px-4 py-2.5 bg-primary-900 text-white rounded-lg hover:bg-primary-800 transition-colors shadow-sm font-medium w-full sm:w-auto"
        >
          <Plus className="w-5 h-5 mr-2" />
          录入新线索
        </button>
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

        <div className="flex items-center gap-3 w-full sm:w-auto relative">
          <button 
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center justify-center min-h-[44px] px-4 py-2.5 rounded-lg text-sm transition-colors whitespace-nowrap font-medium w-full sm:w-auto border ${
              isFilterOpen || Object.values(filters).some(v => v !== "全部" && v !== "")
                ? "bg-primary-50 border-primary-300 text-primary-900 ring-2 ring-primary-100" 
                : "bg-white border-primary-100 hover:bg-primary-50 text-primary-900"
            }`}
          >
            <Filter className="w-4 h-4 mr-2" />
            高级筛选
            {(filters.sales !== "全部" || filters.designer !== "全部" || filters.status !== "全部" || filters.year !== "全部" || filters.month !== "全部" || filters.day) && (
              <span className="ml-2 w-2 h-2 rounded-full bg-rose-500"></span>
            )}
            <ChevronDown className={`w-4 h-4 ml-1 opacity-50 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {/* 高级筛选浮层 */}
          {isFilterOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
              <div className="absolute left-0 top-full mt-2 z-50 w-full sm:w-80 bg-white border border-primary-100 rounded-xl shadow-xl p-4 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="space-y-4">
                  <div className="relative z-50">
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
                        {["全部", "沟通中", "已量房", "方案阶段", "已交定金", "已签单", "已流失"].map(option => (
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
                        {["全部", "王销售", "李销售", "刘销售"].map(option => (
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
                        {["全部", "未分配", "赵设计", "陈总监", "李设计"].map(option => (
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
                            {["全部", "2024", "2023", "2022"].map(option => (
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
                      onClick={() => setFilters({ status: "全部", sales: "全部", designer: "全部", year: "全部", month: "全部", day: "" })}
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
              placeholder="搜索姓名/电话/地址..."
              className="w-full min-h-[44px] pl-9 pr-4 py-2.5 bg-primary-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary-900 focus:bg-white transition-all outline-none text-primary-900 placeholder:text-primary-600/60"
            />
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
                  onClick={() => router.push(`/leads/${lead.id}`)}
                  className="hover:bg-primary-50/30 transition-colors group cursor-pointer"
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
                          <p className="text-sm font-bold text-primary-900">{lead.name}</p>
                          <div className="relative inline-block w-auto" title="点击修改评级">
                            <div 
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdown(openDropdown === `rating-${lead.id}` ? null : `rating-${lead.id}`);
                              }}
                              className="cursor-pointer"
                            >
                              {getRatingBadge(lead.rating)}
                            </div>
                            {openDropdown === `rating-${lead.id}` && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
                                <div className="absolute z-20 w-16 mt-1.5 bg-white border border-primary-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 py-1 left-0">
                                  {["A", "B", "C", "D"].map(option => (
                                    <div 
                                      key={option}
                                      onClick={() => { updateLeadRating(lead.id, option); setOpenDropdown(null); }}
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
                        </div>
                        <p className="text-xs text-primary-600 font-mono">{lead.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 whitespace-nowrap">
                    <div className="relative inline-block w-auto">
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdown(openDropdown === `status-${lead.id}` ? null : `status-${lead.id}`);
                        }}
                        className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium border whitespace-nowrap cursor-pointer transition-colors ${getStatusColor(lead.status)} hover:opacity-80`}
                      >
                        {lead.status}
                        <ChevronDown className={`w-3.5 h-3.5 ml-1.5 opacity-50 transition-transform ${openDropdown === `status-${lead.id}` ? 'rotate-180' : ''}`} />
                      </div>
                      {openDropdown === `status-${lead.id}` && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
                          <div className="absolute z-20 w-32 mt-1.5 bg-white border border-primary-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 py-1 left-0">
                            {["沟通中", "已量房", "方案阶段", "已交定金", "已签单", "已流失"].map(option => (
                              <div 
                                key={option}
                                onClick={() => { updateLeadStatus(lead.id, option); setOpenDropdown(null); }}
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
                    <p className="text-sm font-medium text-primary-900 truncate max-w-[200px]" title={lead.address}>{lead.address}</p>
                    <p className="text-xs text-primary-600 mt-0.5">{lead.requirementType} · {lead.area}m² · 预算: {lead.budget}</p>
                  </td>
                  <td className="py-4 px-6 whitespace-nowrap">
                    <div className="text-sm text-primary-900 flex items-center relative">
                      <span className="text-primary-600 w-12 text-xs">销售:</span>
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdown(openDropdown === `sales-${lead.id}` ? null : `sales-${lead.id}`);
                        }}
                        className={`cursor-pointer transition-colors border px-2 py-0.5 rounded text-xs font-medium flex items-center group/sales ${
                          lead.sales === "未分配" 
                            ? "text-amber-600 bg-amber-50 hover:bg-amber-100 border-amber-100" 
                            : "text-primary-700 bg-white hover:bg-primary-50 border-primary-200"
                        }`}
                      >
                        {lead.sales === "未分配" && <UserPlus className="w-3 h-3 mr-1" />}
                        {lead.sales}
                        <ChevronDown className="w-3 h-3 ml-1 opacity-0 group-hover/sales:opacity-100 transition-opacity" />
                      </div>
                      {openDropdown === `sales-${lead.id}` && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setOpenDropdown(null); }} />
                          <div className="absolute z-20 w-36 mt-8 bg-white border border-primary-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 py-1 left-12">
                            {["未分配", "王销售", "刘销售", "张销售"].map(option => (
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
                          setOpenDropdown(openDropdown === `designer-${lead.id}` ? null : `designer-${lead.id}`);
                        }}
                        className={`cursor-pointer transition-colors border px-2 py-0.5 rounded text-xs font-medium flex items-center group/designer ${
                          lead.designer === "未分配" 
                            ? "text-amber-600 bg-amber-50 hover:bg-amber-100 border-amber-100" 
                            : "text-primary-700 bg-white hover:bg-primary-50 border-primary-200"
                        }`}
                      >
                        {lead.designer === "未分配" && <UserPlus className="w-3 h-3 mr-1" />}
                        {lead.designer}
                        <ChevronDown className="w-3 h-3 ml-1 opacity-0 group-hover/designer:opacity-100 transition-opacity" />
                      </div>
                      {openDropdown === `designer-${lead.id}` && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setOpenDropdown(null); }} />
                          <div className="absolute z-20 w-36 mt-8 bg-white border border-primary-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 py-1 left-12">
                            {["未分配", "赵设计", "陈总监", "李设计"].map(option => (
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
                        {["自然进店", "抖音", "老介新", "自有关系"].map(option => (
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

