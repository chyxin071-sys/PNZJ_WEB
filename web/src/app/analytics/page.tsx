"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "../../components/MainLayout";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, LabelList } from 'recharts';
import { ChevronDown } from "lucide-react";

const COLORS = ['#D98C85', '#D9B36C', '#7CA1B5', '#8B9D83', '#A091A8', '#8EA3A6', '#C4A484'];

export default function AnalyticsPage() {
  const router = useRouter();
  const [leadsData, setLeadsData] = useState<any[]>([]);
  const [filterYear, setFilterYear] = useState(`${new Date().getFullYear()}年`);
  const [filterSales, setFilterSales] = useState("全部");
  const [isYearOpen, setIsYearOpen] = useState(false);
  const [isSalesOpen, setIsSalesOpen] = useState(false);

  useEffect(() => {
    fetch('/api/leads')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setLeadsData(data.map((item: any) => ({
            ...item,
            createdAt: item.createdAt?.$date
              ? new Date(item.createdAt.$date).toISOString().split('T')[0]
              : (item.createdAt || '')
          })));
        }
      })
      .catch(console.error);
  }, []);

  const availableYears = Array.from(new Set(leadsData.map(l => l.createdAt?.substring(0, 4) + '年').filter(Boolean))).sort((a, b) => b.localeCompare(a));
  const availableSales = ["全部", ...Array.from(new Set(leadsData.map(l => l.sales).filter(Boolean)))];

  const filtered = leadsData.filter(l => {
    const yearMatch = filterYear === "全部" || l.createdAt?.startsWith(filterYear.replace('年', ''));
    const salesMatch = filterSales === "全部" || l.sales === filterSales;
    return yearMatch && salesMatch;
  });

  // -- 转化率漏斗（正确逻辑：各阶段当前分布）--
  const funnelStages = ['待跟进', '沟通中', '已量房', '方案阶段', '已交定金', '已签单', '已流失'];
  const funnelData = funnelStages.map(s => ({
    name: s,
    value: filtered.filter(l => l.status === s).length
  })).filter(d => d.value > 0);

  // -- 签单转化率（按录入月份分组，统计最终签单比例）--
  const conversionByMonth = (() => {
    const months: Record<string, { total: number, signed: number }> = {};
    filtered.forEach(l => {
      const m = l.createdAt?.substring(0, 7); // YYYY-MM
      if (!m) return;
      if (!months[m]) months[m] = { total: 0, signed: 0 };
      months[m].total++;
      if (l.status === '已签单') months[m].signed++;
    });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, d]) => ({
        name: month.substring(5) + '月',
        录入: d.total,
        签单: d.signed,
        转化率: d.total > 0 ? Math.round((d.signed / d.total) * 100) : 0
      }));
  })();

  // -- 人员业绩对比（sales + designer 都算，去重）--
  const salesPerf = (() => {
    const map: Record<string, { leads: number, signed: number }> = {};
    filtered.forEach(l => {
      // 收集参与这条线索的所有人（去重）
      const participants = new Set<string>();
      if (l.sales) participants.add(l.sales);
      if (l.designer) participants.add(l.designer);
      if (participants.size === 0) participants.add('未分配');

      participants.forEach(name => {
        if (!map[name]) map[name] = { leads: 0, signed: 0 };
        map[name].leads++;
        if (l.status === '已签单') map[name].signed++;
      });
    });
    return Object.entries(map)
      .map(([name, d]) => ({
        name,
        线索: d.leads,
        签单: d.signed,
        转化率: d.leads > 0 ? Math.round((d.signed / d.leads) * 100) : 0
      }))
      .sort((a, b) => b.签单 - a.签单);
  })();

  // -- 获客渠道 --
  const sourceData = Object.entries(
    filtered.reduce((acc: any, l) => {
      acc[l.source || '未知'] = (acc[l.source || '未知'] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value: value as number })).sort((a, b) => b.value - a.value);

  // -- 客单价分布 --
  const budgetBins = { '< 10万': 0, '10-15万': 0, '15-20万': 0, '20-30万': 0, '> 30万': 0 };
  filtered.forEach(l => {
    const v = parseInt((l.budget || '').replace(/[^0-9]/g, '')) || 0;
    if (v < 10) budgetBins['< 10万']++;
    else if (v < 15) budgetBins['10-15万']++;
    else if (v < 20) budgetBins['15-20万']++;
    else if (v < 30) budgetBins['20-30万']++;
    else budgetBins['> 30万']++;
  });
  const budgetData = Object.entries(budgetBins).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);

  // -- 平均成交周期（有 signDate 和 createdAt 的已签单线索）--
  const avgDays = (() => {
    const signed = filtered.filter(l => l.status === '已签单' && l.signDate && l.createdAt);
    if (signed.length === 0) return null;
    const total = signed.reduce((sum, l) => {
      const diff = (new Date(l.signDate).getTime() - new Date(l.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      return sum + (diff > 0 ? diff : 0);
    }, 0);
    return Math.round(total / signed.length);
  })();

  const Dropdown = ({ value, options, onChange, open, setOpen }: any) => (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="px-3 py-1.5 bg-primary-50 hover:bg-primary-100 rounded-lg text-xs font-medium text-primary-900 flex items-center gap-1 min-w-[80px]">
        {value} <ChevronDown className="w-3 h-3 text-primary-500" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-28 bg-white rounded-lg shadow-lg border border-primary-100 py-1 z-20 max-h-48 overflow-y-auto">
            {options.map((o: string) => (
              <button key={o} onClick={() => { onChange(o); setOpen(false); }}
                className={`w-full text-left px-4 py-2 text-xs hover:bg-primary-50 ${value === o ? 'font-bold text-primary-900' : 'text-primary-600'}`}>
                {o}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );

  return (
    <MainLayout>
      <div className="p-8 max-w-[1600px] mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary-900">数据分析</h1>
            <p className="text-primary-600 mt-2">线索转化、渠道来源、销售业绩多维度分析</p>
          </div>
          <div className="flex items-center gap-2">
            <Dropdown value={filterYear} options={["全部", ...availableYears]} onChange={setFilterYear} open={isYearOpen} setOpen={setIsYearOpen} />
            <Dropdown value={filterSales} options={availableSales} onChange={setFilterSales} open={isSalesOpen} setOpen={setIsSalesOpen} />
          </div>
        </div>

        {/* 概览数字 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "筛选范围线索", value: filtered.length },
            { label: "已签单", value: filtered.filter(l => l.status === '已签单').length },
            { label: "签单转化率", value: filtered.length > 0 ? `${((filtered.filter(l => l.status === '已签单').length / filtered.length) * 100).toFixed(1)}%` : '—' },
            { label: "平均成交周期", value: avgDays !== null ? `${avgDays} 天` : '数据不足' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-xl border border-primary-100 shadow-sm p-5">
              <p className="text-xs text-primary-500 mb-1">{s.label}</p>
              <p className="text-2xl font-bold text-primary-900">{s.value}</p>
            </div>
          ))}
        </div>

        {/* 第一行：转化率趋势 + 销售业绩 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-6">
            <h3 className="text-sm font-bold text-primary-900 mb-1 flex items-center">
              <span className="w-1.5 h-4 bg-primary-900 mr-2 rounded-sm inline-block"></span>
              月度签单转化率
            </h3>
            <p className="text-xs text-primary-400 mb-4">按线索录入月份统计，反映各批次线索的最终转化结果</p>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={conversionByMonth} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="录入" fill="#C4A484" radius={[3, 3, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="签单" fill="#8B9D83" radius={[3, 3, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-6">
            <h3 className="text-sm font-bold text-primary-900 mb-1 flex items-center">
              <span className="w-1.5 h-4 bg-primary-900 mr-2 rounded-sm inline-block"></span>
              人员业绩对比
            </h3>
            <p className="text-xs text-primary-400 mb-4">销售或设计师参与的线索均计入，括号内为转化率</p>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesPerf} layout="vertical" margin={{ top: 0, right: 50, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                  <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" fontSize={11} tickLine={false} axisLine={false} width={50} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    formatter={(value: any, name: string, props: any) => {
                      if (name === '签单') return [`${value} 单 (转化率 ${props.payload.转化率}%)`, name];
                      return [value, name];
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="线索" fill="#C4A484" radius={[0, 3, 3, 0]} maxBarSize={20} />
                  <Bar dataKey="签单" fill="#8B9D83" radius={[0, 3, 3, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 第二行：线索阶段分布 + 获客渠道 + 客单价 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-6">
            <h3 className="text-sm font-bold text-primary-900 mb-4 flex items-center">
              <span className="w-1.5 h-4 bg-primary-900 mr-2 rounded-sm inline-block"></span>
              线索阶段分布
            </h3>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                  <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" fontSize={11} tickLine={false} axisLine={false} width={60} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                  <Bar dataKey="value" radius={[0, 3, 3, 0]} maxBarSize={18} label={{ position: 'right', fontSize: 11, fill: '#6b7280' }}>
                    {funnelData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-6">
            <h3 className="text-sm font-bold text-primary-900 mb-4 flex items-center">
              <span className="w-1.5 h-4 bg-primary-900 mr-2 rounded-sm inline-block"></span>
              获客渠道分布
            </h3>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sourceData} cx="50%" cy="45%" outerRadius={75} dataKey="value" nameKey="name"
                    label={({ name, percent }) => percent > 0.05 ? `${name} ${((percent || 0) * 100).toFixed(0)}%` : ''}
                    labelLine={{ stroke: '#9ca3af', strokeWidth: 1 }}>
                    {sourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-6">
            <h3 className="text-sm font-bold text-primary-900 mb-4 flex items-center">
              <span className="w-1.5 h-4 bg-primary-900 mr-2 rounded-sm inline-block"></span>
              客户预算分布
            </h3>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={budgetData} cx="50%" cy="45%" outerRadius={75} dataKey="value" nameKey="name"
                    label={({ name, percent }) => percent > 0.05 ? `${name}` : ''}
                    labelLine={{ stroke: '#9ca3af', strokeWidth: 1 }}>
                    {budgetData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
