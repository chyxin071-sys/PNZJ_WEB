"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, Filter, MoreHorizontal, FileEdit, FileCheck, FileX, Printer, Calculator, PackagePlus, X, ArrowRight, Building2, SlidersHorizontal, ChevronDown, CheckCircle2 } from "lucide-react";
import MainLayout from "../../components/MainLayout";
import CustomerInfo from "../../components/CustomerInfo";

export default function QuotesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeStatus, setActiveStatus] = useState("全部");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSelectLeadModalOpen, setIsSelectLeadModalOpen] = useState(false);
  const [leadSearchQuery, setLeadSearchQuery] = useState("");
  const [showSavedToast, setShowSavedToast] = useState(false);

  const [quotesData, setQuotesData] = useState<any[]>([]);
  const [leadsData, setLeadsData] = useState<any[]>([]);

  // 高级筛选器状态
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
  const [filterMinAmount, setFilterMinAmount] = useState("");
  const [filterMaxAmount, setFilterMaxAmount] = useState("");
  const [filterYear, setFilterYear] = useState("全部");
  const [filterMonth, setFilterMonth] = useState("全部");
  const [filterDay, setFilterDay] = useState("");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [filterPersonnel, setFilterPersonnel] = useState("全部");
  const [isPersonnelDropdownOpen, setIsPersonnelDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchQuotes();
    fetchLeads();
    if (searchParams.get('saved') === '1') {
      setShowSavedToast(true);
      setTimeout(() => setShowSavedToast(false), 3000);
    }
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeStatus, searchQuery, filterMinAmount, filterMaxAmount, filterYear, filterMonth, filterDay, filterPersonnel]);

  const fetchQuotes = async () => {
    try {
      const res = await fetch('/api/quotes');
      if (res.ok) {
        const data = await res.json();
        const formatted = data.map((item: any) => {
          let dateStr = new Date().toISOString().split('T')[0];
          let timestamp = Date.now();
          if (item.createdAt) {
            try {
              if (item.createdAt.$date) {
                const d = new Date(item.createdAt.$date);
                dateStr = d.toISOString().split('T')[0];
                timestamp = d.getTime();
              } else {
                const d = new Date(item.createdAt);
                dateStr = d.toISOString().split('T')[0];
                timestamp = d.getTime();
              }
            } catch(err) {}
          }
          return {
            ...item,
            id: item._id,
            date: dateStr,
            _timestamp: timestamp
          };
        });
        // 按客户分组，计算每份报价单是该客户的第几版（按创建时间升序）
        const versionMap: Record<string, number> = {};
        const sortedByDate = [...formatted].sort((a, b) => a._timestamp - b._timestamp);
        sortedByDate.forEach(q => {
          const key = q.leadId || q.customer;
          if (!key) return;
          versionMap[q.id] = (versionMap[key] || 0) + 1;
          versionMap[key] = versionMap[q.id];
        });
        setQuotesData(formatted.map(q => ({ ...q, versionNo: versionMap[q.id] || 1 })));
      }
    } catch (e) {
      console.error('Failed to fetch quotes', e);
    }
  };

  const fetchLeads = async () => {
    try {
      const res = await fetch('/api/leads');
      if (res.ok) {
        const data = await res.json();
        setLeadsData(data.map((item: any) => ({
          ...item,
          id: item._id
        })));
      }
    } catch (e) {
      console.error('Failed to fetch leads', e);
    }
  };

  useEffect(() => {
    if (isSelectLeadModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isSelectLeadModalOpen]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "初步": return "bg-zinc-50 text-zinc-600 border-zinc-200";
      case "确认版": return "bg-amber-50 text-amber-600 border-amber-100";
      case "最终版": return "bg-emerald-50 text-emerald-600 border-emerald-100";
      default: return "bg-zinc-50 text-zinc-700 border-zinc-200";
    }
  };

  const statuses = ["全部", "初步", "确认版", "最终版"];

  const filteredQuotes = quotesData
    .filter(q => activeStatus === "全部" || q.status === activeStatus)
    .filter(q =>
      (q.customer || '').includes(searchQuery) ||
      (q.phone || '').includes(searchQuery) ||
      (q.address && q.address.includes(searchQuery)) ||
      (q.id || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter(q => {
      const min = parseFloat(filterMinAmount);
      const max = parseFloat(filterMaxAmount);
      if (!isNaN(min) && q.final < min) return false;
      if (!isNaN(max) && q.final > max) return false;
      if (filterYear !== "全部" && !q.date.startsWith(filterYear)) return false;
      if (filterMonth !== "全部" && !q.date.startsWith(`${filterYear !== "全部" ? filterYear : new Date().getFullYear()}-${filterMonth.padStart(2, '0')}`)) return false;
      if (filterDay && !q.date.endsWith(`-${filterDay.padStart(2, '0')}`)) return false;
      if (filterPersonnel !== '全部' && q.sales !== filterPersonnel) return false;
      return true;
    });

  const totalPages = Math.ceil(filteredQuotes.length / itemsPerPage);
  const paginatedQuotes = filteredQuotes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <MainLayout>
      {showSavedToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-medium">报价单保存成功！</span>
        </div>
      )}
      <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-4 md:space-y-8">
        {/* 顶部标题区 */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-primary-900">报价管理</h1>
            <p className="text-primary-600 mt-2">独立报价核算模块，支持引用材料库标准物料或灵活手写录入</p>
          </div>
          <button 
            onClick={() => setIsSelectLeadModalOpen(true)}
            className="flex items-center justify-center min-h-[44px] px-4 py-2.5 bg-primary-900 text-white rounded-lg hover:bg-primary-800 transition-colors shadow-sm font-medium w-full sm:w-auto"
          >
            <Plus className="w-5 h-5 mr-2" />
            新建报价单
          </button>
        </div>

        {/* 筛选与搜索 - 融合风格 */}
      <div className="bg-white p-5 rounded-xl border border-primary-100 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex space-x-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 hide-scrollbar">
            {statuses.map((status) => (
                <button
                  key={status}
                  onClick={() => setActiveStatus(status)}
                  className={`min-h-[44px] px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeStatus === status ? "bg-primary-900 text-white shadow-md" : "bg-primary-50 text-primary-600 hover:bg-primary-100"}`}
                >
                  {status}
                </button>
              ))}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto relative">
            {/* 高级筛选按钮 */}
            <button 
              onClick={() => setIsAdvancedFilterOpen(!isAdvancedFilterOpen)}
              className={`relative flex items-center justify-center min-w-[44px] min-h-[44px] px-3 sm:px-4 py-2.5 rounded-lg text-sm transition-colors whitespace-nowrap font-medium shrink-0 border ${
                isAdvancedFilterOpen || filterMinAmount || filterMaxAmount || filterYear !== '全部' || filterMonth !== '全部' || filterDay || filterPersonnel !== '全部'
                  ? "bg-primary-50 border-primary-300 text-primary-900 ring-2 ring-primary-100" 
                  : "bg-white border-primary-100 hover:bg-primary-50 text-primary-900"
              }`}
            >
              <Filter className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">高级筛选</span>
              {/* 如果有筛选条件，显示小红点 */}
              {(filterMinAmount || filterMaxAmount || filterYear !== '全部' || filterMonth !== '全部' || filterDay || filterPersonnel !== '全部') && (
                <span className="absolute top-2.5 right-2.5 sm:static sm:ml-2 w-2 h-2 bg-rose-500 rounded-full"></span>
              )}
              <ChevronDown className={`hidden sm:inline-block w-4 h-4 ml-1 opacity-50 transition-transform ${isAdvancedFilterOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* 高级筛选浮层 */}
            {isAdvancedFilterOpen && (
              <>
                <div className="fixed inset-0 z-40 bg-black/20 sm:bg-transparent" onClick={() => setIsAdvancedFilterOpen(false)} />
                <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-[340px] sm:absolute sm:top-full sm:left-0 sm:-translate-x-0 sm:-translate-y-0 sm:transform-none sm:w-80 sm:max-w-none mt-0 sm:mt-2 z-50 bg-white border border-primary-100 rounded-xl shadow-xl p-4 sm:p-5 animate-in fade-in zoom-in-95 sm:zoom-in-100 slide-in-from-top-2 duration-150">
                  <div className="space-y-4">
                    {/* 报价金额范围 */}
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-primary-600">成交金额范围 (¥)</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          placeholder="最低金额"
                          value={filterMinAmount}
                          onChange={(e) => setFilterMinAmount(e.target.value)}
                          className="w-1/2 px-3 py-2 bg-primary-50 border border-transparent rounded-lg focus:border-primary-300 focus:bg-white focus:ring-2 focus:ring-primary-100 outline-none transition-all text-xs text-primary-900"
                        />
                        <span className="text-primary-400 text-xs">-</span>
                        <input 
                          type="number" 
                          placeholder="最高金额"
                          value={filterMaxAmount}
                          onChange={(e) => setFilterMaxAmount(e.target.value)}
                          className="w-1/2 px-3 py-2 bg-primary-50 border border-transparent rounded-lg focus:border-primary-300 focus:bg-white focus:ring-2 focus:ring-primary-100 outline-none transition-all text-xs text-primary-900"
                        />
                      </div>
                    </div>

                    {/* 创建时间范围 */}
                    <div className="relative z-50">
                      <label className="block text-xs font-medium text-primary-600 mb-1">创建时间</label>
                      <div className="flex items-center gap-2">
                        <div className="relative z-50 w-1/3">
                          <div 
                            onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === 'filter-year' ? null : 'filter-year'); setIsPersonnelDropdownOpen(false); }}
                            className={`w-full px-2 py-2 bg-primary-50 border border-transparent rounded-lg text-xs transition-all cursor-pointer flex justify-between items-center ${openDropdown === 'filter-year' ? 'bg-white border-primary-300 ring-2 ring-primary-100' : 'hover:bg-primary-100/50'}`}
                          >
                            <span className="text-primary-900 truncate">{filterYear === "全部" ? "年份" : filterYear}</span>
                            <ChevronDown className={`w-3 h-3 text-primary-400 transition-transform duration-200 shrink-0 ${openDropdown === 'filter-year' ? 'rotate-180' : ''}`} />
                          </div>
                          {openDropdown === 'filter-year' && (
                            <div className="absolute z-40 w-full mt-1.5 bg-white border border-primary-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 py-1 max-h-48 overflow-y-auto" onClick={e => e.stopPropagation()}>
                              {["全部", "2026", "2025", "2024", "2023", "2022", "2021", "2020"].map(option => (
                                <div 
                                  key={option}
                                  onClick={() => { setFilterYear(option); setOpenDropdown(null); }}
                                  className="px-1 py-1"
                                >
                                  <div className={`flex items-center justify-center px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${filterYear === option ? 'bg-primary-50/80 text-primary-900 font-medium' : 'text-primary-700 hover:bg-primary-50'}`}>
                                    <span className="text-xs">{option === "全部" ? "全部" : option}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="text-primary-400 text-xs">-</span>
                        <div className="relative z-40 w-1/3">
                          <div 
                            onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === 'filter-month' ? null : 'filter-month'); setIsPersonnelDropdownOpen(false); }}
                            className={`w-full px-2 py-2 bg-primary-50 border border-transparent rounded-lg text-xs transition-all cursor-pointer flex justify-between items-center ${openDropdown === 'filter-month' ? 'bg-white border-primary-300 ring-2 ring-primary-100' : 'hover:bg-primary-100/50'}`}
                          >
                            <span className="text-primary-900 truncate">{filterMonth === "全部" ? "月份" : filterMonth}</span>
                            <ChevronDown className={`w-3 h-3 text-primary-400 transition-transform duration-200 shrink-0 ${openDropdown === 'filter-month' ? 'rotate-180' : ''}`} />
                          </div>
                          {openDropdown === 'filter-month' && (
                            <div className="absolute z-40 w-full mt-1.5 bg-white border border-primary-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 py-1 max-h-48 overflow-y-auto" onClick={e => e.stopPropagation()}>
                              {["全部", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].map(option => (
                                <div 
                                  key={option}
                                  onClick={() => { setFilterMonth(option); setOpenDropdown(null); }}
                                  className="px-1 py-1"
                                >
                                  <div className={`flex items-center justify-center px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${filterMonth === option ? 'bg-primary-50/80 text-primary-900 font-medium' : 'text-primary-700 hover:bg-primary-50'}`}>
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
                          value={filterDay}
                          onChange={e => setFilterDay(e.target.value)}
                          className="w-1/3 px-2 py-2 bg-primary-50 border border-transparent rounded-lg text-xs focus:border-primary-300 focus:bg-white focus:ring-2 focus:ring-primary-100 outline-none transition-all text-primary-900 text-center placeholder:text-primary-400"
                        />
                      </div>
                    </div>

                    {/* 人员筛选 */}
                    <div className="space-y-2 relative z-20">
                      <label className="block text-xs font-medium text-primary-600">负责销售</label>
                      <div 
                        onClick={(e) => { e.stopPropagation(); setIsPersonnelDropdownOpen(!isPersonnelDropdownOpen); }}
                        className={`w-full px-3 py-2 bg-primary-50 border border-transparent rounded-lg text-sm transition-all cursor-pointer flex justify-between items-center ${isPersonnelDropdownOpen ? 'bg-white border-primary-300 ring-2 ring-primary-100' : 'hover:bg-primary-100/50'}`}
                      >
                        <span className="text-primary-900 text-xs">
                          {filterPersonnel}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-primary-400 transition-transform duration-200 ${isPersonnelDropdownOpen ? 'rotate-180' : ''}`} />
                      </div>
                      
                      {isPersonnelDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-primary-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 py-1 z-40">
                          {["全部", "王销售", "李销售", "刘销售", "张销售"].map((option) => (
                            <div 
                              key={option}
                              onClick={(e) => { 
                                e.stopPropagation();
                                setFilterPersonnel(option);
                                setIsPersonnelDropdownOpen(false);
                              }}
                              className="px-2 py-1 mx-1"
                            >
                              <div className={`flex items-center justify-between px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${filterPersonnel === option ? 'bg-primary-50/80 text-primary-900 font-medium' : 'text-primary-700 hover:bg-primary-50'}`}>
                                <span className="text-xs">{option}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 flex gap-2">
                      <button 
                        onClick={() => {
                          setFilterMinAmount("");
                          setFilterMaxAmount("");

                          setFilterPersonnel("全部");
                        }}
                        className="flex-1 px-3 py-2 border border-primary-200 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors text-sm font-medium"
                      >
                        重置
                      </button>
                      <button 
                        onClick={() => setIsAdvancedFilterOpen(false)}
                        className="flex-1 px-3 py-2 bg-primary-900 text-white rounded-lg hover:bg-primary-800 transition-colors shadow-sm text-sm font-medium"
                      >
                        应用
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="relative flex-1 sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-600" />
              <input
                type="text"
                placeholder="搜索客户 / 手机号 / 编号..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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

        {/* 数据表格 */}
        <div className="bg-white rounded-xl border border-primary-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-primary-50/50 border-b border-primary-100 text-primary-600 text-sm">
                  <th className="py-4 px-6 font-medium whitespace-nowrap">客户编号 / 姓名</th>
                  <th className="py-4 px-6 font-medium whitespace-nowrap">房屋信息</th>
                  <th className="py-4 px-6 font-medium whitespace-nowrap">报价明细</th>
                  <th className="py-4 px-6 font-medium whitespace-nowrap">创建人员</th>
                  <th className="py-4 px-6 font-medium whitespace-nowrap">当前状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-100 text-sm">
                {paginatedQuotes
                  .map((quote) => (
                  <tr 
                    key={quote.id} 
                    onClick={() => router.push(`/quotes/${quote.id}`)}
                    className="hover:bg-primary-50/50 transition-colors group cursor-pointer"
                  >
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div onClick={(e) => { if (quote.leadId) { e.stopPropagation(); router.push(`/leads/${quote.leadId}`); } }}>
                        <CustomerInfo
                          name={quote.customer}
                          phone={quote.phone}
                          customerNo={quote.customerNo || quote.id}
                        />
                        <div className="flex items-center gap-2 mt-0.5">
                          {quote.versionNo > 1 && (
                            <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">第{quote.versionNo}版</span>
                          )}
                          {quote.leadId && (
                            <span className="text-xs text-primary-400 hover:text-primary-700">点击查看线索 →</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium text-primary-900 truncate max-w-[200px]" title={quote.address || "暂无地址"}>{quote.address || "暂无地址"}</span>
                        <span className="text-xs text-primary-600">
                          {(quote as any).requirementType && <span>{(quote as any).requirementType}</span>}
                          {((quote as any).requirementType && (quote as any).area) && <span> · </span>}
                          {(quote as any).area && <span>{(quote as any).area}m²</span>}
                          {((quote as any).area && (quote as any).budget) && <span> · </span>}
                          {(quote as any).budget && <span>预算: {(quote as any).budget}</span>}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap min-w-[200px]">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-primary-600">总价:</span>
                          <span className="font-mono">¥{(quote.total || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs text-rose-500">
                          <span>优惠:</span>
                          <span className="font-mono">-¥{(quote.discount || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold text-primary-900 pt-1 border-t border-primary-100 border-dashed">
                          <span>成交价:</span>
                          <span className="font-mono">¥{(quote.final || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <span className="text-sm text-primary-900">{quote.sales}</span>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${getStatusColor(quote.status)}`}>
                        {quote.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 分页控件 */}
        {filteredQuotes.length > 0 && (
          <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-4 flex flex-col sm:flex-row items-center justify-between text-sm text-primary-600 gap-4">
            <p>显示 {(currentPage - 1) * itemsPerPage + 1} 至 {Math.min(currentPage * itemsPerPage, filteredQuotes.length)} 条，共 {filteredQuotes.length} 条</p>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 min-h-[44px] flex items-center justify-center border border-primary-100 rounded-lg hover:bg-primary-50 disabled:opacity-50 font-medium transition-colors"
              >
                上一页
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-4 py-2 min-h-[44px] flex items-center justify-center border border-primary-100 rounded-lg hover:bg-primary-50 disabled:opacity-50 font-medium transition-colors"
              >
                下一页
              </button>
            </div>
          </div>
        )}

        {/* 客户选择弹窗 */}
        {isSelectLeadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col h-[600px] animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between p-6 border-b border-primary-100 shrink-0">
                <h2 className="text-xl font-bold text-primary-900">请选择要关联的客户线索</h2>
                <button onClick={() => setIsSelectLeadModalOpen(false)} className="text-primary-400 hover:text-primary-900 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 border-b border-primary-100 shrink-0 bg-primary-50/50">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-500" />
                  <input 
                    type="text" 
                    placeholder="搜索客户姓名 / 电话..." 
                    value={leadSearchQuery}
                    onChange={(e) => setLeadSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-primary-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-900 outline-none bg-white"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {leadsData
                  .filter(l => !quotesData.some(q => q.customer === l.name && q.phone === l.phone))
                  .filter(l => (l.name || '').includes(leadSearchQuery) || (l.phone || '').includes(leadSearchQuery))
                  .map(lead => (
                  <div 
                    key={lead.id}
                    onClick={() => router.push(`/quotes/new?leadId=${lead.id}`)}
                    className="flex items-center justify-between p-4 border border-primary-100 rounded-xl hover:bg-primary-50 hover:border-primary-300 transition-all cursor-pointer group bg-white"
                  >
                    <div>
                      <div className="mb-2">
                        <CustomerInfo 
                          name={lead.name}
                          phone={lead.phone}
                          customerNo={lead.customerNo || lead.id}
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        {lead.address && (
                          <div className="flex items-center text-xs text-primary-500 bg-primary-50 px-2 py-0.5 rounded border border-primary-100">
                            <Building2 className="w-3 h-3 mr-1" />
                            {lead.address}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center text-primary-400 group-hover:text-primary-900 transition-colors">
                      <span className="text-sm font-medium mr-2">新建报价</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                ))}
                {leadsData.filter(l => !quotesData.some(q => q.customer === l.name && q.phone === l.phone)).filter(l => (l.name || '').includes(leadSearchQuery) || (l.phone || '').includes(leadSearchQuery)).length === 0 && (
                  <div className="py-12 text-center text-primary-500 text-sm">
                    没有找到匹配的客户线索，或该客户已存在报价单
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
