"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronRight, Hammer, Users, FileText, Activity, X, Target, ChevronDown } from "lucide-react";
import MainLayout from "../components/MainLayout";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList } from 'recharts';
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();
  
  // 真实数据状态
  const [leadsData, setLeadsData] = useState<any[]>([]);
  const [projectsData, setProjectsData] = useState<any[]>([]);
  const [todosData, setTodosData] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [leadsRes, projectsRes, todosRes] = await Promise.all([
          fetch('/api/leads'),
          fetch('/api/projects'),
          fetch('/api/todos')
        ]);
        
        if (leadsRes.ok) {
          const data = await leadsRes.json();
          setLeadsData(data.map((item: any) => {
            let dateStr = new Date().toISOString().split('T')[0];
            if (item.createdAt) {
              try {
                if (item.createdAt.$date) {
                  dateStr = new Date(item.createdAt.$date).toISOString().split('T')[0];
                } else {
                  dateStr = new Date(item.createdAt).toISOString().split('T')[0];
                }
              } catch(err) {}
            }
            return {
              ...item,
              createdAt: dateStr
            };
          }));
        }
        if (projectsRes.ok) {
          setProjectsData(await projectsRes.json());
        }
        if (todosRes.ok) {
          setTodosData(await todosRes.json());
        }
      } catch (e) {
        console.error('Failed to fetch dashboard data', e);
      }
    };
    
    fetchDashboardData();
  }, []);
  
  // 获取所有月份和人员列表用于筛选器
  const availableYears = Array.from(new Set(leadsData.map(l => l.createdAt.substring(0, 4) + '年'))).sort((a, b) => b.localeCompare(a));
  
  // -- 数据计算: 核心指标 --
  const newLeadsCount = leadsData.length;
  const activeLeadsCount = leadsData.filter(l => !['已签单', '已流失'].includes(l.status)).length;
  const signedDealsCount = leadsData.filter(l => l.status === '已签单').length;
  const activeProjectsCount = projectsData.filter(p => p.status === '施工中').length;

  // 较上月对比（线索数）
  const now = new Date();
  const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
  const thisMonthLeads = leadsData.filter(l => l.createdAt?.startsWith(thisMonthStr)).length;
  const lastMonthLeads = leadsData.filter(l => l.createdAt?.startsWith(lastMonthStr)).length;
  const leadsTrend = lastMonthLeads === 0 ? null : thisMonthLeads - lastMonthLeads;

  // 待处理事项
  const overdueTodos = todosData.filter((t: any) => {
    if (t.status !== 'pending' || !t.dueDate) return false;
    return new Date(t.dueDate) < new Date(new Date().toDateString());
  }).length;
  const delayedProjects = projectsData.filter(p => p.health === '严重延期' || p.health === '预警').length;
  const healthNormal = projectsData.filter(p => p.status === '施工中' && (!p.health || p.health === '正常')).length;
  const healthWarning = projectsData.filter(p => p.health === '预警').length;
  const healthDelayed = projectsData.filter(p => p.health === '严重延期').length;

  // -- 数据计算: 月度营收与目标 --
  const [revenueYear, setRevenueYear] = useState<string>(`${new Date().getFullYear()}年`);
  const [revenuePeriod, setRevenuePeriod] = useState<string>("全年"); // "全年" | "上半年" | "下半年"
  
  const [isRevenueYearDropdownOpen, setIsRevenueYearDropdownOpen] = useState(false);
  const [isRevenuePeriodDropdownOpen, setIsRevenuePeriodDropdownOpen] = useState(false);

  const [targets, setTargets] = useState<Record<string, Record<string, number>>>({});
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);

  // 从数据库加载营收目标
  useEffect(() => {
    fetch('/api/settings?key=revenueTargets')
      .then(r => r.json())
      .then(data => { if (data) setTargets(data); })
      .catch(console.error);
  }, []);

  const currentYearTargets = targets[revenueYear] || {};

  const revenueActuals: Record<string, number> = {
    '1月': 0, '2月': 0, '3月': 0, '4月': 0, '5月': 0, '6月': 0, 
    '7月': 0, '8月': 0, '9月': 0, '10月': 0, '11月': 0, '12月': 0
  };
  
  leadsData.forEach(lead => {
    if (lead.status === '已签单' && lead.createdAt.startsWith(revenueYear.replace('年', ''))) {
      const monthStr = lead.createdAt.split('-')[1];
      const monthNum = parseInt(monthStr, 10);
      const monthKey = `${monthNum}月`;
      const budgetStr = lead.budget || '';
      const budgetNum = parseInt(String(budgetStr).replace(/[^0-9]/g, '')) || 0;
      if (revenueActuals[monthKey] !== undefined) {
        revenueActuals[monthKey] += budgetNum;
      }
    }
  });

  const fullRevenueData = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'].map(month => ({
    name: month,
    实际: revenueActuals[month] || 0,
    目标: currentYearTargets[month] || 0
  }));

  const revenueData = (() => {
    if (revenuePeriod === "上半年") return fullRevenueData.slice(0, 6);
    if (revenuePeriod === "下半年") return fullRevenueData.slice(6, 12);
    return fullRevenueData;
  })();

  const handleSaveTargets = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newTargets = { ...targets };
    if (!newTargets[revenueYear]) newTargets[revenueYear] = {};
    ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'].forEach(month => {
      const val = formData.get(month);
      if (val !== null) newTargets[revenueYear][month] = Number(val) || 0;
    });
    setTargets(newTargets);
    setIsTargetModalOpen(false);
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'revenueTargets', value: newTargets })
    }).catch(console.error);
  };

  return (
    <MainLayout>
      <div className="p-8 max-w-[1600px] mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary-900">全局看板</h1>
            <p className="text-primary-600 mt-2">欢迎回来，以下是公司核心业务数据与多维度分析</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="sm:text-right md:block">
              <p className="text-sm font-medium text-primary-600">{new Date().toISOString().split('T')[0]} {['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][new Date().getDay()]}</p>
            </div>
          </div>
        </div>

        {/* 宏观核心指标 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[
            { label: "累计总线索", value: newLeadsCount, sub: leadsTrend !== null ? `较上月 ${leadsTrend >= 0 ? '+' : ''}${leadsTrend} 条` : '本月首批数据', subColor: leadsTrend !== null && leadsTrend >= 0 ? 'text-emerald-600' : 'text-rose-500', icon: Users, color: "text-blue-600", bg: "bg-blue-50", link: "/leads" },
            { label: "跟进中客户", value: activeLeadsCount, sub: `共 ${signedDealsCount} 单已签`, subColor: 'text-primary-400', icon: Activity, color: "text-amber-600", bg: "bg-amber-50", link: "/leads" },
            { label: "累计总签单", value: signedDealsCount, sub: `转化率 ${newLeadsCount > 0 ? ((signedDealsCount / newLeadsCount) * 100).toFixed(1) : 0}%`, subColor: 'text-primary-400', icon: FileText, color: "text-emerald-600", bg: "bg-emerald-50", link: "/contracts" },
            { label: "施工中工地", value: activeProjectsCount, sub: delayedProjects > 0 ? `${delayedProjects} 个需关注` : '全部正常', subColor: delayedProjects > 0 ? 'text-rose-500' : 'text-emerald-600', icon: Hammer, color: "text-purple-600", bg: "bg-purple-50", link: "/projects" }
          ].map((stat, idx) => (
            <div
              key={idx}
              onClick={() => router.push(stat.link)}
              className="bg-white rounded-xl border border-primary-100 shadow-sm p-6 hover:shadow-md hover:border-primary-300 transition-all cursor-pointer group relative overflow-hidden"
            >
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-primary-200 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm text-primary-600 font-medium group-hover:text-primary-900 transition-colors">{stat.label}</p>
                <div className={`p-2 rounded-lg ${stat.bg} group-hover:scale-110 transition-transform`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} strokeWidth={2} />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-bold text-primary-900 tracking-tight">{stat.value}</span>
                <span className={`text-xs font-medium ${stat.subColor}`}>{stat.sub}</span>
              </div>
            </div>
          ))}
        </div>

        {/* 待处理事项 + 工地健康度 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 待处理事项 */}
          <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-6">
            <h3 className="text-sm font-bold text-primary-900 mb-4 flex items-center">
              <span className="w-1.5 h-4 bg-rose-400 mr-2 rounded-sm inline-block"></span>
              待处理事项
            </h3>
            <div className="space-y-3">
              {[
                { label: "逾期待办", value: overdueTodos, link: "/todos", color: overdueTodos > 0 ? "text-rose-600 bg-rose-50 border-rose-100" : "text-emerald-600 bg-emerald-50 border-emerald-100", desc: overdueTodos > 0 ? "需立即处理" : "无逾期" },
                { label: "预警/延期工地", value: delayedProjects, link: "/projects", color: delayedProjects > 0 ? "text-amber-600 bg-amber-50 border-amber-100" : "text-emerald-600 bg-emerald-50 border-emerald-100", desc: delayedProjects > 0 ? "需跟进" : "全部正常" },
              ].map((item, idx) => (
                <div key={idx} onClick={() => router.push(item.link)}
                  className="flex items-center justify-between p-3 rounded-lg border border-primary-100 hover:border-primary-300 hover:bg-primary-50 cursor-pointer transition-all">
                  <span className="text-sm text-primary-700">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-primary-400">{item.desc}</span>
                    <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full border ${item.color}`}>{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 工地健康度 */}
          <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-6">
            <h3 className="text-sm font-bold text-primary-900 mb-4 flex items-center">
              <span className="w-1.5 h-4 bg-primary-900 mr-2 rounded-sm inline-block"></span>
              工地健康度
            </h3>
            <div className="space-y-3">
              {[
                { label: "正常推进", value: healthNormal, color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
                { label: "预警", value: healthWarning, color: "text-amber-600 bg-amber-50 border-amber-100" },
                { label: "严重延期", value: healthDelayed, color: "text-rose-600 bg-rose-50 border-rose-100" },
              ].map((item, idx) => (
                <div key={idx} onClick={() => router.push('/projects')}
                  className="flex items-center justify-between p-3 rounded-lg border border-primary-100 hover:border-primary-300 hover:bg-primary-50 cursor-pointer transition-all">
                  <span className="text-sm text-primary-700">{item.label}</span>
                  <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full border ${item.color}`}>{item.value} 个</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 第四层：月度营收趋势大看板 */}
        <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h3 className="text-base font-bold text-primary-900 flex items-center shrink-0">
              <span className="w-1.5 h-4 bg-primary-900 mr-2 rounded-sm inline-block"></span>  
              月度营收趋势与目标 (万)
            </h3>
            
            <div className="flex items-center gap-2 w-full sm:w-auto pb-1 sm:pb-0 relative z-20">
              {/* 年份筛选 */}
              <div className="relative shrink-0">
                <button 
                  onClick={() => setIsRevenueYearDropdownOpen(!isRevenueYearDropdownOpen)}
                  className="px-3 py-1.5 bg-primary-50 hover:bg-primary-100 rounded-lg text-xs font-medium text-primary-900 transition-colors flex items-center justify-between min-w-[80px]"
                >
                  {revenueYear}
                  <ChevronDown className="w-3 h-3 ml-1 text-primary-600" />
                </button>
                {isRevenueYearDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsRevenueYearDropdownOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 w-24 bg-white rounded-lg shadow-lg border border-primary-100 py-1 z-20 max-h-48 overflow-y-auto custom-scrollbar">
                      {availableYears.map(y => (
                        <button
                          key={y}
                          onClick={() => {
                            setRevenueYear(y);
                            setIsRevenueYearDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-xs font-medium hover:bg-primary-50 transition-colors ${revenueYear === y ? 'text-primary-900 bg-primary-50/50' : 'text-primary-600'}`}
                        >
                          {y}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* 周期筛选 (全年/上半年/下半年) */}
              <div className="relative shrink-0">
                <button 
                  onClick={() => setIsRevenuePeriodDropdownOpen(!isRevenuePeriodDropdownOpen)}
                  className="px-3 py-1.5 bg-primary-50 hover:bg-primary-100 rounded-lg text-xs font-medium text-primary-900 transition-colors flex items-center justify-between min-w-[80px]"
                >
                  {revenuePeriod}
                  <ChevronDown className="w-3 h-3 ml-1 text-primary-600" />
                </button>
                {isRevenuePeriodDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsRevenuePeriodDropdownOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 w-24 bg-white rounded-lg shadow-lg border border-primary-100 py-1 z-20 max-h-48 overflow-y-auto custom-scrollbar">
                      {["全年", "上半年", "下半年"].map(p => (
                        <button
                          key={p}
                          onClick={() => {
                            setRevenuePeriod(p);
                            setIsRevenuePeriodDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-xs font-medium hover:bg-primary-50 transition-colors ${revenuePeriod === p ? 'text-primary-900 bg-primary-50/50' : 'text-primary-600'}`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <button 
                onClick={() => setIsTargetModalOpen(true)}
                className="text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-md flex items-center transition-colors shrink-0"
              >
                <Target className="w-3 h-3 mr-1" /> 设置目标
              </button>
            </div>
          </div>
          <div className="w-full h-[400px]">
            <ResponsiveContainer width="100%" height="100%" minHeight={300} minWidth={0}>
              <LineChart data={revenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                <Line type="monotone" dataKey="实际" stroke="#2C2825" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }}>
                  <LabelList dataKey="实际" position="top" fill="#2C2825" fontSize={12} fontWeight="bold" offset={10} />
                </Line>
                <Line type="monotone" dataKey="目标" stroke="#d1d5db" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 目标设置弹窗 */}
      {isTargetModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-primary-100">
              <h3 className="text-lg font-bold text-primary-900">设置月度营收目标 (万)</h3>
              <button 
                onClick={() => setIsTargetModalOpen(false)}
                className="text-primary-400 hover:text-primary-600 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveTargets} className="p-6">
              <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'].map(month => (
                  <div key={month} className="space-y-1">
                    <label className="text-sm font-medium text-primary-700">{month}</label>
                    <input 
                      type="number" 
                      name={month}
                      defaultValue={currentYearTargets[month] || 0}
                      className="w-full px-3 py-2 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-900 text-sm"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-primary-100">
                <button
                  type="button"
                  onClick={() => setIsTargetModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-900 hover:bg-primary-800 rounded-lg shadow-sm transition-colors"
                >
                  保存目标
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
