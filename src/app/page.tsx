"use client";

import { Bell, Search, Menu, LayoutDashboard, Users, Hammer, FileText, ChevronRight, TrendingUp } from "lucide-react";
import dashboardData from "../../mock_data/dashboard.json";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-zinc-50 flex">
      {/* 极简侧边栏 */}
      <aside className="w-64 bg-white border-r border-primary-50 hidden md:flex flex-col">
        <div className="h-20 flex items-center px-8 border-b border-primary-50">
          <h1 className="text-xl font-medium tracking-widest text-zinc-900">
            品诺筑家
          </h1>
        </div>
        
        <nav className="flex-1 py-8 px-4 space-y-2">
          <a href="#" className="flex items-center px-4 py-3 text-zinc-900 bg-primary-50 rounded-lg">
            <LayoutDashboard className="w-5 h-5 mr-3" strokeWidth={1.5} />
            <span className="text-sm font-medium">全局看板</span>
          </a>
          <a href="#" className="flex items-center px-4 py-3 text-zinc-500 hover:text-zinc-900 hover:bg-primary-50 rounded-lg transition-colors">
            <Users className="w-5 h-5 mr-3" strokeWidth={1.5} />
            <span className="text-sm font-medium">客户线索</span>
          </a>
          <a href="#" className="flex items-center px-4 py-3 text-zinc-500 hover:text-zinc-900 hover:bg-primary-50 rounded-lg transition-colors">
            <FileText className="w-5 h-5 mr-3" strokeWidth={1.5} />
            <span className="text-sm font-medium">报价与材料</span>
          </a>
          <a href="#" className="flex items-center px-4 py-3 text-zinc-500 hover:text-zinc-900 hover:bg-primary-50 rounded-lg transition-colors">
            <Hammer className="w-5 h-5 mr-3" strokeWidth={1.5} />
            <span className="text-sm font-medium">施工管理</span>
          </a>
        </nav>

        <div className="p-8">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-primary-900 rounded-full flex items-center justify-center text-white text-xs font-medium">
              Admin
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-zinc-900">王老板</p>
              <p className="text-xs text-zinc-500">系统管理员</p>
            </div>
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* 顶部导航 */}
        <header className="h-20 bg-white border-b border-primary-50 flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center">
            <button className="md:hidden mr-4 text-zinc-500">
              <Menu className="w-6 h-6" strokeWidth={1.5} />
            </button>
            {/* 跑马灯播报 */}
            <div className="hidden sm:flex items-center bg-primary-50 px-4 py-2 rounded-full overflow-hidden max-w-md">
              <Bell className="w-4 h-4 text-primary-700/50 mr-3 flex-shrink-0" />
              <div className="whitespace-nowrap animate-marquee text-xs text-zinc-600 font-medium tracking-wide">
                {dashboardData.marquee.join("  |  ")}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-6 text-zinc-500">
            <button><Search className="w-5 h-5" strokeWidth={1.5} /></button>
            <button className="relative">
              <Bell className="w-5 h-5" strokeWidth={1.5} />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="md:hidden w-8 h-8 bg-primary-900 rounded-full flex items-center justify-center text-white text-xs font-medium">
              A
            </div>
          </div>
        </header>

        {/* 内容区 */}
        <div className="p-4 md:p-8 overflow-auto bg-primary-50/30">
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
      </main>

      {/* 跑马灯动画样式 */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          display: inline-block;
          animation: marquee 20s linear infinite;
        }
      `}} />
    </div>
  );
}
