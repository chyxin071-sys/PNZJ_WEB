"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronRight, TrendingUp, Hammer, DollarSign, Users, FileText, Activity, Settings, X, Target, PieChart as PieChartIcon, ChevronDown } from "lucide-react";
import dashboardData from "../../mock_data/dashboard.json";
import leadsData from "../../mock_data/leads.json";
import projectsData from "../../mock_data/projects.json";
import MainLayout from "../components/MainLayout";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell, LabelList } from 'recharts';
import { useRouter } from "next/navigation";

// 图表颜色 (不同色系的莫兰迪风格：红、黄、蓝、绿、紫、青、咖)
const COLORS = ['#D98C85', '#D9B36C', '#7CA1B5', '#8B9D83', '#A091A8', '#8EA3A6', '#C4A484'];

export default function Dashboard() {
  const router = useRouter();
  
  // -- 线索转化率专属筛选状态 --
  const [conversionMonth, setConversionMonth] = useState<string>("4月"); 
  const [conversionYear, setConversionYear] = useState<string>("2024年"); 
  const [conversionSales, setConversionSales] = useState<string>("全部");
  
  // 自定义下拉菜单状态
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [isSalesDropdownOpen, setIsSalesDropdownOpen] = useState(false);
  
  // 获取所有月份和人员列表用于筛选器
  const availableYears = Array.from(new Set(leadsData.map(l => l.createdAt.substring(0, 4) + '年'))).sort((a, b) => b.localeCompare(a));
  const availableMonths = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  const availableSales = ["全部", ...Array.from(new Set(leadsData.map(l => l.sales)))];
  
  // -- 数据计算: 核心指标 --
  const newLeadsCount = leadsData.length;
  const activeLeadsCount = leadsData.filter(l => !['已签单', '已流失'].includes(l.status)).length;
  const signedDealsCount = leadsData.filter(l => l.status === '已签单').length;
  const activeProjectsCount = projectsData.length;

  // -- 数据计算: 月度营收与目标 --
  const [revenueYear, setRevenueYear] = useState<string>("2024年");
  const [revenuePeriod, setRevenuePeriod] = useState<string>("全年"); // "全年" | "上半年" | "下半年"
  
  const [isRevenueYearDropdownOpen, setIsRevenueYearDropdownOpen] = useState(false);
  const [isRevenuePeriodDropdownOpen, setIsRevenuePeriodDropdownOpen] = useState(false);

  const [targets, setTargets] = useState<Record<string, Record<string, number>>>({
    '2024年': {
      '1月': 240, '2月': 139, '3月': 980, '4月': 390, '5月': 480, '6月': 380, 
      '7月': 430, '8月': 450, '9月': 500, '10月': 550, '11月': 600, '12月': 650
    },
    '2023年': {
      '1月': 200, '2月': 100, '3月': 800, '4月': 300, '5月': 400, '6月': 350, 
      '7月': 400, '8月': 420, '9月': 480, '10月': 500, '11月': 550, '12月': 600
    },
    '2025年': {
      '1月': 300, '2月': 150, '3月': 1000, '4月': 450, '5月': 550, '6月': 450, 
      '7月': 500, '8月': 550, '9月': 600, '10月': 650, '11月': 700, '12月': 800
    }
  });
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);

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
      const budgetNum = parseInt(lead.budget.replace(/[^0-9]/g, '')) || 0;
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

  const handleSaveTargets = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newTargets = { ...targets };
    if (!newTargets[revenueYear]) {
      newTargets[revenueYear] = {};
    }
    
    ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'].forEach(month => {
      const val = formData.get(month);
      if (val !== null) {
        newTargets[revenueYear][month] = Number(val) || 0;
      }
    });
    setTargets(newTargets);
    setIsTargetModalOpen(false);
  };

  // -- 数据计算: 转化率 (周度 vs 月度 vs 人员对比) --
  const [conversionView, setConversionView] = useState<'weekly' | 'monthly' | 'personnel'>('monthly');
  
  // 动态计算周度转化率
  const weeklyConversionData = (() => {
    // 过滤出所选年份、月份且可选所选销售的线索
    const targetMonthStr = `${conversionYear.replace('年', '')}-${conversionMonth.replace('月', '').padStart(2, '0')}`;
    const filteredLeadsForWeek = leadsData.filter(lead => {
      const isMonthMatch = lead.createdAt.startsWith(targetMonthStr);
      const isSalesMatch = conversionSales === "全部" || lead.sales === conversionSales;
      return isMonthMatch && isSalesMatch;
    });

    const weeksData = {
      '第一周': { 线索: 0, 签单: 0 },
      '第二周': { 线索: 0, 签单: 0 },
      '第三周': { 线索: 0, 签单: 0 },
      '第四周': { 线索: 0, 签单: 0 }
    };

    filteredLeadsForWeek.forEach(lead => {
      const day = parseInt(lead.createdAt.split('-')[2], 10);
      let weekKey = '第四周';
      if (day <= 7) weekKey = '第一周';
      else if (day <= 14) weekKey = '第二周';
      else if (day <= 21) weekKey = '第三周';

      weeksData[weekKey as keyof typeof weeksData].线索 += 1;
      if (lead.status === '已签单') {
        weeksData[weekKey as keyof typeof weeksData].签单 += 1;
      }
    });

    return Object.entries(weeksData).map(([name, data]) => ({ name, ...data }));
  })();

  const monthlyConversionData = (() => {
    const monthsData: Record<string, { 线索: number, 签单: number }> = {};
    const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    months.forEach(m => {
      monthsData[m] = { 线索: 0, 签单: 0 };
    });

    leadsData.forEach(lead => {
      const isSalesMatch = conversionSales === "全部" || lead.sales === conversionSales;
      const isYearMatch = lead.createdAt.startsWith(conversionYear.replace('年', ''));
      if (isSalesMatch && isYearMatch) {
        const monthStr = lead.createdAt.split('-')[1];
        const monthNum = parseInt(monthStr, 10);
        const monthKey = `${monthNum}月`;
        if (monthsData[monthKey]) {
          monthsData[monthKey].线索 += 1;
          if (lead.status === '已签单') {
            monthsData[monthKey].签单 += 1;
          }
        }
      }
    });

    // 过滤掉完全没有数据的月份
    return Object.entries(monthsData)
      .map(([name, data]) => ({ name, ...data }))
      .filter(d => d.线索 > 0 || d.签单 > 0);
  })();

  const personnelConversionData = (() => {
    // 根据所选年份、月份过滤
    const targetMonthStr = `${conversionYear.replace('年', '')}-${conversionMonth.replace('月', '').padStart(2, '0')}`;
    
    // 初始化所有销售的数据（确保所有人都能显示）
    const salesData: Record<string, { 线索: number, 签单: number }> = {};
    const allSales = Array.from(new Set(leadsData.map(l => l.sales)));
    allSales.forEach(sale => {
      salesData[sale] = { 线索: 0, 签单: 0 };
    });

    leadsData.forEach(lead => {
      if (lead.createdAt.startsWith(targetMonthStr)) {
        if (salesData[lead.sales]) {
          salesData[lead.sales].线索 += 1;
          if (lead.status === '已签单') {
            salesData[lead.sales].签单 += 1;
          }
        }
      }
    });

    return Object.entries(salesData)
      .map(([name, data]) => ({ name, ...data })); // 移除 filter，确保即使 0 线索也显示
  })();

  const currentConversionData = conversionView === 'weekly' ? weeklyConversionData : (conversionView === 'monthly' ? monthlyConversionData : personnelConversionData);

  // -- 数据计算: 光荣榜 --
  const salesLeaderboardData = Object.entries(leadsData.reduce((acc, lead) => {
    if (lead.status === '已签单') {
      acc[lead.sales] = (acc[lead.sales] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>))
    .map(([name, count]) => ({ name, count, role: '销售' }))
    .sort((a, b) => b.count - a.count)
    .map((user, index) => ({ ...user, rank: index + 1 }))
    .slice(0, 5);

  // -- 第二排通用筛选状态 --
  const [filterMonth2, setFilterMonth2] = useState<string>("全部");
  const [filterYear2, setFilterYear2] = useState<string>("2024年");
  const [filterSales2, setFilterSales2] = useState<string>("全部");

  const [isMonthDropdownOpen2, setIsMonthDropdownOpen2] = useState(false);
  const [isYearDropdownOpen2, setIsYearDropdownOpen2] = useState(false);
  const [isSalesDropdownOpen2, setIsSalesDropdownOpen2] = useState(false);

  // 预处理过滤第二排数据
  const filteredLeadsForSecondRow = leadsData.filter(lead => {
    const isYearMatch = filterYear2 === "全部" || lead.createdAt.startsWith(filterYear2.replace('年', ''));
    const isMonthMatch = filterMonth2 === "全部" || lead.createdAt.startsWith(`${filterYear2.replace('年', '')}-${filterMonth2.replace('月', '').padStart(2, '0')}`);
    const isSalesMatch = filterSales2 === "全部" || lead.sales === filterSales2;
    return isYearMatch && isMonthMatch && isSalesMatch;
  });

  // -- 数据计算: 获客渠道分析 --
  const sourceDataRaw = filteredLeadsForSecondRow.reduce((acc, lead) => {
    acc[lead.source] = (acc[lead.source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const sourceData = Object.entries(sourceDataRaw).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // -- 数据计算: 客单价分布 (遍历所有线索) --
  const orderValueData = (() => {
    const bins = {
      '< 10万': 0,
      '10-12万': 0,
      '12-14万': 0,
      '14-16万': 0,
      '16-18万': 0,
      '18-20万': 0,
      '> 20万': 0
    };
    
    filteredLeadsForSecondRow.forEach(lead => {
      const val = parseInt(lead.budget.replace(/[^0-9]/g, '')) || 0;
      if (val < 10) bins['< 10万']++;
      else if (val < 12) bins['10-12万']++;
      else if (val < 14) bins['12-14万']++;
      else if (val < 16) bins['14-16万']++;
      else if (val < 18) bins['16-18万']++;
      else if (val <= 20) bins['18-20万']++;
      else bins['> 20万']++;
    });

    // 强制指定图例顺序
    const orderedKeys = ['< 10万', '10-12万', '12-14万', '14-16万', '16-18万', '18-20万', '> 20万'];
    
    return orderedKeys
      .map(key => ({ name: key, value: bins[key as keyof typeof bins] }))
      .filter(d => d.value > 0);
  })();

  // -- 数据计算: 客户状态阶段漏斗分析 (新加分析图表) --
  const funnelData = (() => {
    // 重新分类：沟通中（除已签单和已流失外的所有状态）、已签单、已流失
    const statuses = ['沟通中', '已签单', '已流失'];
    const funnelCounts = statuses.map(s => {
      let count = 0;
      if (s === '沟通中') {
        count = filteredLeadsForSecondRow.filter(l => l.status !== '已签单' && l.status !== '已流失').length;
      } else {
        count = filteredLeadsForSecondRow.filter(l => l.status === s).length;
      }
      return { name: s, value: count };
    });
    return funnelCounts.filter(d => d.value > 0);
  })();

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
              <p className="text-sm font-medium text-primary-600">2024-05-24 星期五</p>
            </div>
          </div>
        </div>

        {/* 宏观核心指标 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          {[
            { label: "累计总线索", value: newLeadsCount.toString(), trend: "+12.5%", icon: Users, color: "text-blue-600", bg: "bg-blue-50", link: "/leads" },
            { label: "跟进中客户", value: activeLeadsCount.toString(), trend: "+5.2%", icon: Activity, color: "text-amber-600", bg: "bg-amber-50", link: "/leads?status=active" },
            { label: "累计总签单", value: signedDealsCount.toString(), trend: "+8.2%", icon: FileText, color: "text-emerald-600", bg: "bg-emerald-50", link: "/contracts" },
            { label: "在建工地", value: activeProjectsCount.toString(), trend: "-2.1%", icon: Hammer, color: "text-purple-600", bg: "bg-purple-50", link: "/projects" }
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
                <span className={`flex items-center text-xs font-semibold px-2.5 py-1 rounded-full
                  ${stat.trend.startsWith('+') ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {stat.trend}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* 第一排：线索转化率、本月光荣榜 */}
        <div className="flex flex-col lg:flex-row items-stretch gap-6 mb-8">
          {/* 转化率柱状图 */}
          <div className="w-full lg:w-2/3 bg-white rounded-xl border border-primary-100 shadow-sm p-4 sm:p-6 lg:h-[450px] flex flex-col">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6 gap-4">
              <h3 className="text-base font-bold text-primary-900 flex items-center shrink-0">
                <span className="w-1.5 h-4 bg-primary-900 mr-2 rounded-sm inline-block"></span>  
                线索转化率分析
              </h3>
              <div className="flex flex-col sm:items-end gap-2 relative z-20 w-full sm:w-auto">
                <div className="flex bg-primary-50 rounded-lg p-1 w-full sm:w-auto overflow-x-auto hide-scrollbar">
                  <button 
                    onClick={() => setConversionView('monthly')}
                    className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${conversionView === 'monthly' ? 'bg-white shadow-sm text-primary-900' : 'text-primary-600'}`}
                  >
                    月度趋势
                  </button>
                  <button 
                    onClick={() => setConversionView('weekly')}
                    className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${conversionView === 'weekly' ? 'bg-white shadow-sm text-primary-900' : 'text-primary-600'}`}
                  >
                    周度趋势
                  </button>
                  <button 
                    onClick={() => setConversionView('personnel')}
                    className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${conversionView === 'personnel' ? 'bg-white shadow-sm text-primary-900' : 'text-primary-600'}`}
                  >
                    人员对比
                  </button>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  {/* 自定义时间下拉菜单 (动态切换 年/月) */}
                  {conversionView === 'monthly' ? (
                    <div className="relative flex-1 sm:flex-none">
                      <button 
                        onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
                        className="px-3 py-1.5 bg-primary-50 hover:bg-primary-100 rounded-lg text-xs font-medium text-primary-900 transition-colors flex items-center justify-between flex-1 sm:flex-none min-w-[80px]"
                      >
                        {conversionYear}
                        <ChevronDown className="w-3 h-3 ml-1 text-primary-600" />
                      </button>
                      {isYearDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setIsYearDropdownOpen(false)} />
                          <div className="absolute right-0 top-full mt-1 w-24 bg-white rounded-lg shadow-lg border border-primary-100 py-1 z-20 max-h-48 overflow-y-auto custom-scrollbar">
                            {availableYears.map(y => (
                              <button
                                key={y}
                                onClick={() => {
                                  setConversionYear(y);
                                  setIsYearDropdownOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2 text-xs font-medium hover:bg-primary-50 transition-colors ${conversionYear === y ? 'text-primary-900 bg-primary-50/50' : 'text-primary-600'}`}
                              >
                                {y}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="relative flex-1 sm:flex-none">
                      <button 
                        onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
                        className="px-3 py-1.5 bg-primary-50 hover:bg-primary-100 rounded-lg text-xs font-medium text-primary-900 transition-colors flex items-center justify-between flex-1 sm:flex-none min-w-[80px]"
                      >
                        {conversionMonth}
                        <ChevronDown className="w-3 h-3 ml-1 text-primary-600" />
                      </button>
                      {isMonthDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setIsMonthDropdownOpen(false)} />
                          <div className="absolute right-0 top-full mt-1 w-24 bg-white rounded-lg shadow-lg border border-primary-100 py-1 z-20 max-h-48 overflow-y-auto custom-scrollbar">
                            {availableMonths.map(m => (
                              <button
                                key={m}
                                onClick={() => {
                                  setConversionMonth(m);
                                  setIsMonthDropdownOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2 text-xs font-medium hover:bg-primary-50 transition-colors ${conversionMonth === m ? 'text-primary-900 bg-primary-50/50' : 'text-primary-600'}`}
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* 自定义销售下拉菜单 (移到右侧) */}
                  <div className="relative flex-1 sm:flex-none">
                    <button 
                      onClick={() => setIsSalesDropdownOpen(!isSalesDropdownOpen)}
                      className="px-3 py-1.5 bg-primary-50 hover:bg-primary-100 rounded-lg text-xs font-medium text-primary-900 transition-colors flex items-center justify-between flex-1 sm:flex-none min-w-[90px]"
                    >
                      {conversionSales}
                      <ChevronDown className="w-3 h-3 ml-1 text-primary-600" />
                    </button>
                    {isSalesDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsSalesDropdownOpen(false)} />
                        <div className="absolute right-0 top-full mt-1 w-28 bg-white rounded-lg shadow-lg border border-primary-100 py-1 z-20 max-h-48 overflow-y-auto custom-scrollbar">
                          {availableSales.map(s => (
                            <button
                              key={s}
                              onClick={() => {
                                setConversionSales(s);
                                setIsSalesDropdownOpen(false);
                              }}
                              className={`w-full text-left px-4 py-2 text-xs font-medium hover:bg-primary-50 transition-colors ${conversionSales === s ? 'text-primary-900 bg-primary-50/50' : 'text-primary-600'}`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-1 w-full min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%" minHeight={300} minWidth={0}>
                <BarChart data={currentConversionData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="线索" fill="#e5e7eb" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    <LabelList dataKey="线索" position="top" fill="#6b7280" fontSize={10} />
                  </Bar>
                  <Bar dataKey="签单" fill="#2C2825" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    <LabelList dataKey="签单" position="top" fill="#2C2825" fontSize={10} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 签单光荣榜 */}
          <div className="w-full lg:w-1/3 bg-white rounded-xl border border-primary-100 shadow-sm p-4 sm:p-6 lg:h-[450px] flex flex-col">
            <h3 className="text-base font-bold text-primary-900 mb-6 flex items-center">
              <span className="w-1.5 h-4 bg-primary-900 mr-2 rounded-sm inline-block"></span>  
              本月光荣榜 (动态签单榜)
            </h3>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {salesLeaderboardData.length > 0 ? salesLeaderboardData.map((user) => (
                <div key={user.rank} className="flex items-center justify-between p-4 bg-primary-50/50 hover:bg-primary-50 rounded-lg transition-colors border border-primary-100">
                  <div className="flex items-center">
                    <div className={`w-10 h-10 flex items-center justify-center text-sm font-bold rounded-lg
                      ${user.rank === 1 ? 'bg-amber-100 text-amber-700' :       
                        user.rank === 2 ? 'bg-zinc-200 text-zinc-700' : 
                        user.rank === 3 ? 'bg-orange-100 text-orange-700' : 'bg-white text-primary-600 border border-primary-200'}`}>
                      T{user.rank}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-bold text-primary-900">{user.name}</p>
                      <p className="text-xs text-primary-600 mt-0.5">{user.role}</p>
                    </div>
                  </div>
                  <div className="text-xl font-bold text-primary-900">
                    {user.count} <span className="text-xs font-medium text-primary-400 ml-0.5">单</span>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-primary-400 text-sm">暂无签单数据</div>
              )}
            </div>
          </div>
        </div>

        {/* 第二排：获客渠道、客单价分布、月度营收 */}
        <div className="flex flex-col gap-6 mb-8">
          
          {/* 第二排全局筛选器 */}
          <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-sm font-bold text-primary-900 flex items-center">
              <span className="w-1.5 h-4 bg-primary-900 mr-2 rounded-sm inline-block"></span>  
              线索多维度分析
            </h3>
            
            <div className="flex gap-2 w-full sm:w-auto pb-1 sm:pb-0 relative z-20">
              {/* 年份筛选 */}
              <div className="relative flex-1 sm:flex-none">
                <button 
                  onClick={() => setIsYearDropdownOpen2(!isYearDropdownOpen2)}
                  className="px-3 py-1.5 bg-primary-50 hover:bg-primary-100 rounded-lg text-xs font-medium text-primary-900 transition-colors flex items-center justify-between flex-1 sm:flex-none min-w-[80px]"
                >
                  {filterYear2}
                  <ChevronDown className="w-3 h-3 ml-1 text-primary-600" />
                </button>
                {isYearDropdownOpen2 && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsYearDropdownOpen2(false)} />
                    <div className="absolute right-0 top-full mt-1 w-24 bg-white rounded-lg shadow-lg border border-primary-100 py-1 z-20 max-h-48 overflow-y-auto custom-scrollbar">
                      {["全部", ...availableYears].map(y => (
                        <button
                          key={y}
                          onClick={() => {
                            setFilterYear2(y);
                            setIsYearDropdownOpen2(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-xs font-medium hover:bg-primary-50 transition-colors ${filterYear2 === y ? 'text-primary-900 bg-primary-50/50' : 'text-primary-600'}`}
                        >
                          {y}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* 月份筛选 */}
              <div className="relative flex-1 sm:flex-none">
                <button 
                  onClick={() => setIsMonthDropdownOpen2(!isMonthDropdownOpen2)}
                  className="px-3 py-1.5 bg-primary-50 hover:bg-primary-100 rounded-lg text-xs font-medium text-primary-900 transition-colors flex items-center justify-between flex-1 sm:flex-none min-w-[80px]"
                >
                  {filterMonth2 === "全部" ? "全部月份" : filterMonth2}
                  <ChevronDown className="w-3 h-3 ml-1 text-primary-600" />
                </button>
                {isMonthDropdownOpen2 && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsMonthDropdownOpen2(false)} />
                    <div className="absolute right-0 top-full mt-1 w-24 bg-white rounded-lg shadow-lg border border-primary-100 py-1 z-20 max-h-48 overflow-y-auto custom-scrollbar">
                      {["全部", ...availableMonths].map(m => (
                        <button
                          key={m}
                          onClick={() => {
                            setFilterMonth2(m);
                            setIsMonthDropdownOpen2(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-xs font-medium hover:bg-primary-50 transition-colors ${filterMonth2 === m ? 'text-primary-900 bg-primary-50/50' : 'text-primary-600'}`}
                        >
                          {m === "全部" ? "全部月份" : m}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* 销售人员筛选 */}
              <div className="relative flex-1 sm:flex-none">
                <button 
                  onClick={() => setIsSalesDropdownOpen2(!isSalesDropdownOpen2)}
                  className="px-3 py-1.5 bg-primary-50 hover:bg-primary-100 rounded-lg text-xs font-medium text-primary-900 transition-colors flex items-center justify-between flex-1 sm:flex-none min-w-[90px]"
                >
                  {filterSales2 === "全部" ? "所有人员" : filterSales2}
                  <ChevronDown className="w-3 h-3 ml-1 text-primary-600" />
                </button>
                {isSalesDropdownOpen2 && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsSalesDropdownOpen2(false)} />
                    <div className="absolute right-0 top-full mt-1 w-28 bg-white rounded-lg shadow-lg border border-primary-100 py-1 z-20 max-h-48 overflow-y-auto custom-scrollbar">
                      {availableSales.map(s => (
                        <button
                          key={s}
                          onClick={() => {
                            setFilterSales2(s);
                            setIsSalesDropdownOpen2(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-xs font-medium hover:bg-primary-50 transition-colors ${filterSales2 === s ? 'text-primary-900 bg-primary-50/50' : 'text-primary-600'}`}
                        >
                          {s === "全部" ? "所有人员" : s}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 获客渠道分析 */}
            <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-6 flex flex-col h-[400px]">
              <h3 className="text-base font-bold text-primary-900 mb-2 flex items-center">
                获客渠道分析
              </h3>
              <div className="flex-1 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                        data={sourceData}
                        cx="50%"
                        cy="45%"
                        innerRadius={30}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                        labelLine={{ stroke: '#9ca3af', strokeWidth: 1, length1: 15, length2: 15 }}
                        label={({ name, percent, cx, cy, midAngle, outerRadius, innerRadius }) => {
                          if (percent <= 0.05) return null;
                          const RADIAN = Math.PI / 180;
                          const radius = outerRadius + 25; // 把标签往外推一点，留出空间
                          const x = cx + radius * Math.cos(-midAngle * RADIAN);
                          const y = cy + radius * Math.sin(-midAngle * RADIAN);
                          const textAnchor = x > cx ? 'start' : 'end';
                          
                          return (
                            <text x={x} y={y} fill="#6b7280" textAnchor={textAnchor} dominantBaseline="central" style={{ fontSize: '10px', fontWeight: 'normal' }}>
                              <tspan x={x} dy="-0.5em">{name}</tspan>
                              <tspan x={x} dy="1.2em">{`${(percent * 100).toFixed(0)}%`}</tspan>
                            </text>
                          );
                        }}
                      >
                      {sourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    />
                    <Legend 
                      layout="horizontal" 
                      verticalAlign="bottom" 
                      align="center"
                      wrapperStyle={{ fontSize: '12px', paddingTop: '20px', lineHeight: '24px' }}
                      iconType="circle"
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 客单价分布 */}
            <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-6 flex flex-col h-[400px]">
              <h3 className="text-base font-bold text-primary-900 mb-2 flex items-center">
                客单价分布
              </h3>
              <div className="flex-1 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                        data={orderValueData}
                        cx="50%"
                        cy="45%"
                        innerRadius={30}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                        labelLine={{ stroke: '#9ca3af', strokeWidth: 1, length1: 15, length2: 15 }}
                        label={({ name, percent, cx, cy, midAngle, outerRadius }) => {
                          if (percent <= 0.05) return null;
                          const RADIAN = Math.PI / 180;
                          const radius = outerRadius + 25; 
                          const x = cx + radius * Math.cos(-midAngle * RADIAN);
                          const y = cy + radius * Math.sin(-midAngle * RADIAN);
                          const textAnchor = x > cx ? 'start' : 'end';
                          
                          return (
                            <text x={x} y={y} fill="#6b7280" textAnchor={textAnchor} dominantBaseline="central" style={{ fontSize: '10px', fontWeight: 'normal' }}>
                              <tspan x={x} dy="-0.5em">{name}</tspan>
                              <tspan x={x} dy="1.2em">{`${(percent * 100).toFixed(0)}%`}</tspan>
                            </text>
                          );
                        }}
                      >
                      {orderValueData.map((entry, index) => {
                        // 根据 key 找到对应的原顺序索引来分配颜色，保证颜色稳定
                        const orderedKeys = ['< 10万', '10-12万', '12-14万', '14-16万', '16-18万', '18-20万', '> 20万'];
                        const originalIndex = orderedKeys.indexOf(entry.name);
                        return <Cell key={`cell-${index}`} fill={COLORS[originalIndex % COLORS.length]} />;
                      })}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    />
                    {/* 强制重新渲染 Legend，利用 payload 属性传递排序好的数据 */}
                    <Legend 
                      layout="horizontal" 
                      verticalAlign="bottom" 
                      align="center"
                      wrapperStyle={{ fontSize: '12px', paddingTop: '20px', lineHeight: '24px' }}
                      iconType="circle"
                      {...({
                        payload: ['< 10万', '10-12万', '12-14万', '14-16万', '16-18万', '18-20万', '> 20万']
                          .filter(key => orderValueData.some(d => d.name === key))
                          .map((key) => {
                             const originalIndex = ['< 10万', '10-12万', '12-14万', '14-16万', '16-18万', '18-20万', '> 20万'].indexOf(key);
                             return {
                               id: key,
                               type: 'circle',
                               value: key,
                               color: COLORS[originalIndex % COLORS.length]
                             }
                          })
                      } as any)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 新增: 线索阶段漏斗分析 */}
            <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-6 flex flex-col h-[400px]">
              <h3 className="text-base font-bold text-primary-900 mb-2 flex items-center">
                线索阶段分布 (漏斗分析)
              </h3>
              <div className="flex-1 w-full flex items-center justify-center pt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelData} layout="vertical" margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                    <XAxis type="number" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} width={50} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    />
                    <Bar dataKey="value" fill="#8B7355" radius={[0, 4, 4, 0]} maxBarSize={30} label={{ position: 'right', fill: '#4b5563', fontSize: 12, fontWeight: 'bold' }}>
                      {funnelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
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
