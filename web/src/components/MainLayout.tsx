"use client";

import { useState, useRef, useEffect } from "react";
import { LayoutDashboard, Users, FileText, Hammer, Bell, Search, Menu, Building2, PackageOpen, FileSignature, AlertCircle, FilePlus, CreditCard, LogOut, Settings, User, KeyRound, Loader2, CheckSquare } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ old: "", new: "", confirm: "" });
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 未登录拦截校验
    const userData = localStorage.getItem("pnzj_user");
    if (!userData) {
      if (pathname !== "/login") {
        window.location.href = "/login";
      } else {
        setIsCheckingAuth(false);
      }
    } else {
      try {
        setCurrentUser(JSON.parse(userData));
        setIsCheckingAuth(false);
      } catch (e) {
        localStorage.removeItem("pnzj_user");
        if (pathname !== "/login") {
          window.location.href = "/login";
        } else {
          setIsCheckingAuth(false);
        }
      }
    }
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("pnzj_user");
    router.push("/login");
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) {
      alert("两次输入的新密码不一致");
      return;
    }
    if (!passwordForm.old || !passwordForm.new) {
      alert("请填写完整");
      return;
    }

    setIsSubmittingPassword(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser._id,
          oldPassword: passwordForm.old,
          newPassword: passwordForm.new,
        }),
      });

      if (res.ok) {
        alert("密码修改成功，请重新登录");
        handleLogout();
      } else {
        const data = await res.json();
        alert(data.error || "密码修改失败");
      }
    } catch (err) {
      alert("网络错误，请稍后再试");
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin': return '系统管理员';
      case 'sales': return '销售/客服';
      case 'designer': return '设计师';
      case 'manager': return '项目经理';
      default: return '未知身份';
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-primary-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-900 mb-4"></div>
        <p className="text-primary-600 text-sm font-medium tracking-widest">验证身份中...</p>
      </div>
    );
  }

  const navItems = [
    { name: "全局看板", href: "/", icon: LayoutDashboard, roles: ['admin', 'sales', 'designer', 'manager'] },
    { name: "团队待办", href: "/todos", icon: CheckSquare, roles: ['admin', 'sales', 'designer', 'manager'] },
    { name: "客户管理", href: "/leads", icon: Users, roles: ['admin', 'sales', 'designer', 'manager'] },
    { name: "施工管理", href: "/projects", icon: Hammer, roles: ['admin', 'sales', 'designer', 'manager'] },
    { name: "报价管理", href: "/quotes", icon: FileSignature, roles: ['admin', 'sales', 'designer', 'manager'] },
    { name: "材料大厅", href: "/materials", icon: PackageOpen, roles: ['admin', 'sales', 'designer', 'manager'] },
    { name: "组织架构", href: "/employees", icon: Building2, roles: ['admin'] },
  ];

  // 过滤当前角色可见的菜单
  const visibleNavItems = navItems.filter(item => currentUser && item.roles.includes(currentUser.role));

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
          {visibleNavItems.map((item) => {
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
              {currentUser?.name?.[0] || 'U'}
            </div>
            <div className="ml-3">
              <p className="text-sm font-bold text-primary-900">{currentUser?.name || '用户'}</p>
              <p className="text-xs text-primary-600">{getRoleName(currentUser?.role)}</p>
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
          {visibleNavItems.map((item) => {
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
            
            {/* 用户头像与下拉菜单 */}
            <div className="relative" ref={userMenuRef}>
              <button 
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-primary-50/50 transition-colors focus:outline-none"
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium bg-primary-900 text-white shadow-sm">
                  {currentUser?.name?.[0] || 'U'}
                </div>
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-primary-100 rounded-xl shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-3 border-b border-primary-100 bg-primary-50/30">
                    <p className="text-sm font-bold text-primary-900">{currentUser?.name || '用户'}</p>
                    <p className="text-xs text-primary-600 mt-0.5">{getRoleName(currentUser?.role)}</p>
                  </div>
                  <div className="p-1">
                    <Link 
                      href="/employees"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center w-full px-3 py-2 text-sm text-primary-600 hover:text-primary-900 hover:bg-primary-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <User className="w-4 h-4 mr-2" />
                      个人信息
                    </Link>
                    <button 
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setPasswordForm({ old: "", new: "", confirm: "" });
                        setIsPasswordModalOpen(true);
                      }}
                      className="flex items-center w-full px-3 py-2 text-sm text-primary-600 hover:text-primary-900 hover:bg-primary-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <KeyRound className="w-4 h-4 mr-2" />
                      修改密码
                    </button>
                    <Link 
                      href="/employees"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center w-full px-3 py-2 text-sm text-primary-600 hover:text-primary-900 hover:bg-primary-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      系统设置
                    </Link>
                  </div>
                  <div className="p-1 border-t border-primary-100">
                    <button 
                      onClick={handleLogout}
                      className="flex items-center w-full px-3 py-2 text-sm text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors font-medium cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      退出登录
                    </button>
                  </div>
                </div>
              )}
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

      {/* 修改密码弹窗 */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-primary-900 mb-6">
              修改密码
            </h3>
            
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-primary-900">原密码 <span className="text-rose-500">*</span></label>
                <input 
                  type="password" 
                  value={passwordForm.old}
                  onChange={(e) => setPasswordForm({...passwordForm, old: e.target.value})}
                  placeholder="请输入当前登录密码"
                  className="w-full px-3 py-2 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-900 text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-primary-900">新密码 <span className="text-rose-500">*</span></label>
                <input 
                  type="password" 
                  value={passwordForm.new}
                  onChange={(e) => setPasswordForm({...passwordForm, new: e.target.value})}
                  placeholder="请输入新密码"
                  className="w-full px-3 py-2 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-900 text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-primary-900">确认新密码 <span className="text-rose-500">*</span></label>
                <input 
                  type="password" 
                  value={passwordForm.confirm}
                  onChange={(e) => setPasswordForm({...passwordForm, confirm: e.target.value})}
                  placeholder="请再次输入新密码"
                  className="w-full px-3 py-2 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-900 text-sm"
                  required
                />
              </div>
              
              <div className="pt-4 flex gap-3 border-t border-primary-100 mt-6">
                <button 
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-primary-200 text-primary-700 rounded-lg hover:bg-primary-50 transition-colors font-medium text-sm"
                  disabled={isSubmittingPassword}
                >
                  取消
                </button>
                <button 
                  type="submit"
                  disabled={isSubmittingPassword || !passwordForm.old || !passwordForm.new || !passwordForm.confirm}
                  className="flex-1 px-4 py-2.5 text-white rounded-lg transition-colors shadow-sm font-medium text-sm flex items-center justify-center bg-primary-900 hover:bg-primary-800 disabled:opacity-70"
                >
                  {isSubmittingPassword ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : null}
                  确认修改
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
