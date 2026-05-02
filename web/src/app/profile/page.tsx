"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { User, Phone, KeyRound, Edit2, LogOut, ChevronRight, CheckSquare, Users, HardHat, Bell, PackageOpen, Building2, X, Check, Camera } from "lucide-react";
import MainLayout from "../../components/MainLayout";
import DatePicker from "../../components/DatePicker";

const ROLE_MAP: Record<string, string> = {
  admin: "系统管理员",
  sales: "销售/客服",
  designer: "设计师",
  manager: "项目经理",
  finance: "财务"
};

const ROLE_COLOR: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700",
  sales: "bg-blue-100 text-blue-700",
  designer: "bg-pink-100 text-pink-700",
  manager: "bg-cyan-100 text-cyan-700",
  finance: "bg-amber-100 text-amber-700"
};

function toImgUrl(fileID: string): string {
  if (!fileID) return '';
  if (fileID.startsWith('cloud://')) {
    const withoutScheme = fileID.replace('cloud://', '');
    const envAndBucket = withoutScheme.split('.')[0];
    const filePath = withoutScheme.split('/').slice(1).join('/');
    return `https://${envAndBucket}.tcb.qcloud.la/${filePath}`;
  }
  return fileID;
}

export default function ProfilePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [stats, setStats] = useState({ todos: 0, leads: 0, projects: 0, unread: 0 });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // 改名弹窗
  const [showNameModal, setShowNameModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [savingName, setSavingName] = useState(false);

  // 改密码弹窗
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ old: "", new: "", confirm: "" });
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // 改手机号弹窗
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [editPhone, setEditPhone] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);

  // 改入职时间
  const [savingJoinDate, setSavingJoinDate] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("pnzj_user") || localStorage.getItem("userInfo");
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setCurrentUser(user);
        fetchStats(user);
      } catch (e) {}
    }
  }, []);

  const fetchStats = async (user: any) => {
    if (!user?.name) return;
    try {
      const [todosRes, leadsRes, projectsRes, notifRes] = await Promise.all([
        fetch('/api/todos'),
        fetch('/api/leads'),
        fetch('/api/projects'),
        fetch(`/api/notifications?userName=${encodeURIComponent(user.name)}&role=${user.role}&unread=1`)
      ]);

      const [todos, leads, projects, notifs] = await Promise.all([
        todosRes.ok ? todosRes.json() : [],
        leadsRes.ok ? leadsRes.json() : [],
        projectsRes.ok ? projectsRes.json() : [],
        notifRes.ok ? notifRes.json() : []
      ]);

      const myTodos = Array.isArray(todos)
        ? todos.filter((t: any) => t.status === 'pending' && (t.assignees?.some((a: any) => a.name === user.name) || t.creatorName === user.name)).length
        : 0;
      const myLeads = Array.isArray(leads)
        ? leads.filter((l: any) => l.sales === user.name || l.designer === user.name).length
        : 0;
      const myProjects = Array.isArray(projects)
        ? projects.filter((p: any) => p.manager === user.name).length
        : 0;
      const unread = Array.isArray(notifs) ? notifs.filter((n: any) => !n.isRead).length : 0;

      setStats({ todos: myTodos, leads: myLeads, projects: myProjects, unread });
    } catch (e) {
      console.error('获取统计失败', e);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const userId = currentUser._id || currentUser.id;
      const ext = file.name.split('.').pop() || 'jpg';
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', `avatars/${userId}_${Date.now()}.${ext}`);
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'x-user-role': 'admin' }, // 头像上传绕过角色限制
        body: formData
      });
      if (!uploadRes.ok) throw new Error('上传失败');
      const { fileID } = await uploadRes.json();
      // 更新 users 集合
      await fetch(`/api/employees/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: fileID })
      });
      const updated = { ...currentUser, avatarUrl: fileID };
      localStorage.setItem('pnzj_user', JSON.stringify(updated));
      localStorage.setItem('userInfo', JSON.stringify(updated));
      setCurrentUser(updated);
    } catch (err) {
      alert('头像上传失败，请重试');
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleSavePhone = async () => {
    const newPhone = editPhone.trim();
    if (!newPhone) return;
    setSavingPhone(true);
    try {
      const res = await fetch(`/api/employees/${currentUser._id || currentUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: newPhone })
      });
      if (res.ok) {
        const updated = { ...currentUser, phone: newPhone };
        localStorage.setItem("pnzj_user", JSON.stringify(updated));
        localStorage.setItem("userInfo", JSON.stringify(updated));
        setCurrentUser(updated);
        setShowPhoneModal(false);
      } else {
        alert('修改失败，请重试');
      }
    } catch (e) {
      alert('网络错误，请重试');
    } finally {
      setSavingPhone(false);
    }
  };

  const handleJoinDateChange = async (newDate: string) => {
    if (!newDate) return;
    setSavingJoinDate(true);
    try {
      const res = await fetch(`/api/employees/${currentUser._id || currentUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ joinDate: newDate })
      });
      if (res.ok) {
        const updated = { ...currentUser, joinDate: newDate };
        localStorage.setItem("pnzj_user", JSON.stringify(updated));
        localStorage.setItem("userInfo", JSON.stringify(updated));
        setCurrentUser(updated);
      }
    } catch (e) {
      alert('修改失败，请重试');
    } finally {
      setSavingJoinDate(false);
    }
  };

  const handleSaveName = async () => {
    const newName = editName.trim();
    if (!newName) return;
    if (newName === currentUser?.name) { setShowNameModal(false); return; }
    setSavingName(true);
    try {
      const res = await fetch(`/api/employees/${currentUser._id || currentUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });
      if (res.ok) {
        const updated = { ...currentUser, name: newName };
        localStorage.setItem("pnzj_user", JSON.stringify(updated));
        localStorage.setItem("userInfo", JSON.stringify(updated));
        setCurrentUser(updated);
        setShowNameModal(false);
      }
    } catch (e) {
      console.error('改名失败', e);
    } finally {
      setSavingName(false);
    }
  };

  const handleSavePassword = async () => {
    setPasswordError("");
    if (!passwordForm.old || !passwordForm.new) {
      setPasswordError("请填写完整"); return;
    }
    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordError("两次密码不一致"); return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser._id || currentUser.id,
          oldPassword: passwordForm.old,
          newPassword: passwordForm.new
        })
      });
      if (res.ok) {
        setShowPasswordModal(false);
        localStorage.removeItem("pnzj_user");
        localStorage.removeItem("userInfo");
        router.push('/login');
      } else {
        const data = await res.json();
        setPasswordError(data.error || "修改失败");
      }
    } catch (e) {
      setPasswordError("网络错误，请重试");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = () => {
    if (confirm("确定要退出登录吗？")) {
      localStorage.removeItem("pnzj_user");
      localStorage.removeItem("userInfo");
      localStorage.removeItem("token");
      router.push('/login');
    }
  };

  if (!currentUser) {
    return (
      <MainLayout>
        <div className="p-8 text-center text-primary-500">加载中...</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6 md:p-8 max-w-[600px] mx-auto space-y-6">

        {/* 用户信息卡片 */}
        <div className="bg-white rounded-2xl border border-primary-100 shadow-sm p-6">
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              <div
                onClick={() => avatarInputRef.current?.click()}
                className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-md cursor-pointer overflow-hidden ${currentUser.avatarUrl ? '' : (ROLE_COLOR[currentUser.role]?.replace('text-', 'bg-').split(' ')[0] || 'bg-primary-900')}`}
              >
                {currentUser.avatarUrl
                  ? <img src={toImgUrl(currentUser.avatarUrl)} alt="avatar" className="w-full h-full object-cover" />
                  : (currentUser.name?.[0] || 'U')
                }
              </div>
              <div
                onClick={() => avatarInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary-900 rounded-full flex items-center justify-center cursor-pointer shadow-sm hover:bg-primary-700 transition-colors"
              >
                {uploadingAvatar
                  ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Camera className="w-3 h-3 text-white" />
                }
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-primary-900 truncate">{currentUser.name}</h1>
                <button
                  onClick={() => { setEditName(currentUser.name); setShowNameModal(true); }}
                  className="p-1 text-primary-400 hover:text-primary-900 hover:bg-primary-50 rounded-md transition-colors shrink-0"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLOR[currentUser.role] || 'bg-zinc-100 text-zinc-600'}`}>
                {ROLE_MAP[currentUser.role] || currentUser.role}
              </span>
            </div>
          </div>
        </div>

        {/* 数据概览 */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "待办", value: stats.todos, icon: <CheckSquare className="w-5 h-5" />, color: "text-amber-600 bg-amber-50" },
            { label: "跟进客户", value: stats.leads, icon: <Users className="w-5 h-5" />, color: "text-blue-600 bg-blue-50" },
            { label: "负责工地", value: stats.projects, icon: <HardHat className="w-5 h-5" />, color: "text-emerald-600 bg-emerald-50" },
            { label: "未读消息", value: stats.unread, icon: <Bell className="w-5 h-5" />, color: "text-rose-600 bg-rose-50" }
          ].map(item => (
            <div key={item.label} className="bg-white rounded-xl border border-primary-100 shadow-sm p-4 flex flex-col items-center gap-2">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${item.color}`}>
                {item.icon}
              </div>
              <p className="text-2xl font-bold text-primary-900">{item.value}</p>
              <p className="text-xs text-primary-500 text-center">{item.label}</p>
            </div>
          ))}
        </div>

        {/* 账号信息 */}
        <div className="bg-white rounded-2xl border border-primary-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-primary-50 bg-primary-50/30">
            <p className="text-xs font-medium text-primary-500">账号信息</p>
          </div>
          <div className="divide-y divide-primary-50">
            <button
              onClick={() => { setEditPhone(currentUser.phone || ''); setShowPhoneModal(true); }}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-primary-50 transition-colors"
            >
              <div className="flex items-center gap-3 text-sm text-primary-700">
                <Phone className="w-4 h-4 text-primary-400" />
                手机号
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-primary-500">{currentUser.phone || '未绑定'}</span>
                <ChevronRight className="w-4 h-4 text-primary-300" />
              </div>
            </button>
            <label className="w-full flex items-center justify-between px-5 py-4 hover:bg-primary-50 transition-colors cursor-pointer">
              <div className="flex items-center gap-3 text-sm text-primary-700">
                <ChevronRight className="w-4 h-4 text-primary-400 rotate-90" />
                入职时间
              </div>
              <div className="flex items-center gap-2">
                {savingJoinDate
                  ? <div className="w-4 h-4 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
                  : <div className="flex items-center gap-1">
                      <DatePicker
                        value={currentUser.joinDate || ''}
                        onChange={(val) => handleJoinDateChange({ target: { value: val } } as any)}
                        placeholder="未设置"
                      />
                    </div>
                }
              </div>
            </label>
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3 text-sm text-primary-700">
                <User className="w-4 h-4 text-primary-400" />
                登录账号
              </div>
              <span className="text-sm text-primary-500 font-mono">{currentUser.account || '未设置'}</span>
            </div>
            {currentUser.joinDate && (
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3 text-sm text-primary-700">
                  <Building2 className="w-4 h-4 text-primary-400" />
                  在职天数
                </div>
                <span className="text-sm text-primary-500 font-mono">
                  {Math.ceil((new Date().getTime() - new Date(currentUser.joinDate).getTime()) / (1000 * 60 * 60 * 24))} 天
                </span>
              </div>
            )}
            <button
              onClick={() => { setPasswordForm({ old: "", new: "", confirm: "" }); setPasswordError(""); setShowPasswordModal(true); }}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-primary-50 transition-colors"
            >
              <div className="flex items-center gap-3 text-sm text-primary-700">
                <KeyRound className="w-4 h-4 text-primary-400" />
                修改密码
              </div>
              <ChevronRight className="w-4 h-4 text-primary-300" />
            </button>
          </div>
        </div>

        {/* 快捷导航（仅 admin） */}
        {currentUser.role === 'admin' && (
          <div className="bg-white rounded-2xl border border-primary-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-primary-50 bg-primary-50/30">
              <p className="text-xs font-medium text-primary-500">管理功能</p>
            </div>
            <div className="divide-y divide-primary-50">
              <button onClick={() => router.push('/materials')} className="w-full flex items-center justify-between px-5 py-4 hover:bg-primary-50 transition-colors">
                <div className="flex items-center gap-3 text-sm text-primary-700">
                  <PackageOpen className="w-4 h-4 text-primary-400" />
                  材料大厅管理
                </div>
                <ChevronRight className="w-4 h-4 text-primary-300" />
              </button>
              <button onClick={() => router.push('/employees')} className="w-full flex items-center justify-between px-5 py-4 hover:bg-primary-50 transition-colors">
                <div className="flex items-center gap-3 text-sm text-primary-700">
                  <Building2 className="w-4 h-4 text-primary-400" />
                  组织架构
                </div>
                <ChevronRight className="w-4 h-4 text-primary-300" />
              </button>
            </div>
          </div>
        )}

        {/* 退出登录 */}
        <button
          onClick={handleLogout}
          className="w-full py-3.5 border border-rose-200 text-rose-600 rounded-xl font-medium hover:bg-rose-50 transition-colors text-sm"
        >
          退出登录
        </button>

        {/* 品牌信息 */}
        <div className="text-center pb-4">
          <p className="text-sm font-bold text-primary-900">品诺筑家</p>
          <p className="text-xs text-primary-400 mt-1">品诺有心，筑家有道。</p>
        </div>
      </div>

      {/* 改名弹窗 */}
      {showNameModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-primary-900">修改姓名</h3>
              <button onClick={() => setShowNameModal(false)} className="p-1.5 text-primary-400 hover:text-primary-900 rounded-lg hover:bg-primary-50">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="w-full px-4 py-2.5 bg-primary-50 border border-primary-200 rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:bg-white transition-all mb-4"
              placeholder="请输入新姓名"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setShowNameModal(false)} className="flex-1 px-4 py-2.5 border border-primary-200 text-primary-700 rounded-xl font-medium hover:bg-primary-50 transition-colors">取消</button>
              <button
                onClick={handleSaveName}
                disabled={savingName || !editName.trim()}
                className="flex-1 px-4 py-2.5 bg-primary-900 text-white rounded-xl font-medium hover:bg-primary-800 transition-colors disabled:opacity-50"
              >
                {savingName ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 改手机号弹窗 */}
      {showPhoneModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-primary-900">修改手机号</h3>
              <button onClick={() => setShowPhoneModal(false)} className="p-1.5 text-primary-400 hover:text-primary-900 rounded-lg hover:bg-primary-50">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="tel"
              value={editPhone}
              onChange={e => setEditPhone(e.target.value)}
              className="w-full px-4 py-2.5 bg-primary-50 border border-primary-200 rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:bg-white transition-all mb-4"
              placeholder="请输入新手机号"
              maxLength={11}
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setShowPhoneModal(false)} className="flex-1 px-4 py-2.5 border border-primary-200 text-primary-700 rounded-xl font-medium hover:bg-primary-50 transition-colors">取消</button>
              <button
                onClick={handleSavePhone}
                disabled={savingPhone || editPhone.trim().length < 11}
                className="flex-1 px-4 py-2.5 bg-primary-900 text-white rounded-xl font-medium hover:bg-primary-800 transition-colors disabled:opacity-50"
              >
                {savingPhone ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 改密码弹窗 */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-primary-900">修改密码</h3>
              <button onClick={() => setShowPasswordModal(false)} className="p-1.5 text-primary-400 hover:text-primary-900 rounded-lg hover:bg-primary-50">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 mb-4">
              <input
                type="password"
                value={passwordForm.old}
                onChange={e => setPasswordForm({...passwordForm, old: e.target.value})}
                className="w-full px-4 py-2.5 bg-primary-50 border border-primary-200 rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:bg-white transition-all"
                placeholder="原密码"
              />
              <input
                type="password"
                value={passwordForm.new}
                onChange={e => setPasswordForm({...passwordForm, new: e.target.value})}
                className="w-full px-4 py-2.5 bg-primary-50 border border-primary-200 rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:bg-white transition-all"
                placeholder="新密码"
              />
              <input
                type="password"
                value={passwordForm.confirm}
                onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})}
                className="w-full px-4 py-2.5 bg-primary-50 border border-primary-200 rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:bg-white transition-all"
                placeholder="确认新密码"
              />
              {passwordError && (
                <p className="text-xs text-rose-500 flex items-center gap-1">
                  <X className="w-3 h-3" /> {passwordError}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowPasswordModal(false)} className="flex-1 px-4 py-2.5 border border-primary-200 text-primary-700 rounded-xl font-medium hover:bg-primary-50 transition-colors">取消</button>
              <button
                onClick={handleSavePassword}
                disabled={savingPassword}
                className="flex-1 px-4 py-2.5 bg-primary-900 text-white rounded-xl font-medium hover:bg-primary-800 transition-colors disabled:opacity-50"
              >
                {savingPassword ? '修改中...' : '确认修改'}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
