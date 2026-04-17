"use client";

import { useState, useEffect, Suspense } from "react";
import { Search, Filter, AlertCircle, CheckCircle2, Clock, Camera, HardHat, AlertTriangle, PlayCircle, X, ChevronDown, Check, Activity, FolderOpen, Hammer } from "lucide-react";
import MainLayout from "../../components/MainLayout";
import { useRouter, useSearchParams } from "next/navigation";
import CustomerInfo from "../../components/CustomerInfo";

function ProjectsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadIdFilter = searchParams.get('leadId') || '';
  const [projectsData, setProjectsData] = useState<any[]>([]);
  const [activeStatus, setActiveStatus] = useState("全部");
  const [searchQuery, setSearchQuery] = useState("");

  // 高级筛选器状态
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
  const [filterYear, setFilterYear] = useState(`${new Date().getFullYear()}年`);
  const [filterMonth, setFilterMonth] = useState("全部");
  const [filterDay, setFilterDay] = useState("");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [filterManager, setFilterManager] = useState("全部");
  const [isManagerDropdownOpen, setIsManagerDropdownOpen] = useState(false);
  const [filterHealth, setFilterHealth] = useState("全部");
  const [isHealthDropdownOpen, setIsHealthDropdownOpen] = useState(false);

  // 移除 body scroll lock，允许筛选框滚动

  const nodesList = ["开工", "水电", "木工", "瓦工", "墙面", "定制", "软装", "交付"];

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const url = leadIdFilter ? `/api/projects?leadId=${leadIdFilter}` : '/api/projects';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const formatted = data.map((item: any) => {
          let dateStr = new Date().toISOString().split('T')[0];
          if (item.createdAt) {
            try {
              if (item.createdAt.$date) {
                dateStr = new Date(item.createdAt.$date).toISOString().split('T')[0];
              } else {
                dateStr = new Date(item.createdAt).toISOString().split('T')[0];
              }
            } catch(err) {
              console.error('Date parse error', err);
            }
          }
          return {
            ...item,
            id: item._id,
            createdAt: dateStr
          };
        });
        setProjectsData(formatted);
      }
    } catch (e) {
      console.error('Failed to fetch projects', e);
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

  // 动态计算已耗时
  const calculateDaysElapsed = (startDateStr: string) => {
    if (!startDateStr) return 0;
    const start = new Date(startDateStr);
    const now = new Date();
    // 去除时分秒的差异，只计算天数差
    start.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diffTime = Math.abs(now.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const statuses = ["全部", "未开工", "施工中", "已竣工", "已停工"];

  // Sort by health status to put "严重延期" and "预警" on top
  const sortedProjects = [...projectsData].sort((a, b) => {
    const priority = { "严重延期": 3, "预警": 2, "正常": 1 };
    return (priority[b.health as keyof typeof priority] || 0) - (priority[a.health as keyof typeof priority] || 0);
  });

  const filteredProjects = sortedProjects.filter(p => {
    if (activeStatus !== "全部" && p.status !== activeStatus) return false;
    if (searchQuery && !p.customer.includes(searchQuery) && !p.manager.includes(searchQuery)) return false;

    // 高级筛选: 开工时间
    if (filterYear !== "全部") {
      const yearNumberStr = filterYear.replace('年', '');
      if (!p.startDate.startsWith(yearNumberStr)) return false;
    }
    if (filterMonth !== "全部") {
      const yearNumberStr = filterYear !== "全部" ? filterYear.replace('年', '') : new Date().getFullYear().toString();
      const monthNumberStr = filterMonth.replace('月', '').padStart(2, '0');
      if (!p.startDate.startsWith(`${yearNumberStr}-${monthNumberStr}`)) return false;
    }
    if (filterDay && !p.startDate.endsWith(`-${filterDay.padStart(2, '0')}`)) return false;

    // 高级筛选: 项目经理
    if (filterManager !== "全部" && p.manager !== filterManager) return false;

    // 高级筛选: 健康度
    if (filterHealth !== "全部" && p.health !== filterHealth) return false;

    return true;
  });

  return (
    <MainLayout>
      <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-4 md:space-y-8">
        {/* 顶部标题区与数据看板 */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-primary-900">施工管理</h1>
              <p className="text-primary-600 mt-2">8个标准施工节点管控，异常工地自动置顶预警</p>
            </div>
            <div>
              <button
                onClick={() => {
                  const params = new URLSearchParams();
                  if (leadIdFilter) params.set('leadId', leadIdFilter);
                  const qs = params.toString();
                  router.push(`/projects/new${qs ? '?' + qs : ''}`);
                }}
                className="flex items-center px-4 py-2.5 bg-primary-900 text-white rounded-lg hover:bg-primary-800 transition-colors shadow-sm font-medium"
              >
                <Hammer className="w-5 h-5 mr-2" />
                新建工地
              </button>
            </div>
          </div>

          {/* 数据看板 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-primary-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <FolderOpen className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-primary-500">总工地数</p>
                <p className="text-2xl font-bold text-primary-900">{projectsData.length}</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-primary-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-primary-500">施工中</p>
                <p className="text-2xl font-bold text-primary-900">{projectsData.filter(p => p.status === '施工中').length}</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-primary-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-primary-500">预警/延期</p>
                <p className="text-2xl font-bold text-primary-900">{projectsData.filter(p => p.health === '预警' || p.health === '严重延期').length}</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-primary-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Check className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-primary-500">已竣工</p>
                <p className="text-2xl font-bold text-primary-900">{projectsData.filter(p => p.status === '已竣工').length}</p>
              </div>
            </div>
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

          <div className="flex items-center gap-2 w-full sm:w-auto relative">
            {/* 高级筛选按钮 */}
            <button 
              onClick={() => setIsAdvancedFilterOpen(!isAdvancedFilterOpen)}
              className={`relative flex items-center justify-center min-w-[44px] min-h-[44px] px-3 sm:px-4 py-2.5 rounded-lg text-sm transition-colors whitespace-nowrap font-medium shrink-0 border ${
                isAdvancedFilterOpen || filterYear !== '全部' || filterMonth !== '全部' || filterDay || filterManager !== '全部' || filterHealth !== '全部'
                  ? "bg-primary-50 border-primary-300 text-primary-900 ring-2 ring-primary-100" 
                  : "bg-white border-primary-100 hover:bg-primary-50 text-primary-900"
              }`}
            >
              <Filter className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">高级筛选</span>
              {/* 如果有筛选条件，显示小红点 */}
              {(filterYear !== '全部' || filterMonth !== '全部' || filterDay || filterManager !== '全部' || filterHealth !== '全部') && (
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
                    {/* 开工时间范围 */}
                    <div className="space-y-2 relative z-50">
                      <label className="block text-xs font-medium text-primary-600 mb-1">开工时间</label>
                      <div className="flex items-center gap-2">
                        <div className="relative z-30 w-1/3">
                          <div 
                            onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === 'filter-year' ? null : 'filter-year'); setIsManagerDropdownOpen(false); setIsHealthDropdownOpen(false); }}
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
                        <div className="relative z-30 w-1/3">
                          <div 
                            onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === 'filter-month' ? null : 'filter-month'); setIsManagerDropdownOpen(false); setIsHealthDropdownOpen(false); }}
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

                    {/* 项目经理筛选 */}
                    <div className="space-y-2 relative z-40">
                      <label className="block text-xs font-medium text-primary-600">负责项目经理</label>
                      <div 
                        onClick={(e) => { e.stopPropagation(); setIsManagerDropdownOpen(!isManagerDropdownOpen); setIsHealthDropdownOpen(false); }}
                        className={`w-full px-3 py-2 bg-primary-50 border border-transparent rounded-lg text-sm transition-all cursor-pointer flex justify-between items-center ${isManagerDropdownOpen ? 'bg-white border-primary-300 ring-2 ring-primary-100' : 'hover:bg-primary-100/50'}`}
                      >
                        <span className="text-primary-900 text-xs">
                          {filterManager}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-primary-400 transition-transform duration-200 ${isManagerDropdownOpen ? 'rotate-180' : ''}`} />
                      </div>
                      
                      {isManagerDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-primary-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 py-1 z-40 max-h-48 overflow-y-auto">
                          {["全部", ...Array.from(new Set(projectsData.map(p => p.manager)))].map((option) => (
                            <div 
                              key={option}
                              onClick={(e) => { 
                                e.stopPropagation();
                                setFilterManager(option);
                                setIsManagerDropdownOpen(false);
                              }}
                              className="px-2 py-1 mx-1"
                            >
                              <div className={`flex items-center justify-between px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${filterManager === option ? 'bg-primary-50/80 text-primary-900 font-medium' : 'text-primary-700 hover:bg-primary-50'}`}>
                                <span className="text-xs">{option}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 健康度筛选 */}
                    <div className="space-y-2 relative z-10">
                      <label className="block text-xs font-medium text-primary-600">健康度</label>
                      <div 
                        onClick={(e) => { e.stopPropagation(); setIsHealthDropdownOpen(!isHealthDropdownOpen); setIsManagerDropdownOpen(false); }}
                        className={`w-full px-3 py-2 bg-primary-50 border border-transparent rounded-lg text-sm transition-all cursor-pointer flex justify-between items-center ${isHealthDropdownOpen ? 'bg-white border-primary-300 ring-2 ring-primary-100' : 'hover:bg-primary-100/50'}`}
                      >
                        <span className="text-primary-900 text-xs">
                          {filterHealth}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-primary-400 transition-transform duration-200 ${isHealthDropdownOpen ? 'rotate-180' : ''}`} />
                      </div>
                      
                      {isHealthDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-primary-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 py-1 z-40">
                          {["全部", "正常", "预警", "严重延期"].map((option) => (
                            <div 
                              key={option}
                              onClick={(e) => { 
                                e.stopPropagation();
                                setFilterHealth(option);
                                setIsHealthDropdownOpen(false);
                              }}
                              className="px-2 py-1 mx-1"
                            >
                              <div className={`flex items-center justify-between px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${filterHealth === option ? 'bg-primary-50/80 text-primary-900 font-medium' : 'text-primary-700 hover:bg-primary-50'}`}>
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
                          setFilterYear(`${new Date().getFullYear()}年`);
                          setFilterMonth("全部");
                          setFilterDay("");
                          setFilterManager("全部");
                          setFilterHealth("全部");
                          setIsAdvancedFilterOpen(false);
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
                placeholder="搜索客户 / 项目经理..."
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

        {/* 项目卡片列表 */}
        <div className="space-y-4">
          {filteredProjects.map((project) => (
            <div 
              key={project.id} 
              onClick={() => router.push(`/projects/${project.id}`)}
              className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-colors cursor-pointer hover:border-primary-900/50 hover:shadow-md ${project.health === "严重延期" ? "border-rose-300" : "border-primary-100"}`}
            >
              {/* 卡片头部信息 */}
              <div className="p-5 border-b border-primary-50 flex flex-wrap gap-4 items-center justify-between bg-primary-50/20">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${project.health === "严重延期" ? "bg-rose-100 text-rose-700" : "bg-primary-900 text-white"}`}>
                      {project.customer?.charAt(0) || '-'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <CustomerInfo 
                          name={project.customer}
                          phone={project.phone}
                          customerNo={project.customerNo || project.id}
                        />
                        {project.rating === 'A' && (
                          <span className="px-2 py-0.5 bg-primary-900 text-white text-[10px] font-bold rounded uppercase tracking-wider ml-2">VIP</span>
                        )}
                      </div>
                      <p className="text-sm text-primary-600 mt-0.5">项目经理: <span className="font-medium text-primary-900">{project.manager}</span></p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                  <div className="flex gap-6 w-full sm:w-auto">
                    <div>
                      <p className="text-xs text-primary-600 mb-1">开工时间</p>
                      <p className="text-sm font-medium text-primary-900">{project.startDate}</p>
                    </div>
                    <div>
                      <p className="text-xs text-primary-600 mb-1">{project.status === '已竣工' ? '完工时间' : '预计完工时间'}</p>
                      <p className="text-sm font-medium text-primary-900">{project.endDate || "未定"}</p>
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-xs text-primary-600 mb-1">已耗时</p>
                      <p className="text-sm font-medium text-primary-900 font-mono">{calculateDaysElapsed(project.startDate)}天</p>
                    </div>
                  </div>
                  <div className="h-8 w-px bg-primary-100 hidden sm:block"></div>
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium border ${getHealthColor(project.health)}`}>
                      {getHealthIcon(project.health)}
                      {project.health}
                    </span>
                  </div>
                </div>
              </div>

              {/* 8节点进度条展示 */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-primary-900">当前阶段: {project.nodeName}</h4>
                  <span className="text-sm font-mono text-primary-600">{project.currentNode} / 8</span>
                </div>
                
                <div className="relative px-6">
                  {/* 背景连接线 */}
                  <div className="absolute top-1/2 left-6 right-6 h-1 bg-primary-100 -translate-y-1/2 rounded-full"></div>
                  
                  {/* 进度连接线 */}
                  <div 
                    className="absolute top-1/2 left-6 h-1 bg-primary-900 -translate-y-1/2 rounded-full transition-all duration-500"
                    style={{ width: `calc((100% - 48px) * ${Math.max(0, (project.currentNode - 1) / (nodesList.length - 1))})` }}
                  ></div>

                  {/* 节点点阵 */}
                  <div className="relative flex justify-between">
                    {nodesList.map((node, index) => {
                      const isCompleted = index + 1 < project.currentNode;
                      const isCurrent = index + 1 === project.currentNode;
                      const isPending = index + 1 > project.currentNode;

                      return (
                        <div key={index} className="flex flex-col items-center group">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center z-10 transition-colors ${isCompleted ? 'bg-primary-900 text-white' : isCurrent ? 'bg-amber-500 text-white ring-4 ring-amber-100' : 'bg-primary-100 text-primary-400'}`}>
                            {isCompleted && <CheckCircle2 className="w-3.5 h-3.5" />}
                            {isCurrent && <PlayCircle className="w-3.5 h-3.5" />}
                          </div>
                          
                          {/* 节点名称悬浮提示 */}
                          <div className={`absolute mt-8 text-xs whitespace-nowrap transition-all ${isCurrent ? 'font-bold text-primary-900' : 'text-primary-400'}`}>
                            {node}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 快捷操作区 - 保证一致的留白与高度 */}
                <div className="mt-12 flex justify-end gap-3 min-h-[44px]">
                  {project.status === "已竣工" ? (
                    <div className="flex items-center justify-center px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-bold w-full sm:w-auto border border-emerald-100">
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      项目已交付
                    </div>
                  ) : (
                    <button 
                      onClick={() => router.push(`/projects/${project.id}`)}
                      className="flex items-center justify-center px-4 py-2 bg-primary-50 text-primary-900 rounded-lg hover:bg-primary-100 transition-colors text-sm font-medium w-full sm:w-auto"
                    >
                      查看详情
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filteredProjects.length === 0 && (
            <div className="py-20 text-center text-primary-600 bg-white rounded-xl border border-primary-100 shadow-sm">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>暂无符合条件的施工项目</p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<MainLayout><div className="p-8 text-center text-primary-500">加载中...</div></MainLayout>}>
      <ProjectsContent />
    </Suspense>
  );
}
