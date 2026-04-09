"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCircle2, FilePlus, CreditCard, AlertCircle, Trash2, ArrowLeft } from "lucide-react";
import MainLayout from "../../components/MainLayout";

export default function NotificationsPage() {
  const router = useRouter();
  
  // 模拟通知数据
  const [notifications, setNotifications] = useState([
    {
      id: "notif-1",
      type: "quote",
      title: "新报价单生成",
      message: "销售部李销售为客户“罗先生 (P20240003)”生成了新的报价单，金额 ¥104,871。",
      time: "10 分钟前",
      isRead: false,
      link: "/quotes/P20240003"
    },
    {
      id: "notif-2",
      type: "payment",
      title: "二期款已确认",
      message: "客户“高女士 (P20240001)”的二期款 ¥30,000 已确认到账。",
      time: "2 小时前",
      isRead: false,
      link: "/contracts/P20240001"
    },
    {
      id: "notif-3",
      type: "alert",
      title: "施工节点预警",
      message: "项目“马女士 (P20240013)”水电阶段存在延期风险，请及时跟进。",
      time: "昨天 14:30",
      isRead: true,
      link: "/projects"
    },
    {
      id: "notif-4",
      type: "quote",
      title: "报价单已保存",
      message: "客户“张先生 (P20240015)”的报价单已由蒋老板修改并保存。",
      time: "昨天 16:45",
      isRead: true,
      link: "/quotes/P20240015"
    }
  ]);

  const [activeTab, setActiveTab] = useState("all"); // all, unread

  const handleMarkAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  const handleMarkAsRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const handleNotificationClick = (notif: any) => {
    if (!notif.isRead) {
      setNotifications(notifications.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
    }
    router.push(notif.link);
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === "unread") return !n.isRead;
    return true;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case "quote": return <FilePlus className="w-5 h-5 text-blue-600" />;
      case "payment": return <CreditCard className="w-5 h-5 text-emerald-600" />;
      case "alert": return <AlertCircle className="w-5 h-5 text-rose-600" />;
      default: return <Bell className="w-5 h-5 text-primary-600" />;
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case "quote": return "bg-blue-50 border-blue-100";
      case "payment": return "bg-emerald-50 border-emerald-100";
      case "alert": return "bg-rose-50 border-rose-100";
      default: return "bg-primary-50 border-primary-100";
    }
  };

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
              <button 
                onClick={() => setActiveTab("all")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "all" ? "bg-white shadow-sm border border-primary-200 text-primary-900" : "text-primary-600 hover:bg-white/50"}`}
              >
                全部消息
              </button>
              <button 
                onClick={() => setActiveTab("unread")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center ${activeTab === "unread" ? "bg-white shadow-sm border border-primary-200 text-primary-900" : "text-primary-600 hover:bg-white/50"}`}
              >
                未读消息
                {notifications.filter(n => !n.isRead).length > 0 && (
                  <span className="ml-2 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {notifications.filter(n => !n.isRead).length}
                  </span>
                )}
              </button>
            </div>
            
            <button 
              onClick={handleMarkAllAsRead}
              disabled={notifications.filter(n => !n.isRead).length === 0}
              className="text-sm font-medium text-primary-600 hover:text-primary-900 flex items-center px-3 py-2 rounded-lg hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> 全部标为已读
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredNotifications.length > 0 ? (
              <div className="divide-y divide-primary-50">
                {filteredNotifications.map(notif => (
                  <div 
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-5 flex gap-4 cursor-pointer transition-all hover:bg-primary-50 group relative
                      ${!notif.isRead ? 'bg-primary-50/30' : ''}
                    `}
                  >
                    {!notif.isRead && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500 rounded-r-sm"></div>
                    )}
                    
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${getIconBg(notif.type)}`}>
                      {getIcon(notif.type)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className={`text-base flex items-center ${!notif.isRead ? 'font-bold text-primary-900' : 'font-medium text-primary-800'}`}>
                          {notif.title}
                          {!notif.isRead && <span className="inline-block w-2 h-2 bg-rose-500 rounded-full ml-2"></span>}
                        </h3>
                        <span className="text-xs font-mono text-primary-400 whitespace-nowrap ml-4">{notif.time}</span>
                      </div>
                      <p className={`text-sm ${!notif.isRead ? 'text-primary-700' : 'text-primary-500'}`}>
                        {notif.message}
                      </p>
                    </div>

                    <div className="flex flex-col items-end justify-center space-y-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 w-10">
                      {!notif.isRead && (
                        <button 
                          onClick={(e) => handleMarkAsRead(notif.id, e)}
                          title="标为已读"
                          className="p-1.5 text-primary-400 hover:text-primary-900 hover:bg-primary-100 rounded-md transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      <button 
                        onClick={(e) => handleDelete(notif.id, e)}
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
                <p>没有找到相关消息通知</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}