"use client";

import { useState } from "react";
import { LayoutDashboard, Users, FileText, Hammer, Bell, Search, Menu, Building2, PackageOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import dashboardData from "../../mock_data/dashboard.json";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { name: "全局看板", href: "/", icon: LayoutDashboard },
    { name: "客户线索", href: "/leads", icon: Users },
    { name: "报价管理", href: "/quotes", icon: FileText },
    { name: "材料大厅", href: "/materials", icon: PackageOpen },
    { name: "施工管理", href: "/projects", icon: Hammer },
    { name: "组织架构", href: "/employees", icon: Building2 },
  ];

  return (
    <div className="h-screen flex overflow-hidden bg-[var(--bg-color)]">
      {/* 侧边栏：融合风格 - 暖灰色底，深色字 */}
      <aside className="w-64 hidden md:flex flex-col bg-primary-50 border-r border-primary-100 transition-colors duration-300 h-full shrink-0">
        <div className="h-20 flex items-center px-8 border-b border-primary-100">
          <h1 className="text-xl font-bold tracking-tight text-primary-900">
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
                className={`flex items-center px-4 py-2.5 rounded-md transition-colors ${
                  isActive 
                    ? "text-primary-900 bg-white shadow-sm border border-primary-100 font-bold" 
                    : "text-primary-600 hover:text-primary-900 hover:bg-white/50"
                }`}
              >
                <item.icon className="w-5 h-5 mr-3" strokeWidth={1.5} />
                <span className="text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-8 border-t border-primary-100">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-primary-900 text-white shadow-sm">
              A
            </div>
            <div className="ml-3">
              <p className="text-sm font-bold text-primary-900">王老板</p>
              <p className="text-xs text-primary-600">系统管理员</p>
            </div>
          </div>
        </div>
      </aside>

      {/* 移动端侧边栏遮罩 */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* 移动端侧边栏 */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-primary-50 border-r border-primary-100 transform transition-transform duration-300 ease-in-out md:hidden flex flex-col ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="h-20 flex items-center px-8 border-b border-primary-100">
          <h1 className="text-xl font-bold tracking-tight text-primary-900">    
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
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center px-4 py-2.5 rounded-md transition-colors ${
                  isActive
                    ? "text-primary-900 bg-white shadow-sm border border-primary-100 font-bold"
                    : "text-primary-600 hover:text-primary-900 hover:bg-white/50"
                }`}
              >
                <item.icon className="w-5 h-5 mr-3" strokeWidth={1.5} />      
                <span className="text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col min-w-0 w-full h-full overflow-hidden">
        {/* 顶部导航 */}
        <header className="h-20 flex items-center justify-between px-4 md:px-8 shrink-0 bg-white border-b border-primary-100 shadow-sm">
          <div className="flex items-center">
            <button 
              className="md:hidden mr-2 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-primary-900"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" strokeWidth={1.5} />
            </button>
            {/* 跑马灯播报 */}
            <div className="hidden sm:flex items-center px-4 py-2 overflow-hidden max-w-md bg-primary-50 rounded-md border border-primary-100">
              <Bell className="w-4 h-4 mr-3 flex-shrink-0 text-primary-600" />  
              <div className="whitespace-nowrap animate-marquee text-xs font-medium tracking-wide text-primary-600 m-0">
                {dashboardData.marquee.join("  |  ")}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4 md:space-x-6 text-primary-600">
            <button className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:text-primary-900 transition-colors">
              <Search className="w-5 h-5" strokeWidth={1.5} />
            </button>

            <button className="relative p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:text-primary-900 transition-colors">
              <Bell className="w-5 h-5" strokeWidth={1.5} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium bg-primary-900 text-white">
              A
            </div>
          </div>
        </header>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
          <div className="min-h-full">
            {children}
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
