"use client";

import { LayoutDashboard, Users, FileText, Hammer, Bell, Search, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import dashboardData from "../../mock_data/dashboard.json";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { name: "全局看板", href: "/", icon: LayoutDashboard },
    { name: "客户线索", href: "/leads", icon: Users },
    { name: "报价与材料", href: "/quotes", icon: FileText },
    { name: "施工管理", href: "/projects", icon: Hammer },
  ];

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
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.name}
                href={item.href}
                className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                  isActive 
                    ? "text-zinc-900 bg-primary-50" 
                    : "text-zinc-500 hover:text-zinc-900 hover:bg-primary-50"
                }`}
              >
                <item.icon className="w-5 h-5 mr-3" strokeWidth={1.5} />
                <span className="text-sm font-medium">{item.name}</span>
              </Link>
            );
          })}
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
        <header className="h-20 bg-white border-b border-primary-50 flex items-center justify-between px-4 md:px-8 shrink-0">
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

        {/* 内容区，各个子页面将渲染在这里 */}
        <div className="flex-1 overflow-auto bg-primary-50/30">
          {children}
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