"use client";

import { ChevronRight, TrendingUp, Hammer } from "lucide-react";
import dashboardData from "../../mock_data/dashboard.json";
import MainLayout from "../components/MainLayout";

export default function Dashboard() {
  return (
    <MainLayout>
      <div className="p-4 md:p-8 h-full">
        <div className="mb-10">
          <h2 className="text-2xl font-light text-zinc-900 tracking-wider">今日看板</h2>
          <p className="text-sm text-zinc-500 mt-2 font-light">品诺有心，筑家有道</p>
        </div>

        {/* 宏观数据统计 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {dashboardData.stats.map((stat, idx) => (
            <div key={idx} className="bg-white p-6 rounded-2xl border border-primary-50 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-sm text-zinc-500 font-medium mb-4">{stat.label}</p>
              <div className="flex items-end justify-between">
                <span className="text-4xl font-light text-zinc-900">{stat.value}</span>
                <span className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {stat.trend}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-8">
          {/* 施工进度预览 */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-primary-50 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-zinc-900">在建工地动态</h3>
              <button className="text-sm text-zinc-500 flex items-center hover:text-zinc-900">
                查看全部 <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
            <div className="space-y-4">
              {dashboardData.recentProjects.map((proj) => (
                <div key={proj.id} className="flex items-center justify-between p-4 border border-primary-50 rounded-xl hover:bg-primary-50 transition-colors cursor-pointer">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                      <Hammer className="w-5 h-5 text-primary-700" strokeWidth={1.5} />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-zinc-900">{proj.clientName}的家</p>
                      <p className="text-xs text-zinc-500">工长: {proj.manager}</p>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-primary-900 text-white text-xs font-medium rounded-full">
                    当前: {proj.status}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 签单光荣榜 */}
          <div className="bg-white rounded-2xl border border-primary-50 shadow-sm p-6">
            <h3 className="text-lg font-medium text-zinc-900 mb-6">本月光荣榜</h3>
            <div className="space-y-6">
              {dashboardData.leaderboard.map((user) => (
                <div key={user.rank} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
                      ${user.rank === 1 ? 'bg-amber-100 text-amber-700' : 
                        user.rank === 2 ? 'bg-primary-100 text-primary-800' : 
                        'bg-orange-50 text-orange-700'}`}>
                      Top {user.rank}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-zinc-900">{user.name}</p>
                      <p className="text-xs text-zinc-500">{user.role}</p>
                    </div>
                  </div>
                  <div className="text-lg font-light text-zinc-900">
                    {user.count} <span className="text-xs text-zinc-400">单</span>
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
