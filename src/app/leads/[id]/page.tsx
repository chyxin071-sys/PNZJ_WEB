"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, MapPin, Phone, User, Calendar, MessageSquare, FileText, FolderOpen, ArrowRight, Upload, Plus, Edit2, Check, ChevronDown, Trash2, X } from "lucide-react";
import MainLayout from "../../../components/MainLayout";
import leadsData from "../../../../mock_data/leads.json";

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.id as string;
  
  const [lead, setLead] = useState<any>(null);
  const [newNote, setNewNote] = useState("");
  const [timeline, setTimeline] = useState<any[]>([]);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteContent, setEditNoteContent] = useState("");
  
  // UI states
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [files, setFiles] = useState([
    { id: 'f1', name: '原始户型图.pdf', size: '2.4 MB', type: 'pdf' },
    { id: 'f2', name: '客户需求调研表.docx', size: '156 KB', type: 'doc' }
  ]);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteFileConfirmId, setDeleteFileConfirmId] = useState<string | null>(null);
  
  // 确认更换人员的弹窗状态
  const [personnelConfirm, setPersonnelConfirm] = useState<{ role: string, oldName: string, newName: string } | null>(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (leadId) {
      const foundLead = leadsData.find(l => l.id === leadId);
      if (foundLead) {
        setLead(foundLead);
        setEditForm(foundLead);
        // 初始化模拟时间轴数据
        const mockTimeline = [
          {
            id: '2',
            type: 'user',
            user: foundLead.sales,
            time: `${foundLead.lastFollowUp} 14:30`,
            content: foundLead.notes
          }
        ];

        if (["已量房", "方案阶段", "已交定金", "已签单"].includes(foundLead.status)) {
           mockTimeline.push({
            id: '3',
            type: 'system',
            user: '系统',
            time: `${foundLead.lastFollowUp} 10:00`,
            content: `【系统日志】关联报价单 Q-2024${foundLead.id.split('-')[1] || '0000'} 已生成，已推送通知至销售与设计。`
           });
        }
        
        if (foundLead.status === "已签单") {
           mockTimeline.push({
            id: '4',
            type: 'system',
            user: '系统',
            time: `${foundLead.lastFollowUp} 15:00`,
            content: `【系统日志】施工节点“水电验收”已完成打卡，相关进度已同步更新并通知全员。`
           });
        }

        mockTimeline.push({
            id: '1',
            type: 'system',
            user: '系统',
            time: `${foundLead.createdAt} 10:15`,
            content: `【系统日志】线索已录入系统，初步意向评级：${foundLead.rating}。`
        });

        // 排序：时间倒序
        mockTimeline.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        setTimeline(mockTimeline);
      }
    }
  }, [leadId]);

  if (!lead) {
    return (
      <MainLayout>
        <div className="p-8 text-center text-primary-500">正在加载客户信息...</div>
      </MainLayout>
    );
  }

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    
    const now = new Date();
    const newTimelineItem = {
      id: Date.now().toString(),
      type: 'user',
      user: '王老板', // 当前登录用户
      time: `${now.toISOString().split('T')[0]} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`,
      content: newNote
    };
    
    setTimeline([newTimelineItem, ...timeline]);
    setNewNote("");
  };

  const handleEditNote = (id: string) => {
    if (!editNoteContent.trim()) return;
    setTimeline(timeline.map(item => item.id === id ? { ...item, content: editNoteContent } : item));
    setEditingNoteId(null);
  };

  const handleDeleteNote = (id: string) => {
    setTimeline(timeline.filter(item => item.id !== id));
    setDeleteConfirmId(null);
  };

  const handleFileUpload = () => {
    setIsUploading(true);
    // 模拟文件上传过程
    setTimeout(() => {
      const newFile = {
        id: Date.now().toString(),
        name: `新上传文件_${Math.floor(Math.random() * 1000)}.pdf`,
        size: `${(Math.random() * 5 + 0.1).toFixed(1)} MB`,
        type: 'pdf'
      };
      setFiles([newFile, ...files]);
      setIsUploading(false);
    }, 1500);
  };

  const handleUpdateInfo = (e: React.FormEvent) => {
    e.preventDefault();
    setLead(editForm);
    setIsEditModalOpen(false);
  };

  const handleConfirmPersonnelChange = () => {
    if (!personnelConfirm) return;
    
    // 更新数据
    if (personnelConfirm.role === '销售') setLead({...lead, sales: personnelConfirm.newName});
    if (personnelConfirm.role === '设计') setLead({...lead, designer: personnelConfirm.newName});
    if (personnelConfirm.role === '工长') setLead({...lead, manager: personnelConfirm.newName});
    
    // 模拟发送通知并关闭弹窗
    setPersonnelConfirm(null);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
    
    // 向系统铃铛发送通知（模拟全局状态更新）
    // 实际项目中这里会调用 API 或全局状态管理器
    console.log(`[系统通知] ${personnelConfirm.role}人员已更换为 ${personnelConfirm.newName}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "沟通中": return "bg-blue-50 text-blue-700 border-blue-100";
      case "已量房": return "bg-indigo-50 text-indigo-700 border-indigo-100";
      case "已交定金": return "bg-pink-50 text-pink-700 border-pink-100";
      case "方案阶段": return "bg-purple-50 text-purple-700 border-purple-100";
      case "已签单": return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "已流失": return "bg-zinc-100 text-zinc-500 border-zinc-200";
      default: return "bg-zinc-50 text-zinc-700 border-zinc-200";
    }
  };

  return (
    <MainLayout>
      <div className="p-8 max-w-[1200px] mx-auto space-y-6">
        {/* 返回按钮 */}
        <button 
          onClick={() => router.back()}
          className="flex items-center text-sm font-medium text-primary-600 hover:text-primary-900 mb-2 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          返回线索列表
        </button>

        {/* 顶部客户名片 */}
        <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4 md:gap-6">
              <div className="w-16 h-16 rounded-2xl bg-primary-900 text-white flex items-center justify-center text-2xl font-bold shrink-0 shadow-md">
                {lead.name.charAt(0)}
              </div>
              <div className="space-y-3 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold text-primary-900 flex items-center gap-2">
                    {lead.name}
                    <span className="text-sm font-normal text-primary-500 font-mono mt-1">({lead.id})</span>
                  </h1>
                  
                  {/* 状态和评级徽章移到这里，与名字同行，移动端自动折行 */}
                  <div className="flex items-center gap-2">
                    {/* 意向评级下拉 */}
                    <div className="relative">
                      <div 
                        onClick={() => setOpenDropdown(openDropdown === 'rating' ? null : 'rating')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer flex items-center transition-colors hover:opacity-80 ${
                          lead.rating === 'A' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                          lead.rating === 'B' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                          lead.rating === 'C' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                          'bg-blue-50 text-blue-600 border border-blue-100'
                        }`}
                      >
                        {lead.rating}级
                        <ChevronDown className="w-3 h-3 ml-1 opacity-60" />
                      </div>
                      {openDropdown === 'rating' && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
                          <div className="absolute left-0 z-20 w-32 mt-1.5 bg-white border border-primary-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 py-1">
                            {['A', 'B', 'C', 'D'].map(option => (
                              <div 
                                key={option}
                                onClick={() => { setLead({...lead, rating: option}); setOpenDropdown(null); }}
                                className="px-2 py-1 mx-1"
                              >
                                <div className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${lead.rating === option ? 'bg-primary-50/80 text-primary-900 font-medium' : 'text-primary-700 hover:bg-primary-50'}`}>
                                  <span className="text-sm">{option}级</span>
                                  {lead.rating === option && <Check className="w-4 h-4 text-primary-900" />}
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* 状态下拉 */}
                    <div className="relative">
                      <div 
                        onClick={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer flex items-center transition-colors hover:opacity-80 border ${getStatusColor(lead.status)}`}
                      >
                        {lead.status}
                        <ChevronDown className="w-3 h-3 ml-1 opacity-60" />
                      </div>
                      {openDropdown === 'status' && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
                          <div className="absolute left-0 z-20 w-32 mt-1.5 bg-white border border-primary-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 py-1">
                            {["沟通中", "已量房", "方案阶段", "已交定金", "已签单", "已流失"].map(option => (
                              <div 
                                key={option}
                                onClick={() => { setLead({...lead, status: option}); setOpenDropdown(null); }}
                                className="px-2 py-1 mx-1"
                              >
                                <div className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${lead.status === option ? 'bg-primary-50/80 text-primary-900 font-medium' : 'text-primary-700 hover:bg-primary-50'}`}>
                                  <span className="text-sm">{option}</span>
                                  {lead.status === option && <Check className="w-4 h-4 text-primary-900" />}
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* 编辑信息按钮 */}
                  <button 
                    onClick={() => { setEditForm(lead); setIsEditModalOpen(true); }}
                    className="p-1.5 text-primary-400 hover:text-primary-900 hover:bg-primary-50 rounded-md transition-colors relative z-10"
                    title="编辑客户信息"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 text-sm text-primary-700">
                  <span className="flex items-center"><Phone className="w-4 h-4 mr-2 text-primary-400" /> {lead.phone}</span>
                  <span className="flex items-center"><MapPin className="w-4 h-4 mr-2 text-primary-400" /> {lead.address}</span>
                  <span className="flex items-center"><Calendar className="w-4 h-4 mr-2 text-primary-400" /> 录入于 {lead.createdAt}</span>
                </div>
              </div>
            </div>
          
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-primary-50/50 rounded-lg mt-4">
                  <div>
                    <p className="text-xs text-primary-500 mb-1">房屋面积</p>
                    <p className="text-sm font-medium text-primary-900">{lead.area} m²</p>
                  </div>
                  <div>
                    <p className="text-xs text-primary-500 mb-1">需求类型</p>
                    <p className="text-sm font-medium text-primary-900">{lead.requirementType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-primary-500 mb-1">预估预算</p>
                    <p className="text-sm font-medium text-primary-900">{lead.budget}</p>
                  </div>
                  <div>
                    <p className="text-xs text-primary-500 mb-1">客户来源</p>
                    <p className="text-sm font-medium text-primary-900">{lead.source}</p>
                  </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-stretch">
          {/* 左侧：跟进记录与售后 */}
          <div className="flex-1 flex flex-col h-[800px]">
            <div className="bg-white rounded-xl border border-primary-100 shadow-sm flex flex-col h-full">
              <div className="p-5 border-b border-primary-100 flex items-center justify-between shrink-0">
                <h2 className="text-lg font-bold text-primary-900 flex items-center">
                  <span className="w-1.5 h-4 bg-primary-900 mr-2 rounded-sm inline-block"></span>
                  跟进与沟通记录
                </h2>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 relative">
                {/* 垂直线 */}
                <div className="absolute left-[39px] top-8 bottom-8 w-px bg-primary-100"></div>
                
                <div className="space-y-8 relative z-10">
                  {timeline.map((item) => (
                    <div key={item.id} className="flex gap-4 group">
                      {item.type === 'system' ? (
                        <div className="w-8 h-8 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 ring-4 ring-white shadow-sm border border-primary-100">
                          <Plus className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary-900 text-white flex items-center justify-center shrink-0 ring-4 ring-white shadow-sm">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                      
                      <div className="pt-1.5 w-full">
                        <div className="flex items-baseline justify-between mb-2">
                          <div className="flex items-baseline gap-2">
                            <span className="font-bold text-sm text-primary-900">{item.user}</span>
                            <span className="text-xs text-primary-400 font-mono">{item.time}</span>
                          </div>
                          {item.type === 'user' && (
                            <div className="flex items-center space-x-1 relative">
                              <button onClick={() => { setEditingNoteId(item.id); setEditNoteContent(item.content); }} className="p-1.5 text-primary-400 hover:text-primary-900 transition-colors bg-primary-50 rounded-md hover:bg-primary-100">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setDeleteConfirmId(item.id)} className="p-1.5 text-primary-400 hover:text-rose-600 transition-colors bg-primary-50 rounded-md hover:bg-rose-50">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              {deleteConfirmId === item.id && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-primary-100 rounded-lg shadow-lg p-3 z-20">
                                  <p className="text-xs text-primary-900 font-medium mb-3">确定删除这条记录吗？</p>
                                  <div className="flex gap-2">
                                    <button onClick={() => setDeleteConfirmId(null)} className="flex-1 px-2 py-1.5 border border-primary-200 text-primary-600 rounded-md text-xs font-medium hover:bg-primary-50">取消</button>
                                    <button onClick={() => handleDeleteNote(item.id)} className="flex-1 px-2 py-1.5 bg-rose-500 text-white rounded-md text-xs font-medium hover:bg-rose-600">删除</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {editingNoteId === item.id ? (
                          <div className="flex gap-2">
                            <input 
                              type="text"
                              value={editNoteContent}
                              onChange={(e) => setEditNoteContent(e.target.value)}
                              className="flex-1 px-3 py-2 text-sm border border-primary-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                              autoFocus
                            />
                            <button onClick={() => handleEditNote(item.id)} className="px-3 py-2 bg-primary-900 text-white rounded-lg text-sm font-medium">保存</button>
                            <button onClick={() => setEditingNoteId(null)} className="px-3 py-2 border border-primary-200 text-primary-600 rounded-lg text-sm font-medium">取消</button>
                          </div>
                        ) : (
                          <div className={`text-sm leading-relaxed p-4 rounded-xl border ${item.type === 'system' ? 'bg-zinc-50 border-zinc-100 text-primary-600' : 'bg-primary-50/50 border-primary-100 text-primary-800'}`}>
                            {item.content}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 输入框 */}
              <div className="p-4 border-t border-primary-100 bg-primary-50/30 shrink-0">
                <form onSubmit={handleAddNote} className="flex gap-3">
                  <input 
                    type="text" 
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="输入最新的跟进情况、客户需求或售后记录..." 
                    className="flex-1 px-4 py-2.5 border border-primary-200 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 text-sm"
                  />
                  <button type="submit" className="px-6 py-2.5 bg-primary-900 text-white rounded-lg hover:bg-primary-800 transition-colors font-medium text-sm flex items-center shrink-0 shadow-sm">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    发送
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* 右侧：资料、报价与施工流转 */}
          <div className="w-full lg:w-80 shrink-0 flex flex-col gap-6 h-[800px] overflow-y-auto hide-scrollbar">
            
            {/* 负责人员卡片 */}
            <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-5">
              <h2 className="text-sm font-bold text-primary-900 mb-4">负责人员</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 text-xs font-bold">销售</div>
                    <span className="text-sm font-medium text-primary-900">{lead.sales}</span>
                  </div>
                  <button 
                    onClick={() => setOpenDropdown(openDropdown === 'edit-sales' ? null : 'edit-sales')}
                    className="text-xs text-primary-500 hover:text-primary-900 relative"
                  >
                    更改
                    {openDropdown === 'edit-sales' && (
                      <>
                        <div className="fixed inset-0 z-10 cursor-default" onClick={(e) => { e.stopPropagation(); setOpenDropdown(null); }} />
                        <div className="absolute right-0 top-full z-20 w-32 mt-1.5 bg-white border border-primary-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 py-1 text-left cursor-default" onClick={e => e.stopPropagation()}>
                          {["王销售", "李销售", "刘销售"].map(option => (
                            <div 
                              key={option}
                              onClick={() => { 
                                if (lead.sales !== option) {
                                  setPersonnelConfirm({ role: '销售', oldName: lead.sales, newName: option });
                                }
                                setOpenDropdown(null); 
                              }}
                              className="px-2 py-1 mx-1"
                            >
                              <div className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${lead.sales === option ? 'bg-primary-50/80 text-primary-900 font-medium' : 'text-primary-700 hover:bg-primary-50'}`}>
                                <span className="text-sm">{option}</span>
                                {lead.sales === option && <Check className="w-4 h-4 text-primary-900" />}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 text-xs font-bold">设计</div>
                    {lead.designer === "未分配" ? (
                      <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded">未分配</span>
                    ) : (
                      <span className="text-sm font-medium text-primary-900">{lead.designer}</span>
                    )}
                  </div>
                  <button 
                    onClick={() => setOpenDropdown(openDropdown === 'edit-designer' ? null : 'edit-designer')}
                    className="text-xs text-primary-500 hover:text-primary-900 relative"
                  >
                    {lead.designer === "未分配" ? "分配" : "更改"}
                    {openDropdown === 'edit-designer' && (
                      <>
                        <div className="fixed inset-0 z-10 cursor-default" onClick={(e) => { e.stopPropagation(); setOpenDropdown(null); }} />
                        <div className="absolute right-0 top-full z-20 w-32 mt-1.5 bg-white border border-primary-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 py-1 text-left cursor-default" onClick={e => e.stopPropagation()}>
                          {["未分配", "赵设计", "陈总监", "李设计"].map(option => (
                            <div 
                              key={option}
                              onClick={() => { 
                                if (lead.designer !== option) {
                                  setPersonnelConfirm({ role: '设计', oldName: lead.designer, newName: option });
                                }
                                setOpenDropdown(null); 
                              }}
                              className="px-2 py-1 mx-1"
                            >
                              <div className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${lead.designer === option ? 'bg-primary-50/80 text-primary-900 font-medium' : 'text-primary-700 hover:bg-primary-50'}`}>
                                <span className="text-sm">{option}</span>
                                {lead.designer === option && <Check className="w-4 h-4 text-primary-900" />}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </button>
                </div>

                {(lead.status === "已签单" || lead.status === "施工中") && (
                  <div className="flex items-center justify-between pt-4 border-t border-primary-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 text-xs font-bold">工长</div>
                      <span className="text-sm font-medium text-primary-900">{lead.manager || "待指派"}</span>
                    </div>
                    <button 
                      onClick={() => setOpenDropdown(openDropdown === 'edit-manager' ? null : 'edit-manager')}
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-medium relative"
                    >
                      {lead.manager ? "更改" : "指派"}
                      {openDropdown === 'edit-manager' && (
                        <>
                          <div className="fixed inset-0 z-10 cursor-default" onClick={(e) => { e.stopPropagation(); setOpenDropdown(null); }} />
                          <div className="absolute right-0 top-full z-20 w-32 mt-1.5 bg-white border border-primary-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 py-1 text-left cursor-default" onClick={e => e.stopPropagation()}>
                            {["刘工", "张工", "李工长"].map(option => (
                              <div 
                                key={option}
                                onClick={() => { 
                                  if (lead.manager !== option) {
                                    setPersonnelConfirm({ role: '工长', oldName: lead.manager || '待指派', newName: option });
                                  }
                                  setOpenDropdown(null); 
                                }}
                                className="px-2 py-1 mx-1"
                              >
                                <div className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${lead.manager === option ? 'bg-primary-50/80 text-primary-900 font-medium' : 'text-primary-700 hover:bg-primary-50'}`}>
                                  <span className="text-sm">{option}</span>
                                  {lead.manager === option && <Check className="w-4 h-4 text-primary-900" />}
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 状态流转卡片 */}
            <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-5">
              <h2 className="text-sm font-bold text-primary-900 mb-4">业务流转</h2>
              <div className="space-y-3">
                <button 
                  onClick={() => router.push(`/quotes/new?leadId=${lead.id}`)}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-primary-200 hover:border-primary-900 hover:bg-primary-50 transition-colors group"
                >
                  <div className="flex items-center">
                    <FileText className="w-5 h-5 text-primary-600 group-hover:text-primary-900 mr-3" />
                    <span className="font-medium text-primary-900 text-sm">生成 / 查看报价单</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-primary-400 group-hover:text-primary-900" />
                </button>
                
                {(lead.status === "已签单" || lead.status === "施工中") && (
                  <button 
                    onClick={() => router.push(`/projects`)}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-colors group"
                  >
                    <div className="flex items-center">
                      <FolderOpen className="w-5 h-5 text-emerald-600 mr-3" />
                      <span className="font-medium text-emerald-900 text-sm">进入施工管理大屏</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-emerald-600" />
                  </button>
                )}
              </div>
            </div>

            {/* 文件与图纸 */}
            <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-5 flex flex-col flex-1 overflow-hidden">
              <div className="flex items-center justify-between mb-4 shrink-0">
                <h2 className="text-sm font-bold text-primary-900">文件与图纸资料</h2>
                <div className="flex gap-3">
                  <button 
                    onClick={handleFileUpload}
                    disabled={isUploading}
                    className="text-xs text-primary-600 hover:text-primary-900 flex items-center font-medium disabled:opacity-50"
                  >
                    {isUploading ? (
                      <>
                        <div className="w-3 h-3 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mr-1"></div>
                        上传中...
                      </>
                    ) : (
                      <>
                        <Upload className="w-3 h-3 mr-1" />
                        上传文件
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="space-y-2 flex-1 overflow-y-auto pr-1">
                {files.map(file => (
                  <div key={file.id} className="flex items-center justify-between p-2.5 bg-primary-50 rounded text-sm group relative">
                    <div className="flex items-center text-primary-700 truncate mr-2">
                      <FileText className={`w-4 h-4 mr-2 shrink-0 ${file.type === 'pdf' ? 'text-rose-500' : 'text-blue-500'}`} />
                      <span className="truncate" title={file.name}>{file.name}</span>
                    </div>
                    <div className="flex items-center shrink-0">
                      <span className="text-xs text-primary-400 mr-2">{file.size}</span>
                      <button 
                        className="flex items-center justify-center w-6 h-6 text-primary-400 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors"
                        onClick={() => setDeleteFileConfirmId(file.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      
                      {deleteFileConfirmId === file.id && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-primary-100 rounded-lg shadow-lg p-3 z-30">
                          <p className="text-xs text-primary-900 font-medium mb-3">确定删除 {file.name} 吗？</p>
                          <div className="flex gap-2">
                            <button onClick={() => setDeleteFileConfirmId(null)} className="flex-1 px-2 py-1.5 border border-primary-200 text-primary-600 rounded-md text-xs font-medium hover:bg-primary-50">取消</button>
                            <button onClick={() => { setFiles(files.filter(f => f.id !== file.id)); setDeleteFileConfirmId(null); }} className="flex-1 px-2 py-1.5 bg-rose-500 text-white rounded-md text-xs font-medium hover:bg-rose-600">删除</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-primary-400 mt-4 text-center">支持上传量房图、设计方案、合同扫描件等</p>
            </div>

          </div>
        </div>
      </div>
      {/* 更换人员确认弹窗 */}
      {personnelConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4 mx-auto">
                <User className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-center text-primary-900 mb-2">确认更换{personnelConfirm.role}</h3>
              <p className="text-sm text-center text-primary-600 mb-6">
                您确定要将该线索的{personnelConfirm.role}从 <span className="font-semibold text-primary-900">{personnelConfirm.oldName}</span> 更改为 <span className="font-semibold text-primary-900">{personnelConfirm.newName}</span> 吗？
                <br /><br />
                <span className="text-xs text-primary-400">系统将会发送消息通知相关人员。</span>
              </p>
              <div className="flex gap-3">
                <button onClick={() => setPersonnelConfirm(null)} className="flex-1 px-4 py-2 border border-primary-200 text-primary-700 rounded-lg hover:bg-primary-50 transition-colors font-medium">取消</button>
                <button onClick={handleConfirmPersonnelChange} className="flex-1 px-4 py-2 bg-primary-900 text-white rounded-lg hover:bg-primary-800 transition-colors font-medium">确认更换</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 模拟全局通知 Toast */}
      {showToast && (
        <div className="fixed top-4 right-4 z-[70] bg-white border border-primary-100 rounded-xl shadow-lg p-4 flex items-start gap-3 animate-in slide-in-from-top-5 fade-in duration-300">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <Check className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-primary-900">人员已更换</p>
            <p className="text-xs text-primary-500 mt-0.5">已通过右上角 🔔 发送系统通知给相关人员。</p>
          </div>
        </div>
      )}

      {/* 编辑客户信息弹窗 */}
      {isEditModalOpen && editForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-6 border-b border-primary-100 rounded-t-2xl bg-white">
              <h2 className="text-xl font-bold text-primary-900">编辑客户信息</h2>
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="text-primary-400 hover:text-primary-900 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateInfo} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-primary-900 mb-1">客户姓名</label>
                  <input required type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full px-4 py-2.5 bg-primary-50 border border-transparent rounded-lg focus:border-primary-300 focus:bg-white focus:ring-2 focus:ring-primary-100 transition-all outline-none text-sm text-primary-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary-900 mb-1">联系电话</label>
                  <input required type="tel" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full px-4 py-2.5 bg-primary-50 border border-transparent rounded-lg focus:border-primary-300 focus:bg-white focus:ring-2 focus:ring-primary-100 transition-all outline-none text-sm text-primary-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary-900 mb-1">项目地址</label>
                  <input required type="text" value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} className="w-full px-4 py-2.5 bg-primary-50 border border-transparent rounded-lg focus:border-primary-300 focus:bg-white focus:ring-2 focus:ring-primary-100 transition-all outline-none text-sm text-primary-900" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className={`relative ${openDropdown === 'edit-requirement' ? 'z-30' : 'z-10'}`}>
                    <label className="block text-sm font-medium text-primary-900 mb-1">需求类型</label>
                    <div 
                      onClick={() => setOpenDropdown(openDropdown === 'edit-requirement' ? null : 'edit-requirement')}
                      className={`w-full px-4 py-2.5 border rounded-lg transition-all cursor-pointer flex justify-between items-center ${openDropdown === 'edit-requirement' ? 'bg-white border-primary-300 ring-2 ring-primary-100' : 'bg-primary-50 border-transparent hover:bg-primary-100/50'}`}
                    >
                      <span className="text-primary-900 text-sm">{editForm.requirementType}</span>
                      <ChevronDown className={`w-4 h-4 text-primary-400 transition-transform duration-200 ${openDropdown === 'edit-requirement' ? 'rotate-180' : ''}`} />
                    </div>
                    {openDropdown === 'edit-requirement' && (
                      <div className="absolute z-30 w-full mt-1.5 bg-white border border-primary-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 py-1">
                        {["毛坯", "旧改", "精装微调"].map(option => (
                          <div 
                            key={option}
                            onClick={() => { setEditForm({...editForm, requirementType: option}); setOpenDropdown(null); }}
                            className="px-2 py-1 mx-1"
                          >
                            <div className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${editForm.requirementType === option ? 'bg-primary-50/80 text-primary-900 font-medium' : 'text-primary-700 hover:bg-primary-50'}`}>
                              <span className="text-sm">{option}</span>
                              {editForm.requirementType === option && <Check className="w-4 h-4 text-primary-900" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className={`relative ${openDropdown === 'edit-source' ? 'z-30' : 'z-10'}`}>
                    <label className="block text-sm font-medium text-primary-900 mb-1">客户来源</label>
                    <div 
                      onClick={() => setOpenDropdown(openDropdown === 'edit-source' ? null : 'edit-source')}
                      className={`w-full px-4 py-2.5 border rounded-lg transition-all cursor-pointer flex justify-between items-center ${openDropdown === 'edit-source' ? 'bg-white border-primary-300 ring-2 ring-primary-100' : 'bg-primary-50 border-transparent hover:bg-primary-100/50'}`}
                    >
                      <span className="text-primary-900 text-sm">{editForm.source}</span>
                      <ChevronDown className={`w-4 h-4 text-primary-400 transition-transform duration-200 ${openDropdown === 'edit-source' ? 'rotate-180' : ''}`} />
                    </div>
                    {openDropdown === 'edit-source' && (
                      <div className="absolute z-30 w-full mt-1.5 bg-white border border-primary-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 py-1">
                        {["自然进店", "抖音", "老介新", "自有关系"].map(option => (
                          <div 
                            key={option}
                            onClick={() => { setEditForm({...editForm, source: option}); setOpenDropdown(null); }}
                            className="px-2 py-1 mx-1"
                          >
                            <div className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${editForm.source === option ? 'bg-primary-50/80 text-primary-900 font-medium' : 'text-primary-700 hover:bg-primary-50'}`}>
                              <span className="text-sm">{option}</span>
                              {editForm.source === option && <Check className="w-4 h-4 text-primary-900" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-900 mb-1">房屋面积 (m²)</label>
                    <input type="number" value={editForm.area} onChange={e => setEditForm({...editForm, area: e.target.value})} className="w-full px-4 py-2.5 bg-primary-50 border border-transparent rounded-lg focus:border-primary-300 focus:bg-white focus:ring-2 focus:ring-primary-100 transition-all outline-none text-sm text-primary-900" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-900 mb-1">预算</label>
                    <input type="text" value={editForm.budget} onChange={e => setEditForm({...editForm, budget: e.target.value})} className="w-full px-4 py-2.5 bg-primary-50 border border-transparent rounded-lg focus:border-primary-300 focus:bg-white focus:ring-2 focus:ring-primary-100 transition-all outline-none text-sm text-primary-900" />
                  </div>
                </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 px-4 py-2.5 border border-primary-200 text-primary-700 rounded-lg hover:bg-primary-50 transition-colors font-medium">取消</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-primary-900 text-white rounded-lg hover:bg-primary-800 transition-colors shadow-sm font-medium">保存修改</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
