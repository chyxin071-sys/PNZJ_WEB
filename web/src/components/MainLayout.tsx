"use client";

import { useState, useRef, useEffect } from "react";
import { LayoutDashboard, Users, FileText, Hammer, Bell, Menu, Building2, PackageOpen, FileSignature, AlertCircle, LogOut, Settings, User, KeyRound, Loader2, CheckSquare, BarChart2, Warehouse, ScrollText, Eye, EyeOff } from "lucide-react";
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
  const [showOldPwd, setShowOldPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [recentNotifs, setRecentNotifs] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

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
        const user = JSON.parse(userData);
        setCurrentUser(user);
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

  // 拉取通知（登录后 + 每次打开铃铛）
  const fetchNotifs = async (user: any) => {
    if (!user) return;
    try {
      const params = new URLSearchParams({ userName: user.name, role: user.role });
      const res = await fetch(`/api/notifications?${params}`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setRecentNotifs(list.slice(0, 5));
        setUnreadCount(list.filter((n: any) => !n.isRead).length);
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (currentUser) {
      fetchNotifs(currentUser);
      // 每 60 秒轮询一次未读数
      const timer = setInterval(() => fetchNotifs(currentUser), 60000);
      return () => clearInterval(timer);
    }
  }, [currentUser]);

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
      case 'sales': return '销售';
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

  const navGroups = [
    {
      group: "",
      items: [
        { name: "团队待办", href: "/todos", icon: CheckSquare, roles: ['admin', 'sales', 'designer', 'manager'] },
        { name: "全局看板", href: "/", icon: LayoutDashboard, roles: ['admin', 'sales', 'designer', 'manager'] },
        { name: "数据分析", href: "/analytics", icon: BarChart2, roles: ['admin'] },
      ]
    },
    {
      group: "客户",
      items: [
        { name: "客户管理", href: "/leads", icon: Users, roles: ['admin', 'sales', 'designer', 'manager'] },
        { name: "报价管理", href: "/quotes", icon: FileSignature, roles: ['admin', 'sales', 'designer', 'manager'] },
        { name: "合同管理", href: "/contracts", icon: ScrollText, roles: ['admin', 'sales', 'designer', 'manager'] },
        { name: "工地管理", href: "/projects", icon: Hammer, roles: ['admin', 'sales', 'designer', 'manager'] },
      ]
    },
    {
      group: "物料",
      items: [
        { name: "材料大厅", href: "/materials", icon: PackageOpen, roles: ['admin', 'sales', 'designer', 'manager'] },
        { name: "库存管理", href: "/inventory", icon: Warehouse, roles: ['admin', 'manager'] },
      ]
    },
    {
      group: "管理",
      items: [
        { name: "组织架构", href: "/employees", icon: Building2, roles: ['admin', 'sales', 'designer', 'manager'] },
      ]
    },
  ];

  // 过滤当前角色可见的分组（空分组不显示）
  const visibleGroups = navGroups.map(g => ({
    ...g,
    items: g.items.filter(item => currentUser && item.roles.includes(currentUser.role))
  })).filter(g => g.items.length > 0);

  return (
    <div className="h-screen flex overflow-hidden bg-[var(--bg-color)]">
      {/* 侧边栏：融合风格 - 暖灰色底，深色字 */}
      <aside className="w-56 hidden md:flex flex-col bg-primary-50 border-r border-primary-100 transition-colors duration-300 h-full shrink-0">
        <div className="h-20 flex items-center px-6 border-b border-primary-100">
          <h1 className="text-xl font-bold tracking-tight text-primary-900">
            品诺筑家
          </h1>
        </div>
        
        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {visibleGroups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? "pt-2" : ""}>
              {group.group && (
                <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-primary-400">{group.group}</p>
              )}
              {group.items.map((item) => {
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
            </div>
          ))}
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

        <nav className="flex-1 py-8 px-4 space-y-1 overflow-y-auto">
          {visibleGroups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? "pt-2" : ""}>
              {group.group && (
                <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-primary-400">{group.group}</p>
              )}
              {group.items.map((item) => {
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
            </div>
          ))}
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
                onClick={() => { setIsNotifOpen(!isNotifOpen); if (!isNotifOpen) fetchNotifs(currentUser); }}
                className={`p-2 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors rounded-lg relative ${isNotifOpen ? 'bg-primary-50 text-primary-900' : 'hover:text-primary-900 hover:bg-primary-50/50'}`}
              >
                <Bell className="w-5 h-5" strokeWidth={1.5} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 sm:right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-80 -mr-12 sm:mr-0 bg-white border border-primary-100 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-4 border-b border-primary-100 flex justify-between items-center bg-primary-50/30">
                    <h3 className="font-bold text-primary-900 flex items-center gap-2">
                      通知消息
                      {unreadCount > 0 && <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>}
                    </h3>
                    <button
                      onClick={async () => {
                        const unread = recentNotifs.filter(n => !n.isRead);
                        await Promise.all(unread.map(n =>
                          fetch(`/api/notifications/${n._id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ isRead: true })
                          })
                        ));
                        setRecentNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
                        setUnreadCount(0);
                      }}
                      className="text-xs font-medium text-primary-600 hover:text-primary-900"
                    >
                      全部已读
                    </button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {recentNotifs.length === 0 ? (
                      <div className="p-8 text-center text-primary-400 text-sm">暂无通知</div>
                    ) : recentNotifs.map(notif => {
                      const typeIconMap: Record<string, React.ReactNode> = {
                        project: <AlertCircle className="w-4 h-4" />,
                        lead: <Users className="w-4 h-4" />,
                        quote: <FileText className="w-4 h-4" />,
                        todo: <CheckSquare className="w-4 h-4" />
                      };
                      const typeBgMap: Record<string, string> = {
                        project: 'bg-amber-50 text-amber-600',
                        lead: 'bg-blue-50 text-blue-600',
                        quote: 'bg-emerald-50 text-emerald-600',
                        todo: 'bg-purple-50 text-purple-600'
                      };
                      const formatNotifTime = (t: any) => {
                        if (!t) return '';
                        const d = typeof t === 'object' && t.$date ? new Date(t.$date) : new Date(t);
                        if (isNaN(d.getTime())) return '';
                        const now = new Date();
                        const diff = Math.floor((now.getTime() - d.getTime()) / 60000);
                        if (diff < 1) return '刚刚';
                        if (diff < 60) return `${diff}分钟前`;
                        if (diff < 1440) return `${Math.floor(diff/60)}小时前`;
                        return `${d.getMonth()+1}-${d.getDate()}`;
                      };
                      return (
                        <div
                          key={notif._id}
                          onClick={() => {
                            setIsNotifOpen(false);
                            if (!notif.isRead) {
                              fetch(`/api/notifications/${notif._id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ isRead: true })
                              });
                              setRecentNotifs(prev => prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n));
                              setUnreadCount(c => Math.max(0, c - 1));
                            }
                            if (notif.link) router.push(notif.link);
                          }}
                          className={`p-4 hover:bg-primary-50/50 transition-colors border-b border-primary-50/50 cursor-pointer relative ${!notif.isRead ? 'bg-primary-50/20' : ''}`}
                        >
                          {!notif.isRead && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-rose-500" />}
                          <div className="flex gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${typeBgMap[notif.type] || 'bg-primary-50 text-primary-600'}`}>
                              {typeIconMap[notif.type] || <Bell className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm mb-0.5 flex items-center gap-1 ${!notif.isRead ? 'font-bold text-primary-900' : 'font-medium text-primary-800'}`}>
                                {notif.title}
                                {!notif.isRead && <span className="inline-block w-1.5 h-1.5 bg-rose-500 rounded-full shrink-0" />}
                              </p>
                              <p className="text-xs text-primary-600 leading-snug line-clamp-2">{notif.content}</p>
                              <p className="text-xs text-primary-400 mt-1.5 font-mono">{formatNotifTime(notif.createTime)}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
                <div className="relative">
                  <input 
                    type={showOldPwd ? "text" : "password"} 
                    value={passwordForm.old}
                    onChange={(e) => setPasswordForm({...passwordForm, old: e.target.value})}
                    placeholder="请输入当前登录密码"
                    className="w-full px-3 py-2 pr-10 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-900 text-sm"
                    required
                  />
                  <button 
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-400 hover:text-primary-600 focus:outline-none"
                    onClick={() => setShowOldPwd(!showOldPwd)}
                  >
                    {showOldPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-primary-900">新密码 <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <input 
                    type={showNewPwd ? "text" : "password"} 
                    value={passwordForm.new}
                    onChange={(e) => setPasswordForm({...passwordForm, new: e.target.value})}
                    placeholder="请输入新密码"
                    className="w-full px-3 py-2 pr-10 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-900 text-sm"
                    required
                  />
                  <button 
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-400 hover:text-primary-600 focus:outline-none"
                    onClick={() => setShowNewPwd(!showNewPwd)}
                  >
                    {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-primary-900">确认新密码 <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <input 
                    type={showConfirmPwd ? "text" : "password"} 
                    value={passwordForm.confirm}
                    onChange={(e) => setPasswordForm({...passwordForm, confirm: e.target.value})}
                    placeholder="请再次输入新密码"
                    className="w-full px-3 py-2 pr-10 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-900 text-sm"
                    required
                  />
                  <button 
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-400 hover:text-primary-600 focus:outline-none"
                    onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                  >
                    {showConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
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
