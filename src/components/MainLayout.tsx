"use client";

import { useState, useRef, useEffect } from "react";
import { LayoutDashboard, Users, FileText, Hammer, Bell, Search, Menu, Building2, PackageOpen, FileSignature, AlertCircle, FilePlus, CreditCard } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import dashboardData from "../../mock_data/dashboard.json";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navItems = [
    { name: "全局看板", href: "/", icon: LayoutDashboard },
    { name: "客户线索", href: "/leads", icon: Users },
    { name: "报价管理", href: "/quotes", icon: FileText },
    { name: "合同管理", href: "/contracts", icon: FileSignature },
    { name: "库存管理", href: "/materials", icon: PackageOpen },
    { name: "施工管理", href: "/projects", icon: Hammer },
    { name: "组织架构", href: "/employees", icon: Building2 },
  ];

  return (
    <div className="h-screen flex overflow-hidden bg-[var(--bg-color)]">
      {/* 侧边栏：融合风格 - 暖灰色底，深色字 */}
      <aside className="w-56 hidden md:flex flex-col bg-primary-50 border-r border-primary-100 transition-colors duration-300 h-full shrink-0">
        <div className="h-20 flex items-center px-6 border-b border-primary-100">
          <h1 className="text-xl font-bold tracking-tight text-primary-900">
            品诺筑家
          </h1>
        </div>
        
        <nav className="flex-1 py-6 px-3 space-y-2">
          {navItems.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
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

        <div className="p-6 border-t border-primary-100">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-primary-900 text-white shadow-sm">
              A
            </div>
            <div className="ml-3">
              <p className="text-sm font-bold text-primary-900">蒋老板</p>
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
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
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
            <h2 className="text-lg font-bold text-primary-900 hidden sm:block">工作台</h2>
          </div>

          <div className="flex items-center space-x-4 md:space-x-6 text-primary-600">
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className={`p-2 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors rounded-lg ${isNotifOpen ? 'bg-primary-50 text-primary-900' : 'hover:text-primary-900 hover:bg-primary-50/50'}`}
              >
                <Bell className="w-5 h-5" strokeWidth={1.5} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 sm:right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-80 -mr-12 sm:mr-0 bg-white border border-primary-100 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-4 border-b border-primary-100 flex justify-between items-center bg-primary-50/30">
                    <h3 className="font-bold text-primary-900">通知消息</h3>
                    <button className="text-xs font-medium text-primary-600 hover:text-primary-900">全部已读</button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    <div 
                      onClick={() => {
                        setIsNotifOpen(false);
                        window.location.href = '/quotes/P20240003';
                      }}
                      className="p-4 hover:bg-primary-50/50 transition-colors border-b border-primary-50/50 cursor-pointer relative group"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500 rounded-r-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <FilePlus className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-primary-900 mb-1">新报价单生成 <span className="inline-block w-1.5 h-1.5 bg-rose-500 rounded-full ml-1"></span></p>
                          <p className="text-xs text-primary-600 leading-snug">销售部李销售为客户“罗先生 (P20240003)”生成了新的报价单，金额 ¥104,871。</p>
                          <p className="text-xs text-primary-400 mt-2 font-mono">10 分钟前</p>
                        </div>
                      </div>
                    </div>
                    <div 
                      onClick={() => {
                        setIsNotifOpen(false);
                        window.location.href = '/contracts/P20240001';
                      }}
                      className="p-4 hover:bg-primary-50/50 transition-colors border-b border-primary-50/50 cursor-pointer relative group"
                    >
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-primary-900 mb-1">二期款已确认 <span className="inline-block w-1.5 h-1.5 bg-rose-500 rounded-full ml-1"></span></p>
                          <p className="text-xs text-primary-600 leading-snug">客户“高女士 (P20240001)”的二期款 ¥30,000 已确认到账。</p>
                          <p className="text-xs text-primary-400 mt-2 font-mono">2 小时前</p>
                        </div>
                      </div>
                    </div>
                    <div 
                      onClick={() => {
                        setIsNotifOpen(false);
                        window.location.href = '/projects';
                      }}
                      className="p-4 hover:bg-primary-50/50 transition-colors cursor-pointer relative group"
                    >
                      <div className="flex gap-3 opacity-60">
                        <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                          <AlertCircle className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-primary-900 mb-1">施工节点预警</p>
                          <p className="text-xs text-primary-600 leading-snug">项目“马女士 (P20240013)”水电阶段存在延期风险，请及时跟进。</p>
                          <p className="text-xs text-primary-400 mt-2 font-mono">昨天 14:30</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 bg-primary-50/50 border-t border-primary-100 text-center">
                    <Link 
                      href="/notifications"
                      onClick={() => setIsNotifOpen(false)}
                      className="text-sm font-medium text-primary-600 hover:text-primary-900 block w-full py-1"
                    >
                      查看所有通知
                    </Link>
                  </div>
                </div>
              )}
            </div>
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
    </div>
  );
}
