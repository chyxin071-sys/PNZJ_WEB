"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, ChevronRight, UploadCloud, AlertCircle, SlidersHorizontal, Filter, X, ChevronDown } from "lucide-react";
import MainLayout from "../../components/MainLayout";
import leadsData from "../../../mock_data/leads.json";

export default function ContractsPage() {
  const router = useRouter();
  const [activeStatus, setActiveStatus] = useState("全部");
  const [searchQuery, setSearchQuery] = useState("");

  // 高级筛选器状态
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
  const [filterMinArea, setFilterMinArea] = useState("");
  const [filterMaxArea, setFilterMaxArea] = useState("");
  const [filterYear, setFilterYear] = useState("全部");
  const [filterMonth, setFilterMonth] = useState("全部");
  const [filterDay, setFilterDay] = useState("");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [filterPersonnel, setFilterPersonnel] = useState("全部");
  const [isPersonnelDropdownOpen, setIsPersonnelDropdownOpen] = useState(false);

  // 移除 body scroll lock，允许筛选框滚动

  const statuses = ["全部", "待上传", "执行中", "已结项"];

  // 从客户线索中提取“已签单”状态的客户作为合同管理的底层数据
  const contractLeads = leadsData.filter(lead => lead.status === "已签单");

  // 模拟分配状态，前几个待上传，后面执行中
  // 为了能演示“新建合同”效果，我们在组件内部维护一个已创建合同的列表（实际中由后端提供）
  const [createdContracts, setCreatedContracts] = useState<string[]>([]);

  const getStatusString = (id: string) => {
    // 如果是新创建的，返回待上传
    if (createdContracts.includes(id)) return "待上传";
    
    const numId = parseInt(id.replace(/[^0-9]/g, ''));
    if (numId % 3 === 0) return "待上传";
    if (numId % 7 === 0) return "已结项";
    return "执行中";
  };

  const getStatusBadge = (id: string) => {
    const status = getStatusString(id);
    if (status === "待上传") {
      return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-rose-50 text-rose-600 border border-rose-100"><AlertCircle className="w-3 h-3 mr-1" />待上传</span>;
    }
    if (status === "已结项") {
      return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-50 text-zinc-600 border border-zinc-200">已结项</span>;
    }
    return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-100">执行中</span>;
  };

  const filteredContracts = contractLeads.filter(lead => {
    const matchesSearch = lead.name.includes(searchQuery) || lead.phone.includes(searchQuery);
    const matchesStatus = activeStatus === "全部" || getStatusString(lead.id) === activeStatus;
    
    // 高级筛选: 房屋面积范围
    let matchesArea = true;
    const min = parseFloat(filterMinArea);
    const max = parseFloat(filterMaxArea);
    if (!isNaN(min) && lead.area < min) matchesArea = false;
    if (!isNaN(max) && lead.area > max) matchesArea = false;
    
    // 高级筛选: 时间范围
    let matchesDate = true;
    if (filterYear !== "全部" && !lead.createdAt.startsWith(filterYear)) matchesDate = false;
    if (filterMonth !== "全部" && !lead.createdAt.startsWith(`${filterYear !== "全部" ? filterYear : new Date().getFullYear()}-${filterMonth.padStart(2, '0')}`)) matchesDate = false;
    if (filterDay && !lead.createdAt.endsWith(`-${filterDay.padStart(2, '0')}`)) matchesDate = false;

    // 高级筛选: 人员
    let matchesPersonnel = true;
    if (filterPersonnel !== '全部' && lead.sales !== filterPersonnel && lead.designer !== filterPersonnel) {
      matchesPersonnel = false;
    }
    
    return matchesSearch && matchesStatus && matchesArea && matchesDate && matchesPersonnel;
  });

  return (
    <MainLayout>
      <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-4 md:space-y-8">
        {/* 顶部标题区 */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-primary-900">合同与款项管理</h1>
            <p className="text-primary-600 mt-2">自动同步已签单客户，管理施工合同文件及各阶段收款进度</p>
          </div>
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

          <div className="flex items-center gap-3 w-full sm:w-auto relative">
            {/* 高级筛选按钮 */}
            <button 
              onClick={() => setIsAdvancedFilterOpen(!isAdvancedFilterOpen)}
              className={`flex items-center justify-center min-h-[44px] px-4 py-2.5 rounded-lg text-sm transition-colors whitespace-nowrap font-medium w-full sm:w-auto border ${
                isAdvancedFilterOpen || filterMinArea || filterMaxArea || filterYear !== '全部' || filterMonth !== '全部' || filterDay || filterPersonnel !== '全部'
                  ? "bg-primary-50 border-primary-300 text-primary-900 ring-2 ring-primary-100" 
                  : "bg-white border-primary-100 hover:bg-primary-50 text-primary-900"
              }`}
            >
              <Filter className="w-4 h-4 mr-2" />
              高级筛选
              {/* 如果有筛选条件，显示小红点 */}
              {(filterMinArea || filterMaxArea || filterYear !== '全部' || filterMonth !== '全部' || filterDay || filterPersonnel !== '全部') && (
                <span className="ml-2 w-2 h-2 bg-rose-500 rounded-full"></span>
              )}
              <ChevronDown className={`hidden sm:block w-4 h-4 ml-1 opacity-50 transition-transform ${isAdvancedFilterOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* 高级筛选浮层 */}
            {isAdvancedFilterOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsAdvancedFilterOpen(false)} />
                <div className="absolute left-0 top-full mt-2 z-50 w-[calc(100vw-2rem)] sm:w-80 bg-white border border-primary-100 rounded-xl shadow-xl p-4 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="space-y-4">
                    {/* 房屋面积范围 */}
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-primary-600">房屋面积范围 (m²)</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          placeholder="最小面积"
                          value={filterMinArea}
                          onChange={(e) => setFilterMinArea(e.target.value)}
                          className="w-1/2 px-3 py-2 bg-primary-50 border border-transparent rounded-lg focus:border-primary-300 focus:bg-white focus:ring-2 focus:ring-primary-100 outline-none transition-all text-xs text-primary-900"
                        />
                        <span className="text-primary-400 text-xs">-</span>
                        <input 
                          type="number" 
                          placeholder="最大面积"
                          value={filterMaxArea}
                          onChange={(e) => setFilterMaxArea(e.target.value)}
                          className="w-1/2 px-3 py-2 bg-primary-50 border border-transparent rounded-lg focus:border-primary-300 focus:bg-white focus:ring-2 focus:ring-primary-100 outline-none transition-all text-xs text-primary-900"
                        />
                      </div>
                    </div>

                    {/* 签订时间范围 */}
                    <div>
                      <label className="block text-xs font-medium text-primary-600 mb-1">签订时间</label>
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
                              {["全部", "2024", "2023", "2022"].map(option => (
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
                      <label className="block text-xs font-medium text-primary-600">负责销售 / 设计</label>
                      <div 
                        onClick={(e) => { e.stopPropagation(); setIsPersonnelDropdownOpen(!isPersonnelDropdownOpen); setIsDateRangeDropdownOpen(false); }}
                        className={`w-full px-3 py-2 bg-primary-50 border border-transparent rounded-lg text-sm transition-all cursor-pointer flex justify-between items-center ${isPersonnelDropdownOpen ? 'bg-white border-primary-300 ring-2 ring-primary-100' : 'hover:bg-primary-100/50'}`}
                      >
                        <span className="text-primary-900 text-xs">
                          {filterPersonnel}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-primary-400 transition-transform duration-200 ${isPersonnelDropdownOpen ? 'rotate-180' : ''}`} />
                      </div>
                      
                      {isPersonnelDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-primary-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 py-1 z-40">
                          {["全部", "王销售", "李销售", "刘销售", "张销售", "赵设计", "陈总监", "李设计"].map((option) => (
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
                          setFilterMinArea("");
                          setFilterMaxArea("");
                          setFilterDateRange("all");
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
                placeholder="搜索客户姓名 / 手机号..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full min-h-[44px] pl-9 pr-4 py-2.5 bg-primary-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary-900 focus:bg-white transition-all outline-none text-primary-900 placeholder:text-primary-600/60"
              />
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
                  <th className="py-4 px-6 font-medium whitespace-nowrap">负责销售 / 设计</th>
                  <th className="py-4 px-6 font-medium whitespace-nowrap">合同状态</th>
                  <th className="py-4 px-6 font-medium whitespace-nowrap text-right">收款进度</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-100 text-sm">
                {filteredContracts.map((lead) => {
                  const statusStr = getStatusString(lead.id);
                  return (
                    <tr 
                      key={lead.id} 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        router.push(`/contracts/${lead.id}`);
                      }}
                      className="hover:bg-primary-50/50 transition-colors group cursor-pointer"
                    >
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-primary-900">{lead.name}</span>
                            <span className="text-xs px-2 py-0.5 bg-primary-100 text-primary-700 rounded font-mono">{lead.id}</span>
                          </div>
                          <p className="text-xs text-primary-600 font-mono mt-1">{lead.phone}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <p className="text-sm font-medium text-primary-900">{lead.address}</p>
                          <p className="text-xs text-primary-600">{lead.requirementType} · {lead.area}m²</p>
                        </div>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <p className="text-sm text-primary-900">{lead.sales} / {lead.designer}</p>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        {getStatusBadge(lead.id)}
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        {statusStr === "待上传" ? (
                          <div className="inline-flex items-center text-rose-500 text-xs font-medium">
                            <UploadCloud className="w-4 h-4 mr-1" />
                            暂未上传合同
                          </div>
                        ) : (
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-200"></span>
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-200"></span>
                            </div>
                            <span className="text-xs text-primary-500">已收 2/4 期</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredContracts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-primary-400">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p>没有找到相关合同信息</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
