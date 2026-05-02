"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCircle2, Trash2, ArrowLeft, Star, HardHat, Users, FileText, AlertCircle, Loader2 } from "lucide-react";
import MainLayout from "../../components/MainLayout";

function formatTime(createTime: any): string {
  if (!createTime) return '';
  let date: Date;
  if (typeof createTime === 'object' && createTime.$date) {
    date = new Date(createTime.$date);
  } else {
    date = new Date(createTime);
  }
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);

  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin} 分钟前`;
  if (diffHour < 24 && isToday) return `${diffHour} 小时前`;
  if (isYesterday) return `昨天 ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
  return `${date.getMonth()+1}-${date.getDate()} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
}

function getIcon(type: string) {
  switch (type) {
    case 'project': return <HardHat className="w-5 h-5 text-amber-600" />;
    case 'lead': return <Users className="w-5 h-5 text-blue-600" />;
    case 'quote': return <FileText className="w-5 h-5 text-emerald-600" />;
    case 'todo': return <CheckCircle2 className="w-5 h-5 text-purple-600" />;
    default: return <AlertCircle className="w-5 h-5 text-primary-600" />;
  }
}

function getIconBg(type: string) {
  switch (type) {
    case 'project': return 'bg-amber-50 border-amber-100';
    case 'lead': return 'bg-blue-50 border-blue-100';
    case 'quote': return 'bg-emerald-50 border-emerald-100';
    case 'todo': return 'bg-purple-50 border-purple-100';
    default: return 'bg-primary-50 border-primary-100';
  }
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'unread' | 'all' | 'starred'>('unread');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [avatarMap, setAvatarMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const userData = localStorage.getItem("pnzj_user") || localStorage.getItem("userInfo");
    if (userData) {
      try { setCurrentUser(JSON.parse(userData)); } catch (e) {}
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        userName: currentUser.name,
        role: currentUser.role,
        all: '1',
        tab: 'all'
      });
      const res = await fetch(`/api/notifications?${params}`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setNotifications(list);

        // 批量拉取发送人头像
        const senderNames = new Set(list.map((n: any) => n.senderName).filter((n: any) => n && n !== '系统'));
        if (senderNames.size > 0) {
          fetch('/api/employees')
            .then(r => r.ok ? r.json() : [])
            .then((users: any[]) => {
              if (Array.isArray(users)) {
                const map: Record<string, string> = {};
                users.forEach((u: any) => { if (u.avatarUrl && senderNames.has(u.name)) map[u.name] = u.avatarUrl; });
                setAvatarMap(map);
              }
            })
            .catch(() => {});
        }
      }
    } catch (e) {
      console.error('获取通知失败', e);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true })
      });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (e) {}
  };

  const handleMarkAllAsRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    await Promise.all(unread.map(n =>
      fetch(`/api/notifications/${n._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true })
      })
    ));
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleToggleStar = async (id: string, current: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isStarred: !current })
      });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isStarred: !current } : n));
    } catch (e) {}
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (e) {}
  };

  const handleClick = async (notif: any) => {
    if (!notif.isRead) {
      await fetch(`/api/notifications/${notif._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true })
      });
      setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n));
    }
    if (notif.link) {
      router.push(notif.link);
    }
  };

  const filtered = notifications.filter(n => {
    if (activeTab === 'unread') return !n.isRead;
    if (activeTab === 'starred') return n.isStarred;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <MainLayout>
      <div className="p-8 max-w-[1000px] mx-auto space-y-6">
        <div className="flex items-center space-x-4 mb-2">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-primary-50 rounded-lg text-primary-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-primary-900">消息通知</h1>
            <p className="text-primary-600 text-sm mt-1">查看系统中的所有业务动态与预警</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-primary-100 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-200px)]">
          <div className="p-4 border-b border-primary-100 flex justify-between items-center bg-primary-50/30">
            <div className="flex space-x-2">
              {(['unread', 'all', 'starred'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${activeTab === tab ? 'bg-white shadow-sm border border-primary-200 text-primary-900' : 'text-primary-600 hover:bg-white/50'}`}
                >
                  {tab === 'unread' && '未读消息'}
                  {tab === 'all' && '全部消息'}
                  {tab === 'starred' && <><Star className="w-3.5 h-3.5" />收藏</>}
                  {tab === 'unread' && unreadCount > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
              className="text-sm font-medium text-primary-600 hover:text-primary-900 flex items-center px-3 py-2 rounded-lg hover:bg-primary-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> 全部标为已读
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="h-full flex items-center justify-center text-primary-400">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span className="text-sm">加载中...</span>
              </div>
            ) : filtered.length > 0 ? (
              <div className="divide-y divide-primary-50">
                {filtered.map(notif => (
                  <div
                    key={notif._id}
                    onClick={() => handleClick(notif)}
                    className={`p-5 flex gap-4 cursor-pointer transition-all hover:bg-primary-50 group relative ${!notif.isRead ? 'bg-primary-50/30' : ''}`}
                  >
                    {!notif.isRead && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500 rounded-r-sm" />
                    )}

                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border overflow-hidden ${avatarMap[notif.senderName] ? 'border-primary-100' : getIconBg(notif.type)}`}>
                      {avatarMap[notif.senderName]
                        ? <img src={avatarMap[notif.senderName].startsWith('cloud://') ? `https://${avatarMap[notif.senderName].replace('cloud://','').split('.')[0]}.tcb.qcloud.la/${avatarMap[notif.senderName].split('/').slice(3).join('/')}` : avatarMap[notif.senderName]} alt="" className="w-full h-full object-cover" />
                        : notif.senderName && notif.senderName !== '系统'
                          ? <span className="text-base font-bold text-primary-700">{notif.senderName[0]}</span>
                          : getIcon(notif.type)
                      }
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className={`text-base flex items-center gap-1.5 ${!notif.isRead ? 'font-bold text-primary-900' : 'font-medium text-primary-800'}`}>
                          {notif.title}
                          {!notif.isRead && <span className="inline-block w-2 h-2 bg-rose-500 rounded-full shrink-0" />}
                          {notif.isStarred && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />}
                        </h3>
                        <span className="text-xs font-mono text-primary-400 whitespace-nowrap ml-4 shrink-0">{formatTime(notif.createTime)}</span>
                      </div>
                      <p className={`text-sm leading-relaxed ${!notif.isRead ? 'text-primary-700' : 'text-primary-500'}`}>
                        {notif.content}
                      </p>
                    </div>

                    <div className="flex flex-col items-end justify-center space-y-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      {!notif.isRead && (
                        <button
                          onClick={(e) => handleMarkAsRead(notif._id, e)}
                          title="标为已读"
                          className="p-1.5 text-primary-400 hover:text-primary-900 hover:bg-primary-100 rounded-md transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => handleToggleStar(notif._id, !!notif.isStarred, e)}
                        title={notif.isStarred ? '取消收藏' : '收藏'}
                        className={`p-1.5 rounded-md transition-colors ${notif.isStarred ? 'text-amber-400 hover:text-amber-500 hover:bg-amber-50' : 'text-primary-400 hover:text-amber-500 hover:bg-amber-50'}`}
                      >
                        <Star className={`w-4 h-4 ${notif.isStarred ? 'fill-amber-400' : ''}`} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(notif._id, e)}
                        title="删除消息"
                        className="p-1.5 text-primary-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-primary-400">
                <Bell className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-sm">{activeTab === 'unread' ? '暂无未读消息' : activeTab === 'starred' ? '暂无收藏消息' : '暂无消息通知'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
