"use client";

import { ChevronRight, TrendingUp, Hammer, DollarSign, Users, FileText, Activity } from "lucide-react";
import dashboardData from "../../mock_data/dashboard.json";
import MainLayout from "../components/MainLayout";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

const revenueData = [
  { name: '1月', 实际: 400, 目标: 240 },
  { name: '2月', 实际: 300, 目标: 139 },
  { name: '3月', 实际: 200, 目标: 980 },
  { name: '4月', 实际: 278, 目标: 390 },
  { name: '5月', 实际: 189, 目标: 480 },
  { name: '6月', 实际: 239, 目标: 380 },
  { name: '7月', 实际: 349, 目标: 430 },
];

const conversionData = [
  { name: '第1周', 线索: 40, 签单: 24 },
  { name: '第2周', 线索: 30, 签单: 13 },
  { name: '第3周', 线索: 20, 签单: 98 },
  { name: '第4周', 线索: 27, 签单: 39 },
];

export default function Dashboard() {
  return (
    <MainLayout>
      <div className="p-8 max-w-[1600px] mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary-900">全局看板</h1>
            <p className="text-primary-600 mt-2">欢迎回来，以下是公司本月核心业务数据</p>
          </div>
          <div className="sm:text-right">
            <p className="text-sm font-medium text-primary-600">2024-05-24 星期五</p>
          </div>
        </div>

        {/* 宏观核心指标 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          {[
            { label: "本月新增线索", value: "128", trend: "+12.5%", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "跟进客户数", value: "456", trend: "+5.2%", icon: Activity, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "本月新签单数", value: "32", trend: "+8.2%", icon: FileText, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "在建工地", value: "45", trend: "-2.1%", icon: Hammer, color: "text-purple-600", bg: "bg-purple-50" }
          ].map((stat, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-primary-100 shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm text-primary-600 font-medium">{stat.label}</p>
                <div className={`p-2 rounded-lg ${stat.bg}`}>
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

        {/* 图表数据区 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 营收趋势图 */}
          <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-6 h-[400px] flex flex-col">
            <h3 className="text-base font-bold text-primary-900 mb-6 flex items-center">
              <span className="w-1.5 h-4 bg-primary-900 mr-2 rounded-sm inline-block"></span>  
              月度营收趋势 (万)
            </h3>
            <div className="flex-1 w-full min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%" minHeight={300} minWidth={0}>
                <LineChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="实际" stroke="#2C2825" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="目标" stroke="#d1d5db" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 转化率柱状图 */}
          <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-6 h-[400px] flex flex-col">
            <h3 className="text-base font-bold text-primary-900 mb-6 flex items-center">
              <span className="w-1.5 h-4 bg-primary-900 mr-2 rounded-sm inline-block"></span>  
              周度线索转化率
            </h3>
            <div className="flex-1 w-full min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%" minHeight={300} minWidth={0}>
                <BarChart data={conversionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="线索" fill="#e5e7eb" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="签单" fill="#2C2825" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-8">
          {/* 施工进度预览 */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-primary-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-bold text-primary-900 flex items-center">
                <span className="w-1.5 h-4 bg-primary-900 mr-2 rounded-sm inline-block"></span>
                在建工地预警动态
              </h3>
              <button className="text-sm font-medium text-primary-600 hover:text-primary-900 flex items-center min-h-[44px] px-2 transition-colors">
                查看全部 <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
            <div className="space-y-3">
              {dashboardData.recentProjects.map((proj, idx) => (
                <div key={proj.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-primary-50 rounded-lg hover:bg-primary-50/50 transition-colors cursor-pointer gap-4 group">
                  <div className="flex items-center">
                    <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary-50 text-primary-600 shrink-0 group-hover:bg-white border border-primary-100 transition-colors">
                      <Hammer className="w-5 h-5" strokeWidth={2} />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-bold text-primary-900">{proj.clientName}的家</p>
                      <div className="flex items-center mt-1 text-xs text-primary-600">
                        <span>工长: {proj.manager}</span>
                        <span className="mx-2 text-primary-200">|</span>
                        <span>节点进度: 4/8</span>
                      </div>
                    </div>
                  </div>
                  <div className="sm:text-right flex items-center sm:block pl-14 sm:pl-0">
                    <div className={`inline-flex items-center px-3 py-1 text-xs font-bold rounded-md
                      ${idx === 1
                        ? 'bg-rose-50 text-rose-600 border border-rose-100'        
                        : 'bg-primary-50 text-primary-700 border border-primary-100'}`}>
                      {idx === 1 ? '节点逾期预警' : `当前: ${proj.status}`}     
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 签单光荣榜 */}
          <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-6">
            <h3 className="text-base font-bold text-primary-900 mb-6 flex items-center">
              <span className="w-1.5 h-4 bg-primary-900 mr-2 rounded-sm inline-block"></span>  
              本月光荣榜
            </h3>
            <div className="space-y-4 mt-2">
              {dashboardData.leaderboard.map((user) => (
                <div key={user.rank} className="flex items-center justify-between p-3 hover:bg-primary-50 rounded-lg transition-colors border border-transparent hover:border-primary-100">
                  <div className="flex items-center">
                    <div className={`w-8 h-8 flex items-center justify-center text-xs font-bold rounded-md
                      ${user.rank === 1 ? 'bg-amber-100 text-amber-700' :       
                        user.rank === 2 ? 'bg-zinc-200 text-zinc-700' : 'bg-primary-50 text-primary-600'}`}>
                      T{user.rank}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-bold text-primary-900">{user.name}</p>
                      <p className="text-xs text-primary-600 mt-0.5">{user.role}</p>
                    </div>
                  </div>
                  <div className="text-lg font-bold text-primary-900">
                    {user.count} <span className="text-xs font-medium text-primary-400 ml-1">单</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}


