"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, MapPin, User, Calendar, MessageSquare, FileText, FolderOpen, ArrowRight, Plus, Edit2, Check, ChevronDown, Trash2, X, Pencil, CheckCircle2, Clock, Upload, Image as ImageIcon, Play, Loader2, File, Film, Eye, EyeOff, Download } from "lucide-react";
import MainLayout from "../../../components/MainLayout";
import CustomerDocuments from "../../../components/CustomerDocuments";
import CustomerInfo from "../../../components/CustomerInfo";
import { getNextWorkingDay, calculateEndDate, formatDate } from "../../../lib/date";
import DatePicker from "../../../components/DatePicker";
import FolderSelectModal from "../../../components/FolderSelectModal";

function formatDateRange(start: string, end: string) {
  if (!start || !end) return `${start || '-'} ~ ${end || '-'}`;
  const startParts = start.split('-');
  const endParts = end.split('-');
  if (startParts.length !== 3 || endParts.length !== 3) return `${start} ~ ${end}`;
  if (startParts[0] === endParts[0]) {
    return `${start} ~ ${endParts[1]}-${endParts[2]}`;
  }
  return `${start} ~ ${end}`;
}

function formatSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getFileType(name: string): 'image' | 'video' | 'doc' | 'file' {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext)) return 'image';
  if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) return 'video';
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) return 'doc';
  return 'file';
}

function FileIcon({ type }: { type: string }) {
  const cls = "w-4 h-4";
  switch (type) {
    case 'image': return <ImageIcon className={`${cls} text-blue-500`} />;
    case 'video': return <Film className={`${cls} text-purple-500`} />;
    case 'doc': return <FileText className={`${cls} text-rose-500`} />;
    default: return <File className={`${cls} text-primary-500`} />;
  }
}

// 图片预览组件
function ImagePreview({ fileID, imgIdx, nodeIdx, canDelete, onDelete, getImageUrl }: any) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getImageUrl(fileID).then((u: string) => {
      setUrl(u);
      setLoading(false);
    });
  }, [fileID]);

  if (loading) {
    return (
      <div className="aspect-square rounded-lg bg-primary-100 animate-pulse flex items-center justify-center">
        <ImageIcon className="w-6 h-6 text-primary-300" />
      </div>
    );
  }

  return (
    <div className="relative group aspect-square rounded-lg overflow-hidden bg-primary-50 cursor-pointer">
      <img
        src={url}
        alt={`节点图片 ${imgIdx + 1}`}
        className="w-full h-full object-cover"
        onClick={() => window.open(url, '_blank')}
      />
      {canDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-600"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.id as string;
  
  const [lead, setLead] = useState<any>(null);
  const [leadNotFound, setLeadNotFound] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [timeline, setTimeline] = useState<any[]>([]);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteContent, setEditNoteContent] = useState("");
  
  // UI states
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  
  // 确认更换人员的弹窗状态
  const [personnelConfirm, setPersonnelConfirm] = useState<{ role: string, oldName: string, newName: string } | null>(null);
  const [isChangingPersonnel, setIsChangingPersonnel] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [signModal, setSignModal] = useState({ isOpen: false, date: '', signer: '' });
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);

  // 设计进度状态
  const [activeLeftTab, setActiveLeftTab] = useState<'follow' | 'design' | 'files'>('follow');
  const [showStartDesignModal, setShowStartDesignModal] = useState(false);
  const [designStartDate, setDesignStartDate] = useState('');
  const [editDesignNodes, setEditDesignNodes] = useState<any[]>([]);
  const [expandedNodeIdx, setExpandedNodeIdx] = useState<number | null>(null);
  const [uploadingNodeIdx, setUploadingNodeIdx] = useState<number | null>(null);
  const [nodeImageUrls, setNodeImageUrls] = useState<{ [key: string]: string }>({});

  // 设计节点文件上传相关
  const [showDesignFileFolderModal, setShowDesignFileFolderModal] = useState(false);
  const [pendingDesignFiles, setPendingDesignFiles] = useState<File[]>([]);
  const [currentUploadNodeIdx, setCurrentUploadNodeIdx] = useState<number | null>(null);

  const designNodeOptions = ['平面布局', '效果图渲染', '施工图深化', '定制图纸绘制', '自定义'];

  useEffect(() => {
    const userData = localStorage.getItem("pnzj_user") || localStorage.getItem("userInfo") || localStorage.getItem("user");
    if (userData) {
      try {
        setCurrentUser(JSON.parse(userData));
      } catch (e) {
        console.error(e);
      }
    }

    // 进入页面默认在跟进记录 tab，直接标记已读
    localStorage.setItem(`followup_read_${leadId}`, Date.now().toString());

    // 获取所有的 users 列表以供分配和签单人选择
    fetch('/api/employees')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setUsers(data);
      })
      .catch(console.error);
  }, []);

  const isAssignedToMe = (leadData: any) => {
    if (!currentUser) return false;
    return leadData.sales === currentUser.name || leadData.designer === currentUser.name || leadData.manager === currentUser.name || leadData.creatorName === currentUser.name || leadData.signer === currentUser.name;
  };

  // 入户密码：admin 或与该客户相关的人员可见
  const canSeeDoorPassword = (leadData: any) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    return isAssignedToMe(leadData);
  };

  const maskName = (name: string, leadData: any) => {
    if (!currentUser || currentUser.role === 'admin') return name;
    if (isAssignedToMe(leadData) || leadData.status === '已签单' || leadData.status === '施工中') return name;
    if (!name) return name;
    return name.substring(0, 1) + '**';
  };

  const maskPhone = (phone: string, leadData: any) => {
    if (!currentUser || currentUser.role === 'admin') return phone;
    if (isAssignedToMe(leadData) || leadData.status === '已签单' || leadData.status === '施工中') return phone;
    if (!phone || phone.length < 11) return phone;
    return phone.substring(0, 3) + '****' + phone.substring(7);
  };

  const maskAddress = (address: string, leadData: any) => {
    if (!currentUser || currentUser.role === 'admin') return address;
    if (isAssignedToMe(leadData) || leadData.status === '已签单' || leadData.status === '施工中') return address;
    if (!address) return address;
    const parts = address.split(' ');
    if (parts.length > 1) {
      return parts[0] + ' ***';
    }
    return address + ' ***';
  };

  // ==== 设计进度弹窗 ====
  const [showDesignCompleteModal, setShowDesignCompleteModal] = useState(false);
  const [designCompleteIdx, setDesignCompleteIdx] = useState(0);
  const [designDelayReason, setDesignDelayReason] = useState('');
  const [designIsDelayed, setDesignIsDelayed] = useState(false);

  const parseFollowUpTime = (f: any): string => {
    const ca = f.createdAt;
    if (!ca) return f.displayTime || '';
    if (typeof ca === 'object' && ca.$date) {
      const d = new Date(typeof ca.$date === 'number' ? ca.$date : Number(ca.$date));
      if (!isNaN(d.getTime())) return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    }
    if (typeof ca === 'number') {
      const d = new Date(ca);
      if (!isNaN(d.getTime())) return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    }
    if (typeof ca === 'string') return ca.substring(0, 16);
    return f.displayTime || '';
  };

  const parseFollowUpTimestamp = (f: any): number => {
    const ca = f.createdAt;
    if (!ca) return 0;
    if (typeof ca === 'object' && ca.$date) {
      return typeof ca.$date === 'number' ? ca.$date : Number(ca.$date);
    }
    if (typeof ca === 'number') return ca;
    if (typeof ca === 'string') {
      const parsed = new Date(ca).getTime();
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const fetchAllData = async () => {
    try {
      const [leadRes, quoteRes, projectRes, followRes] = await Promise.all([
        fetch(`/api/leads/${leadId}`),
        fetch(`/api/quotes?leadId=${leadId}`),
        fetch(`/api/projects?leadId=${leadId}`),
        fetch(`/api/followUps?leadId=${leadId}&all=1`)
      ]);

      if (!leadRes.ok) { setLeadNotFound(true); return; }

      const data = await leadRes.json();
      let dateStr = '';
      if (data.createdAt) {
        try {
          if (data.createdAt.$date) {
            dateStr = new Date(data.createdAt.$date).toISOString().split('T')[0];
          } else {
            dateStr = new Date(data.createdAt).toISOString().split('T')[0];
          }
        } catch(err) {}
      }
      const formatted = {
        ...data,
        id: data._id,
        createdAt: dateStr,
        lastFollowUp: data.lastFollowUp || "暂无"
      };
      setLead(formatted);
      setEditForm(formatted);

      // 处理报价
      if (quoteRes.ok) {
        const qData = await quoteRes.json();
        setQuoteId(qData && qData.length > 0 ? qData[0]._id : null);
      }
      
      // 处理项目
      if (projectRes.ok) {
        const pData = await projectRes.json();
        setProjectId(pData && pData.length > 0 ? pData[0]._id : null);
      }

      // 处理跟进记录
      if (followRes.ok) {
        const followUpsData = await followRes.json();
        const timelineData = Array.isArray(followUpsData.data || followUpsData) ? (followUpsData.data || followUpsData).map((f: any) => ({
          id: f._id,
          type: f.method === '系统记录' ? 'system' : 'user',
          user: f.createdBy || f.user || '未知',
          time: parseFollowUpTime(f),
          content: f.content || '',
          _timestamp: parseFollowUpTimestamp(f),
          editedBy: f.editedBy,
          editedAt: f.editedAt
        })) : [];

        if (timelineData.length === 0 && dateStr) {
          timelineData.push({
            id: '1',
            type: 'system',
            user: '系统',
            time: `${dateStr} 10:15`,
            content: `【系统日志】线索已录入系统，初步意向评级：${formatted.rating}。`,
            _timestamp: new Date(`${dateStr} 10:15`).getTime()
          });
        }
        timelineData.sort((a: any, b: any) => (b._timestamp || 0) - (a._timestamp || 0));
        setTimeline(timelineData);
      }
    } catch (e) {
      console.error('Failed to fetch data concurrently', e);
    }
  };

  const fetchLeadDetail = async () => {
    // 保留给手动触发单条刷新时使用
    try {
      const res = await fetch(`/api/leads/${leadId}`);
      if (!res.ok) { setLeadNotFound(true); return; }
      if (res.ok) {
        const data = await res.json();
        let dateStr = '';
        if (data.createdAt) {
          try {
            if (data.createdAt.$date) {
              dateStr = new Date(data.createdAt.$date).toISOString().split('T')[0];
            } else {
              dateStr = new Date(data.createdAt).toISOString().split('T')[0];
            }
          } catch(err) {}
        }
        const formatted = {
          ...data,
          id: data._id,
          createdAt: dateStr,
          lastFollowUp: data.lastFollowUp || "暂无"
        };
        // 仅在数据确实有变化时更新，避免闪烁
        setLead((prev: any) => JSON.stringify(prev) === JSON.stringify(formatted) ? prev : formatted);
        
        // 从云端拉取真实跟进记录
        fetch(`/api/followUps?leadId=${leadId}&all=1`)
          .then(res => res.json())
          .then(followUpsData => {
             const timelineData = Array.isArray(followUpsData.data || followUpsData) ? (followUpsData.data || followUpsData).map((f: any) => ({
                id: f._id,
                type: f.method === '系统记录' ? 'system' : 'user',
                user: f.createdBy || f.user || '未知',
                time: parseFollowUpTime(f),
                content: f.content || '',
                _timestamp: parseFollowUpTimestamp(f),
                editedBy: f.editedBy,
                editedAt: f.editedAt
             })) : [];

             if (timelineData.length === 0) {
               timelineData.push({
                 id: '1',
                 type: 'system',
                 user: '系统',
                 time: `${formatted.createdAt} 10:15`,
                 content: `【系统日志】线索已录入系统，初步意向评级：${formatted.rating}。`,
                 _timestamp: new Date(`${formatted.createdAt} 10:15`).getTime()
               });
             }
             timelineData.sort((a: any, b: any) => (b._timestamp || 0) - (a._timestamp || 0));
             setTimeline((prev: any) => JSON.stringify(prev) === JSON.stringify(timelineData) ? prev : timelineData);
          });
      }
    } catch (e) {
      console.error('Failed to fetch lead details', e);
    }
  };

  const fetchQuoteStatus = async (id: string) => {
    try {
      const res = await fetch(`/api/quotes?leadId=${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setQuoteId(data[0]._id);
        } else {
          setQuoteId(null);
        }
      }
    } catch (e) {
      console.error('Failed to fetch quote status', e);
    }
  };

  const fetchProjectStatus = async (id: string) => {
    try {
      const res = await fetch(`/api/projects?leadId=${id}`);
      if (res.ok) {
        const data = await res.json();
        setProjectId(data && data.length > 0 ? data[0]._id : null);
      }
    } catch (e) {
      console.error('Failed to fetch project status', e);
    }
  };

  // 初始加载
  useEffect(() => {
    if (leadId) {
      fetchAllData();
    }
  }, [leadId]);

  // 轮询：每隔 5 秒自动刷新跟进记录和基本信息
  useEffect(() => {
    const timer = setInterval(() => {
      // 静默刷新，不显示 loading
      fetchLeadDetail();
    }, 5000);
    return () => clearInterval(timer);
  }, [leadId]);

  if (leadNotFound) {
    return (
      <MainLayout>
        <div className="p-8 text-center">
          <p className="text-primary-500 mb-4">找不到该客户信息，可能已被删除或链接有误。</p>
          <button onClick={() => router.push('/leads')} className="px-4 py-2 bg-primary-900 text-white rounded-lg text-sm">返回客户列表</button>
        </div>
      </MainLayout>
    );
  }

  if (!lead) {
    return (
      <MainLayout>
        <div className="p-8 text-center text-primary-500">正在加载客户信息...</div>
      </MainLayout>
    );
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    try {
      const res = await fetch('/api/followUps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          content: newNote,
          method: '手动记录',
          createdBy: currentUser?.name || '未知用户'
        })
      });
      if (res.ok) {
        setNewNote("");
        fetchLeadDetail();
      }
    } catch (e) {
      console.error('保存跟进记录失败', e);
    }
  };

  const handleEditNote = async (id: string) => {
    if (!editNoteContent.trim()) return;
    try {
      await fetch(`/api/followUps/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: editNoteContent,
          editedBy: currentUser?.name || '未知用户',
          editedAt: new Date().toISOString()
        })
      });
      setEditingNoteId(null);
      fetchLeadDetail();
    } catch (e) {}
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await fetch(`/api/followUps/${id}`, { method: 'DELETE' });
      setDeleteConfirmId(null);
      fetchLeadDetail();
    } catch (e) {}
  };

  const handleRatingChange = async (option: string) => {
    if (lead.rating === option) return;
    setOpenDropdown(null);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: option })
      });
      if (res.ok) {
        setLead({ ...lead, rating: option });
        fetch('/api/followUps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId,
            content: `将客户意向评级更改为：${option}级`,
            method: '系统记录',
            createdBy: currentUser?.name || '系统'
          })
        }).then(() => fetchLeadDetail());
      }
    } catch (e) {}
  };

  const handleStatusChange = async (option: string) => {
    if (lead.status === option) return;
    setOpenDropdown(null);

    if (option === '已签单') {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      
      setSignModal({
        isOpen: true,
        date: `${yyyy}-${mm}-${dd}`,
        signer: currentUser?.name || ''
      });
      return;
    }

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: option })
      });
      if (res.ok) {
        setLead({ ...lead, status: option });
        // 写入系统跟进记录
        fetch('/api/followUps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId,
            content: `将客户状态更改为：${option}`,
            method: '系统记录',
            createdBy: currentUser?.name || '系统'
          })
        }).then(() => fetchLeadDetail());

        // 通知相关人员（sales + creatorName + admin）
        const operatorName = currentUser?.name || '系统';
        const targets = Array.from(new Set([lead.sales, lead.creatorName, 'admin'].filter(Boolean).filter(n => n !== operatorName)));
        targets.forEach(targetUser => {
          fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              targetUser,
              type: 'lead',
              title: '客户状态已更新',
              content: `${operatorName} 将客户【${lead.name}】的状态更改为：${option}`,
              senderName: operatorName,
              link: `/leads/${leadId}`
            })
          }).catch(() => {});
        });
      }
    } catch (e) {}
  };

  const handleConfirmSign = async () => {
    if (!signModal.date || !signModal.signer) {
      alert('请填写签单时间和签单人');
      return;
    }
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: '已签单',
          signDate: signModal.date,
          signer: signModal.signer
        })
      });
      if (res.ok) {
        setLead({ ...lead, status: '已签单', signDate: signModal.date, signer: signModal.signer });
        setSignModal({ ...signModal, isOpen: false });
        
        // 记录跟进记录
        await fetch('/api/followUps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId,
            content: `将客户状态更改为：已签单 (签单人: ${signModal.signer}, 日期: ${signModal.date})`,
            method: '系统记录',
            createdBy: currentUser?.name || '系统'
          })
        });

        // 全员广播签单通知
        fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetUser: 'all',
            type: 'lead',
            title: '🎉 恭喜签单！',
            content: `${signModal.signer} 完成了客户【${lead.name}】的签单，签单日期：${signModal.date}`,
            senderName: currentUser?.name || '系统',
            link: `/leads/${leadId}`
          })
        }).catch(() => {});

        // 标记已签单，用于返回列表时播放动画
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('justSignedLead', 'true');
        }

        // 显示庆祝弹窗
        setShowSuccessModal(true);
        fetchLeadDetail();
      }
    } catch (e) {}
  };

  const handleUpdateInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let finalSource = editForm.source;
      if (finalSource === '其他' && editForm.customSource) {
        finalSource = editForm.customSource;
      }
      const payload = { ...editForm, source: finalSource };
      
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setLead(payload);
        setIsEditModalOpen(false);
        // 同步系统跟进记录
        await fetch('/api/followUps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId,
            content: `更新了客户基本信息`,
            method: '系统记录',
            createdBy: currentUser?.name || '系统'
          })
        });
        fetchAllData();
      }
    } catch (e) {
      console.error('Failed to update lead', e);
    }
  };

  const handleConfirmPersonnelChange = async () => {
    if (!personnelConfirm || isChangingPersonnel) return;

    const fieldMap: Record<string, string> = { '销售': 'sales', '设计': 'designer', '项目经理': 'manager' };
    const field = fieldMap[personnelConfirm.role];

    setIsChangingPersonnel(true);
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: personnelConfirm.newName })
      });

      if (personnelConfirm.role === '销售') setLead({...lead, sales: personnelConfirm.newName});
      if (personnelConfirm.role === '设计') setLead({...lead, designer: personnelConfirm.newName});
      if (personnelConfirm.role === '项目经理') setLead({...lead, manager: personnelConfirm.newName});

      // 写入系统跟进记录
      await fetch('/api/followUps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          content: `将${personnelConfirm.role}从【${personnelConfirm.oldName}】更换为【${personnelConfirm.newName}】`,
          method: '系统记录',
          createdBy: currentUser?.name || '系统'
        })
      });
      fetchLeadDetail();
    } catch (e) {
      console.error('更换人员失败', e);
    } finally {
      setIsChangingPersonnel(false);
    }

    setPersonnelConfirm(null);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const openStartDesignModal = () => {
    const today = new Date().toISOString().split('T')[0];
    const defaultNodes = [
      { id: Date.now(), name: '平面布局', isCustom: false, nameIndex: 0, startDate: today, endDate: today, status: 'pending' }
    ];
    setDesignStartDate(today);
    setEditDesignNodes(defaultNodes);
    setShowStartDesignModal(true);
  };

  const addDesignNode = () => {
    const newNode = {
      id: Date.now(),
      name: '',
      isCustom: true,
      nameIndex: 4, // 默认选中"自定义"
      startDate: designStartDate || new Date().toISOString().split('T')[0],
      endDate: designStartDate || new Date().toISOString().split('T')[0],
      status: 'pending'
    };
    setEditDesignNodes([...editDesignNodes, newNode]);
  };

  const removeDesignNode = (idx: number) => {
    if (editDesignNodes.length <= 1) {
      alert('至少保留一个节点');
      return;
    }
    setEditDesignNodes(editDesignNodes.filter((_, i) => i !== idx));
  };

  const updateDesignNodeNamePicker = (idx: number, nameIdx: number) => {
    const nodes = [...editDesignNodes];
    const selectedName = designNodeOptions[nameIdx];
    if (selectedName === '自定义') {
      nodes[idx].isCustom = true;
      nodes[idx].name = '';
    } else {
      nodes[idx].isCustom = false;
      nodes[idx].name = selectedName;
    }
    nodes[idx].nameIndex = nameIdx;
    setEditDesignNodes(nodes);
  };

  const updateDesignNodeName = (idx: number, name: string) => {
    const nodes = [...editDesignNodes];
    nodes[idx].name = name;
    setEditDesignNodes(nodes);
  };

  const updateDesignNodeStartDate = (idx: number, date: string) => {
    const nodes = [...editDesignNodes];
    nodes[idx].startDate = date;
    setEditDesignNodes(nodes);
  };

  const updateDesignNodeEndDate = (idx: number, date: string) => {
    const nodes = [...editDesignNodes];
    nodes[idx].endDate = date;
    setEditDesignNodes(nodes);
  };

  const confirmStartDesign = async () => {
    // 验证
    if (editDesignNodes.length === 0) {
      alert('请至少保留一个节点');
      return;
    }

    const hasEmptyName = editDesignNodes.some(n => !n.name || n.name.trim() === '');
    if (hasEmptyName) {
      alert('节点名称不能为空');
      return;
    }

    const hasEmptyDate = editDesignNodes.some(n => !n.startDate || !n.endDate);
    if (hasEmptyDate) {
      alert('请选择预计开始和完成日期');
      return;
    }

    // 检查日期是否合理
    const hasInvalidDate = editDesignNodes.some(n => new Date(n.startDate) > new Date(n.endDate));
    if (hasInvalidDate) {
      alert('开始时间不能晚于结束时间');
      return;
    }

    // 计算每个节点的工期天数
    const nodes = editDesignNodes.map(n => {
      const start = new Date(n.startDate.replace(/-/g, '/'));
      const end = new Date(n.endDate.replace(/-/g, '/'));
      const duration = Math.max(1, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      return {
        ...n,
        duration,
        status: 'pending',
        images: []
      };
    });

    try {
      await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ designNodes: nodes, designStartDate: nodes[0].startDate })
      });
      setLead({ ...lead, designNodes: nodes, designStartDate: nodes[0].startDate });
      setShowStartDesignModal(false);

      const startNode = nodes[0];
      const endNode = nodes[nodes.length - 1];
      await fetch('/api/followUps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          content: `开启设计出图工作流\n预计开始：${startNode.startDate}\n预计结束：${endNode.endDate}`,
          method: '系统记录',
          createdBy: currentUser?.name || '系统'
        })
      });

      // 触发通知：designer + 所有admin
      const operatorName = currentUser?.name || '系统';
      const designNotifyTargets = [...new Set([lead.designer, 'admin'].filter(Boolean).filter(n => n !== operatorName))];
      designNotifyTargets.forEach(targetUser => {
        fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetUser,
            type: 'lead',
            title: '设计工作流已开启',
            content: `${operatorName} 为客户【${lead.name}】开启了设计出图工作流，预计从 ${nodes[0].startDate} 开始`,
            senderName: operatorName,
            link: `/leads/${leadId}`
          })
        }).catch(() => {});
      });

      fetchAllData();
    } catch (e) {
      console.error(e);
      alert('开启失败');
    }
  };

  const completeDesignNode = async (idx: number) => {
    if (!lead?.designNodes) return;
    const nodes: any[] = JSON.parse(JSON.stringify(lead.designNodes));
    const today = new Date().toISOString().split('T')[0];
    const nodeName = nodes[idx].name;
    nodes[idx].status = 'completed';
    nodes[idx].actualEndDate = today;
    if (!nodes[idx].actualStartDate) {
      nodes[idx].actualStartDate = nodes[idx].startDate || today;
    }
    // 自动开始下一个节点
    if (idx + 1 < nodes.length && nodes[idx + 1].status === 'pending') {
      nodes[idx + 1].status = 'current';
      nodes[idx + 1].actualStartDate = today;
    }
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ designNodes: nodes })
      });
      setLead({ ...lead, designNodes: nodes });

      // 写入跟进记录
      const nextNode = idx + 1 < nodes.length ? nodes[idx + 1] : null;
      let content = `已完成设计出图节点：【${nodeName}】（实际完成：${today}）`;
      if (nextNode) {
        content += `\n下一阶段：【${nextNode.name}】，预计完成：${nextNode.endDate}`;
      } else {
        content += '\n所有设计出图节点已全部完成 🎉';
      }
      await fetch('/api/followUps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, content, method: '系统记录', createdBy: currentUser?.name || '系统' })
      });
      fetchAllData();
    } catch (e) {
      console.error(e);
      alert('完成节点失败');
    }
  };

  // ===== 开始设计节点 =====
  const startDesignNode = async (idx: number) => {
    if (!lead?.designNodes) return;
    const nodes: any[] = JSON.parse(JSON.stringify(lead.designNodes));
    const today = new Date().toISOString().split('T')[0];
    nodes[idx].status = 'current';
    nodes[idx].actualStartDate = today;
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ designNodes: nodes })
      });
      setLead({ ...lead, designNodes: nodes });
      await fetch('/api/followUps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, content: `开始设计工作：【${nodes[idx].name}】（实际开始：${today}）`, method: '系统记录', createdBy: currentUser?.name || '系统' })
      });
    } catch (e) { console.error(e); }
  };

  // ===== 设计节点图片上传 =====
  const toImgUrl = (fileID: string) => {
    if (!fileID) return '';
    if (fileID.startsWith('cloud://')) {
      const withoutScheme = fileID.replace('cloud://', '');
      const dotIdx = withoutScheme.indexOf('.');
      const slashIdx = withoutScheme.indexOf('/');
      const bucket = withoutScheme.substring(0, dotIdx);
      const path = withoutScheme.substring(slashIdx + 1);
      return `https://${bucket}.tcb.qcloud.la/${path}`;
    }
    return fileID;
  };

  const uploadDesignNodeImage = async (idx: number, file: File) => {
    if (!lead?.designNodes) return;
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `design-nodes/${leadId}/${idx}/${Date.now()}.${ext}`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'x-user-role': currentUser?.role || '' },
        body: formData
      });
      if (!res.ok) { alert('上传失败'); return; }
      const { fileID } = await res.json();
      const nodes: any[] = JSON.parse(JSON.stringify(lead.designNodes));
      if (!nodes[idx].images) nodes[idx].images = [];
      nodes[idx].images.push(fileID);
      await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ designNodes: nodes })
      });
      setLead({ ...lead, designNodes: nodes });
    } catch (e) { console.error(e); alert('上传失败'); }
  };

  // 新的文件上传逻辑（支持文件夹选择）
  const handleDesignFileUpload = async (folder: string, visibility: 'internal' | 'public') => {
    if (currentUploadNodeIdx === null || !lead?.designNodes) return;
    setShowDesignFileFolderModal(false);
    setUploadingNodeIdx(currentUploadNodeIdx);

    try {
      const uploadedFiles: any[] = [];
      const nodes: any[] = JSON.parse(JSON.stringify(lead.designNodes));
      const nodeIdx = currentUploadNodeIdx;
      const totalFiles = pendingDesignFiles.length;
      let successCount = 0;

      for (const file of pendingDesignFiles) {
        const ext = file.name.split('.').pop() || 'bin';
        const cloudPath = `project_files/${leadId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', cloudPath);

        try {
          const res = await fetch('/api/upload', { method: 'POST', body: formData });
          if (!res.ok) {
            console.error(`上传失败: ${file.name}`);
            continue;
          }
          const { fileID } = await res.json();

          const fileObj = {
            fileID,
            name: file.name,
            size: file.size,
            sizeStr: formatSize(file.size),
            type: getFileType(file.name),
            uploader: currentUser?.name || '未知',
            uploadTime: new Date().toISOString(),
            folder,
            isVisible: visibility === 'public'
          };

          uploadedFiles.push(fileObj);
          successCount++;
        } catch (err) {
          console.error(`上传失败: ${file.name}`, err);
        }
      }

      if (successCount === 0) {
        alert('所有文件上传失败，请重试');
        return;
      }

      // 更新设计节点的 files 数组
      if (!nodes[nodeIdx].files) nodes[nodeIdx].files = [];
      nodes[nodeIdx].files = [...uploadedFiles, ...nodes[nodeIdx].files];

      await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ designNodes: nodes })
      });

      // 同步到项目资料系统
      const filesRes = await fetch(`/api/leads/${leadId}/files`);
      let allFiles: any[] = [];
      if (filesRes.ok) {
        allFiles = await filesRes.json();
      }
      allFiles = [...uploadedFiles, ...allFiles];
      await fetch(`/api/leads/${leadId}/files`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: allFiles })
      });

      setLead({ ...lead, designNodes: nodes });

      if (successCount === totalFiles) {
        // 不弹窗
      } else {
        alert(`⚠️ 成功上传 ${successCount}/${totalFiles} 个文件，${totalFiles - successCount} 个失败`);
      }
    } catch (e) {
      console.error('上传失败', e);
      alert('❌ 上传失败，请重试');
    } finally {
      setUploadingNodeIdx(null);
      setPendingDesignFiles([]);
      setCurrentUploadNodeIdx(null);
    }
  };

  const deleteDesignNodeImage = async (nodeIdx: number, imgIdx: number) => {
    if (!lead?.designNodes) return;
    const nodes: any[] = JSON.parse(JSON.stringify(lead.designNodes));
    nodes[nodeIdx].images = (nodes[nodeIdx].images || []).filter((_: any, i: number) => i !== imgIdx);
    await fetch(`/api/leads/${leadId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ designNodes: nodes })
    });
    setLead({ ...lead, designNodes: nodes });
  };

  // 删除设计节点文件
  const deleteDesignNodeFile = async (nodeIdx: number, fileIdx: number) => {
    if (!lead?.designNodes) return;
    const nodes: any[] = JSON.parse(JSON.stringify(lead.designNodes));
    const deletedFile = nodes[nodeIdx].files[fileIdx];
    nodes[nodeIdx].files = (nodes[nodeIdx].files || []).filter((_: any, i: number) => i !== fileIdx);

    await fetch(`/api/leads/${leadId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ designNodes: nodes })
    });

    // 同步删除项目资料中的文件
    const filesRes = await fetch(`/api/leads/${leadId}/files`);
    if (filesRes.ok) {
      const allFiles = await filesRes.json();
      const newFiles = allFiles.filter((f: any) => f.fileID !== deletedFile.fileID);
      await fetch(`/api/leads/${leadId}/files`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: newFiles })
      });
    }

    setLead({ ...lead, designNodes: nodes });
  };

  // 切换设计节点文件可见性
  const toggleDesignFileVisibility = async (nodeIdx: number, fileIdx: number) => {
    if (!lead?.designNodes) return;
    const nodes: any[] = JSON.parse(JSON.stringify(lead.designNodes));
    nodes[nodeIdx].files[fileIdx].isVisible = !nodes[nodeIdx].files[fileIdx].isVisible;

    await fetch(`/api/leads/${leadId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ designNodes: nodes })
    });

    // 同步更新项目资料中的文件
    const filesRes = await fetch(`/api/leads/${leadId}/files`);
    if (filesRes.ok) {
      const allFiles = await filesRes.json();
      const fileID = nodes[nodeIdx].files[fileIdx].fileID;
      const newFiles = allFiles.map((f: any) =>
        f.fileID === fileID ? { ...f, visibility: nodes[nodeIdx].files[fileIdx].isVisible ? 'public' : 'internal' } : f
      );
      await fetch(`/api/leads/${leadId}/files`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: newFiles })
      });
    }

    setLead({ ...lead, designNodes: nodes });
  };

  // 下载/预览文件
  const handleDownloadFile = async (file: any) => {
    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds: [file.fileID] })
      });
      if (!res.ok) throw new Error('无法获取下载链接');
      const data = await res.json();
      if (data && data[0] && data[0].download_url) {
        window.open(data[0].download_url, '_blank');
      }
    } catch (err) {
      console.error(err);
      alert('下载/预览失败');
    }
  };

  // 获取图片临时 URL
  const getImageUrl = async (fileID: string) => {
    if (nodeImageUrls[fileID]) return nodeImageUrls[fileID];
    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds: [fileID] })
      });
      if (!res.ok) return '';
      const data = await res.json();
      if (data && data[0] && data[0].download_url) {
        const url = data[0].download_url;
        setNodeImageUrls(prev => ({ ...prev, [fileID]: url }));
        return url;
      }
    } catch (e) {
      console.error('获取图片URL失败', e);
    }
    return '';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "沟通中": return "bg-blue-50 text-blue-700 border-blue-100";
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
        <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-6 relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4 md:gap-6 pr-12">
              <div className="w-16 h-16 rounded-2xl bg-primary-900 text-white flex items-center justify-center text-2xl font-bold shrink-0 shadow-md">
                {lead.name.charAt(0)}
              </div>
              <div className="space-y-3 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold text-primary-900 flex items-center gap-2">
                    <CustomerInfo 
                      name={maskName(lead.name, lead)}
                      phone={maskPhone(lead.phone, lead)}
                      customerNo={lead.customerNo || lead.id}
                      className="text-2xl"
                    />
                    {isAssignedToMe(lead) && (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">我</span>
                    )}
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
                                onClick={() => handleRatingChange(option)}
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
                                onClick={() => handleStatusChange(option)}
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
                  {(currentUser?.role === 'admin' || isAssignedToMe(lead)) && (
                    <button 
                      onClick={() => { 
                        const isStandardSource = ["自然进店", "老介新", "抖音", "自有关系", "其他"].includes(lead.source);
                        setEditForm({
                          ...lead,
                          source: isStandardSource ? lead.source : '其他',
                          customSource: isStandardSource ? '' : lead.source
                        }); 
                        setIsEditModalOpen(true); 
                      }}
                      className="p-1.5 text-primary-400 hover:text-primary-900 hover:bg-primary-50 rounded-md transition-colors relative z-10"
                      title="编辑客户信息"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}

                  {/* 删除按钮 */}
                  {currentUser?.role === 'admin' && (
                    <div className="relative z-20">
                      <button 
                        onClick={() => setDeleteConfirmId(lead.id)}
                        className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        title="删除此线索"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {deleteConfirmId === lead.id && (
                        <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-rose-100 rounded-xl shadow-xl p-4 z-50 animate-in fade-in zoom-in-95">
                          <div className="flex items-start gap-3 mb-4">
                            <div className="p-2 bg-rose-100 text-rose-600 rounded-full shrink-0">
                              <Trash2 className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-primary-900 mb-1">确定要删除此线索吗？</h4>
                              <p className="text-xs text-primary-500 leading-relaxed whitespace-normal text-left">删除后，该客户相关的所有记录及资料将无法恢复。</p>
                            </div>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <button 
                              onClick={() => setDeleteConfirmId(null)} 
                              className="px-3 py-1.5 border border-primary-200 text-primary-600 rounded-lg text-xs font-medium hover:bg-primary-50 transition-colors"
                            >
                              取消
                            </button>
                            <button 
                              onClick={async () => {
                                try {
                                  await fetch(`/api/leads/${lead.id}`, { method: 'DELETE' });
                                  setDeleteConfirmId(null);
                                  router.push('/leads');
                                } catch (e) {
                                  console.error("删除失败", e);
                                }
                              }} 
                              className="px-3 py-1.5 bg-rose-500 text-white rounded-lg text-xs font-medium hover:bg-rose-600 transition-colors shadow-sm shadow-rose-200"
                            >
                              确认删除
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 text-sm text-primary-700">
                  <span className="flex items-center"><MapPin className="w-4 h-4 mr-2 text-primary-400" /> {maskAddress(lead.address, lead)}</span>
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
                  {canSeeDoorPassword(lead) && (
                    <div>
                      <p className="text-xs text-primary-500 mb-1">入户密码</p>
                      <p className="text-sm font-medium text-primary-900">{lead.doorPassword || <span className="text-primary-400">未填写</span>}</p>
                    </div>
                  )}
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-stretch">
          {/* 左侧：跟进记录 / 设计进度 */}
          <div className="flex-1 flex flex-col h-[800px]">
            <div className="bg-white rounded-xl border border-primary-100 shadow-sm flex flex-col h-full">
              {/* Tab 头 */}
              <div className="p-4 border-b border-primary-100 flex items-center justify-between shrink-0">
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setActiveLeftTab('follow');
                      localStorage.setItem(`followup_read_${leadId}`, Date.now().toString());
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeLeftTab === 'follow' ? 'bg-primary-900 text-white' : 'text-primary-600 hover:bg-primary-50'}`}
                  >
                    跟进记录
                  </button>
                  <button
                    onClick={() => setActiveLeftTab('design')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeLeftTab === 'design' ? 'bg-primary-900 text-white' : 'text-primary-600 hover:bg-primary-50'}`}
                  >
                    设计进度
                  </button>
                  <button
                    onClick={() => setActiveLeftTab('files')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeLeftTab === 'files' ? 'bg-primary-900 text-white' : 'text-primary-600 hover:bg-primary-50'}`}
                  >
                    文件资料
                  </button>
                </div>
              </div>
              
              {/* 设计进度 Tab */}
              {activeLeftTab === 'design' && (
                <div className="flex-1 overflow-y-auto p-6">
                  {!lead.designNodes || lead.designNodes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-primary-400">
                      <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mb-4">
                        <Pencil className="w-7 h-7 opacity-40" />
                      </div>
                      <p className="text-sm mb-1">暂未开启设计出图进度管理</p>
                      {(currentUser?.role === 'admin' || isAssignedToMe(lead)) && (
                        <button
                          onClick={openStartDesignModal}
                          className="mt-4 px-6 py-2.5 bg-primary-900 text-white rounded-xl text-sm font-medium hover:bg-primary-800 transition-colors"
                        >
                          开启设计工作流
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-0 relative">
                      {/* 竖线 */}
                      <div className="absolute left-[15px] top-4 bottom-4 w-px bg-primary-100" />
                      {lead.designNodes.map((node: any, idx: number) => {
                        const isExpanded = expandedNodeIdx === idx;
                        return (
                        <div key={node.id || idx} className="flex gap-4 pb-6 relative z-10">
                          {/* 状态圆点 */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ring-4 ring-white shadow-sm border text-xs font-bold ${
                            node.status === 'completed' ? 'bg-emerald-500 border-emerald-400 text-white' :
                            node.status === 'current' ? 'bg-amber-500 border-amber-400 text-white' :
                            'bg-white border-primary-200 text-primary-400'
                          }`}>
                            {node.status === 'completed' ? <Check className="w-4 h-4" /> :
                             node.status === 'current' ? <Clock className="w-3.5 h-3.5" /> : null}
                          </div>
                          {/* 内容 */}
                          <div className={`flex-1 rounded-xl border shadow-sm ${
                            node.status === 'completed' ? 'bg-emerald-50/30 border-emerald-100' :
                            node.status === 'current' ? 'bg-amber-50/30 border-amber-200 ring-2 ring-amber-100' :
                            'bg-white border-primary-100'
                          }`}>
                            {/* 节点标题和基本信息 */}
                            <div className="p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <h4 className={`font-bold text-base ${node.status === 'completed' ? 'text-primary-900' : 'text-primary-900'}`}>
                                    {node.name}
                                  </h4>
                                </div>

                                <div className="flex items-center gap-2">
                                  {node.status === 'completed' ? (
                                    node.actualEndDate && node.actualEndDate <= node.endDate ? (
                                      <span className="text-xs px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full font-bold">按时完成</span>
                                    ) : node.actualEndDate ? (
                                      <span className="text-xs px-2 py-1 bg-rose-50 text-rose-600 rounded-full font-bold">
                                        逾期 {Math.floor((new Date(node.actualEndDate.replace(/-/g, '/')).getTime() - new Date(node.endDate.replace(/-/g, '/')).getTime()) / (1000 * 60 * 60 * 24))} 天
                                      </span>
                                    ) : (
                                      <span className="text-xs px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full font-bold">已完成</span>
                                    )
                                  ) : node.status === 'current' ? (
                                    <span className="text-xs px-2 py-1 bg-amber-50 text-amber-600 rounded-full font-bold border border-amber-200">进行中</span>
                                  ) : (
                                    <span className="text-xs px-2 py-1 bg-primary-50 text-primary-400 rounded-full font-bold">待开始</span>
                                  )}

                                  {/* 操作按钮 - 始终可见 */}
                                  {(currentUser?.role === 'designer' || currentUser?.role === 'admin') && (
                                    <>
                                      {node.status === 'pending' && (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); startDesignNode(idx); }}
                                          className="px-4 py-1.5 bg-primary-900 text-white border-2 border-primary-900 rounded-full text-xs font-bold hover:bg-primary-800 hover:border-primary-800 transition-colors shadow-sm opacity-100"
                                        >
                                          开始
                                        </button>
                                      )}
                                      {node.status === 'current' && (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); completeDesignNode(idx); }}
                                          className="px-4 py-1.5 bg-emerald-500 text-white border-2 border-emerald-500 rounded-full text-xs font-bold hover:bg-emerald-600 hover:border-emerald-600 transition-colors shadow-sm opacity-100"
                                        >
                                          完成
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-col gap-1.5 text-[13px] text-primary-400 font-mono mt-1">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center">
                                    <span className="w-12">预计：</span>
                                    <span>{formatDateRange(node.startDate, node.endDate)}</span>
                                  </div>
                                  <span className="ml-4 px-1.5 py-0.5 bg-primary-50 text-primary-500 rounded text-[10px] font-medium whitespace-nowrap">计划 {node.duration} 天</span>
                                </div>
                                {node.status !== 'pending' && node.actualStartDate && (
                                  <div className={`flex items-center justify-between`}>
                                    <div className="flex items-center">
                                      <span className="w-12">实际：</span>
                                      <span className="flex items-center">
                                        {node.actualStartDate} ~ {node.actualEndDate || '进行中'}
                                      </span>
                                    </div>
                                    {node.status === 'completed' && node.actualEndDate && <span className={`ml-4 px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap bg-primary-50 text-primary-600`}>用时 {Math.max(1, Math.floor((new Date(node.actualEndDate.replace(/-/g, '/')).getTime() - new Date(node.actualStartDate.replace(/-/g, '/')).getTime()) / (1000 * 60 * 60 * 24)) + 1)} 天</span>}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* 附件/图片区域 - 只在节点开始后显示 */}
                            {node.status !== 'pending' && (
                              <div className="border-t border-primary-100">
                                {/* 标题栏 - 始终显示，不需要展开 */}
                                <div className="px-4 py-3 flex items-center justify-between">
                                  <button
                                    onClick={() => setExpandedNodeIdx(isExpanded ? null : idx)}
                                    className="flex items-center gap-2 flex-1 text-left hover:text-primary-600 transition-colors"
                                  >
                                    <h5 className="text-sm font-medium text-primary-700">相关附件/图片 ({(node.files?.length || 0) + (node.images?.length || 0)})</h5>
                                    <ChevronDown className={`w-4 h-4 text-primary-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                  </button>

                                  {/* 上传按钮 - 弹出文件夹选择 */}
                                  {(currentUser?.role === 'designer' || currentUser?.role === 'admin') && (
                                    <>
                                      <button
                                        className="px-3 py-1.5 bg-primary-900 text-white rounded-lg text-xs font-bold hover:bg-primary-800 transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                                        disabled={uploadingNodeIdx === idx}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const input = document.createElement('input');
                                          input.type = 'file';
                                          input.multiple = true;
                                          input.accept = 'image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx';
                                          input.onchange = (ev: any) => {
                                            const files = ev.target.files;
                                            if (files && files.length > 0) {
                                              setPendingDesignFiles(Array.from(files));
                                              setCurrentUploadNodeIdx(idx);
                                              setShowDesignFileFolderModal(true);
                                            }
                                          };
                                          input.click();
                                        }}
                                      >
                                        {uploadingNodeIdx === idx ? (
                                          <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            上传中...
                                          </>
                                        ) : (
                                          <>
                                            <Upload className="w-3.5 h-3.5" />
                                            上传
                                          </>
                                        )}
                                      </button>
                                    </>
                                  )}
                                </div>

                                {/* 展开后显示附件列表 */}
                                {isExpanded && (
                                  <div className="px-4 pb-4 pt-3 space-y-2">
                                    {/* 新的 files 数组（详细列表） */}
                                    {(node.files || []).length > 0 && (
                                      <div className="space-y-2">
                                        {(node.files || []).map((file: any, fileIdx: number) => (
                                          <div key={fileIdx} className="flex items-center gap-3 p-3 bg-primary-50/30 rounded-lg border border-primary-100 hover:bg-primary-50/50 transition-colors group">
                                            {/* 文件图标 */}
                                            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm">
                                              <FileIcon type={file.type || getFileType(file.name || '')} />
                                            </div>

                                            {/* 文件信息 */}
                                            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleDownloadFile(file)}>
                                              <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium text-primary-900 truncate hover:text-primary-600 transition-colors">{file.name}</p>
                                                {file.isVisible ? (
                                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-600 text-xs rounded-full shrink-0">
                                                    <Eye className="w-3 h-3" />
                                                    公开
                                                  </span>
                                                ) : (
                                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-50 text-primary-600 text-xs rounded-full shrink-0">
                                                    <EyeOff className="w-3 h-3" />
                                                    内部
                                                  </span>
                                                )}
                                              </div>
                                              <p className="text-xs text-primary-400 mt-0.5">
                                                {file.sizeStr || formatSize(file.size)} · {file.uploader || '未知'} · {file.uploadTime ? new Date(file.uploadTime).toISOString().split('T')[0] : ''}
                                              </p>
                                            </div>

                                            {/* 操作按钮 */}
                                            {(currentUser?.role === 'designer' || currentUser?.role === 'admin') && (
                                              <div className="shrink-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                  onClick={() => toggleDesignFileVisibility(idx, fileIdx)}
                                                  className={`p-2 rounded-lg transition-colors ${
                                                    file.isVisible
                                                      ? 'text-green-500 hover:text-green-600 hover:bg-green-50'
                                                      : 'text-primary-400 hover:text-primary-600 hover:bg-primary-50'
                                                  }`}
                                                  title={file.isVisible ? '设为内部' : '设为公开'}
                                                >
                                                  {file.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                                </button>
                                                <button
                                                  onClick={() => handleDownloadFile(file)}
                                                  className="p-2 text-primary-300 hover:text-primary-600 hover:bg-white rounded-lg transition-colors"
                                                  title="下载 / 预览"
                                                >
                                                  <Download className="w-4 h-4" />
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    if (confirm('确定删除这个文件吗？')) {
                                                      deleteDesignNodeFile(idx, fileIdx);
                                                    }
                                                  }}
                                                  className="p-2 text-primary-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                                  title="删除"
                                                >
                                                  <Trash2 className="w-4 h-4" />
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {/* 兼容旧的 images 数组 */}
                                    {(node.images || []).length > 0 && (
                                      <div className="grid grid-cols-3 gap-2 mt-2">
                                        {(node.images || []).map((imgId: string, imgIdx: number) => (
                                          <ImagePreview
                                            key={imgIdx}
                                            fileID={imgId}
                                            imgIdx={imgIdx}
                                            nodeIdx={idx}
                                            canDelete={currentUser?.role === 'designer' || currentUser?.role === 'admin'}
                                            onDelete={() => deleteDesignNodeImage(idx, imgIdx)}
                                            getImageUrl={getImageUrl}
                                          />
                                        ))}
                                      </div>
                                    )}

                                    {/* 空状态 */}
                                    {(node.files || []).length === 0 && (node.images || []).length === 0 && (
                                      <p className="text-xs text-primary-400 text-center py-4">暂无附件</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )})}
                    </div>
                  )}
                </div>
              )}

              {/* 文件资料 Tab */}
              {activeLeftTab === 'files' && (
                <div className="flex-1 flex flex-col p-6 relative min-h-0 bg-white" id="files-tab-container">
                  <CustomerDocuments
                    leadId={leadId}
                    canUpload={!!(currentUser?.role === 'admin' || isAssignedToMe(lead))}
                    uploaderName={currentUser?.name}
                  />
                </div>
              )}

              {/* 跟进记录 Tab */}
              {activeLeftTab === 'follow' && (
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
                            {item.editedBy && (
                              <span className="text-[10px] text-primary-300 italic">(由 {item.editedBy} 编辑)</span>
                            )}
                          </div>
                          {item.type === 'user' && (currentUser?.role === 'admin' || currentUser?.name === item.user) && (
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
                          <div className={`text-sm leading-relaxed p-4 rounded-xl border whitespace-pre-line ${item.type === 'system' ? 'bg-zinc-50 border-zinc-100 text-primary-600' : 'bg-primary-50/50 border-primary-100 text-primary-800'}`}>
                            {item.content}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              )}

              {/* 输入框（仅跟进记录 Tab 显示） */}
              {activeLeftTab === 'follow' && (
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
              )}
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
                        <div className="absolute right-0 top-full z-20 w-36 mt-1.5 bg-white border border-primary-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 py-1 text-left cursor-default max-h-48 overflow-y-auto" onClick={e => e.stopPropagation()}>
                          {users.filter(u => u.role === 'sales' || u.role === 'admin').sort((a,b) => {
                            if (a.role === 'admin' && b.role !== 'admin') return 1;
                            if (a.role !== 'admin' && b.role === 'admin') return -1;
                            return a.role.localeCompare(b.role) || a.name.localeCompare(b.name);
                          }).map(u => (
                            <div
                              key={u._id}
                              onClick={() => {
                                if (lead.sales !== u.name) {
                                  setPersonnelConfirm({ role: '销售', oldName: lead.sales, newName: u.name });
                                }
                                setOpenDropdown(null);
                              }}
                              className="px-2 py-1 mx-1"
                            >
                              <div className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${lead.sales === u.name ? 'bg-primary-50/80 text-primary-900 font-medium' : 'text-primary-700 hover:bg-primary-50'}`}>
                                <span className="text-sm">{u.name}</span>
                                {lead.sales === u.name && <Check className="w-4 h-4 text-primary-900" />}
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
                        <div className="absolute right-0 top-full z-20 w-36 mt-1.5 bg-white border border-primary-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 py-1 text-left cursor-default max-h-48 overflow-y-auto" onClick={e => e.stopPropagation()}>
                          {[{ _id: 'unassigned', name: '未分配', role: 'designer' }, ...users.filter(u => u.role === 'designer' || u.role === 'admin')].sort((a,b) => {
                            if (a.name === '未分配') return -1;
                            if (b.name === '未分配') return 1;
                            if (a.role === 'admin' && b.role !== 'admin') return 1;
                            if (a.role !== 'admin' && b.role === 'admin') return -1;
                            return a.role.localeCompare(b.role) || a.name.localeCompare(b.name);
                          }).map(u => (
                            <div
                              key={u._id}
                              onClick={() => {
                                if (lead.designer !== u.name) {
                                  setPersonnelConfirm({ role: '设计', oldName: lead.designer, newName: u.name });
                                }
                                setOpenDropdown(null);
                              }}
                              className="px-2 py-1 mx-1"
                            >
                              <div className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${lead.designer === u.name ? 'bg-primary-50/80 text-primary-900 font-medium' : 'text-primary-700 hover:bg-primary-50'}`}>
                                <span className="text-sm">{u.name}</span>
                                {lead.designer === u.name && <Check className="w-4 h-4 text-primary-900" />}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </button>
                </div>

                {(lead.status === "已签单" || lead.status === "施工中" || true) && (
                  <div className="flex items-center justify-between pt-4 border-t border-primary-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 text-xs font-bold">项目经理</div>
                      <span className="text-sm font-medium text-primary-900">{lead.manager || "未分配"}</span>
                    </div>
                    <button
                      onClick={() => setOpenDropdown(openDropdown === 'edit-manager' ? null : 'edit-manager')}
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-medium relative"
                    >
                      {lead.manager ? "更改" : "分配"}
                      {openDropdown === 'edit-manager' && (
                        <>
                          <div className="fixed inset-0 z-10 cursor-default" onClick={(e) => { e.stopPropagation(); setOpenDropdown(null); }} />
                          <div className="absolute right-0 top-full z-20 w-36 mt-1.5 bg-white border border-primary-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 py-1 text-left cursor-default max-h-48 overflow-y-auto" onClick={e => e.stopPropagation()}>
                          {[{ _id: 'unassigned', name: '未分配', role: 'manager' }, ...users.filter(u => u.role === 'manager' || u.role === 'admin')].sort((a,b) => {
                            if (a.name === '未分配') return -1;
                            if (b.name === '未分配') return 1;
                            if (a.role === 'admin' && b.role !== 'admin') return 1;
                            if (a.role !== 'admin' && b.role === 'admin') return -1;
                            return a.role.localeCompare(b.role) || a.name.localeCompare(b.name);
                          }).map(u => (
                              <div
                                key={u._id}
                                onClick={() => {
                                  if (lead.manager !== u.name) {
                                    setPersonnelConfirm({ role: '项目经理', oldName: lead.manager || '未分配', newName: u.name });
                                  }
                                  setOpenDropdown(null);
                                }}
                                className="px-2 py-1 mx-1"
                              >
                                <div className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${lead.manager === u.name ? 'bg-primary-50/80 text-primary-900 font-medium' : 'text-primary-700 hover:bg-primary-50'}`}>
                                  <span className="text-sm">{u.name}</span>
                                  {lead.manager === u.name && <Check className="w-4 h-4 text-primary-900" />}
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
                  onClick={() => router.push(quoteId ? `/quotes/${quoteId}` : `/quotes/new?leadId=${lead.id}`)}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-primary-200 hover:border-primary-900 hover:bg-primary-50 transition-colors group"
                >
                  <div className="flex items-center">
                    <FileText className="w-5 h-5 text-primary-600 group-hover:text-primary-900 mr-3" />
                    <span className="font-medium text-primary-900 text-sm">{quoteId ? '查看 / 编辑报价单' : '生成报价单'}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-primary-400 group-hover:text-primary-900" />
                </button>
                
                {(lead.status === "已签单" || lead.status === "施工中") && (
                  <button
                    onClick={() => projectId
                      ? router.push(`/projects/${projectId}`)
                      : router.push(`/projects/new?leadId=${lead.id}`)
                    }
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-colors group"
                  >
                    <div className="flex items-center">
                      <FolderOpen className="w-5 h-5 text-emerald-600 mr-3" />
                      <span className="font-medium text-emerald-900 text-sm">{projectId ? '查看工地详情' : '新建关联工地'}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-emerald-600" />
                  </button>
                )}
              </div>
            </div>

            {/* 文件与图纸（已移至左侧） */}
          </div>
        </div>
      </div>
      {/* 开启设计工作流弹窗 */}
      {showStartDesignModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh] opacity-100">
            <div className="p-5 border-b border-primary-100 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-bold text-primary-900">开启设计工作流</h3>
              <button onClick={() => setShowStartDesignModal(false)} className="p-1.5 text-primary-400 hover:text-primary-900 rounded-lg hover:bg-primary-50"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-2">自定义工序与周期</label>
                <div className="space-y-3">
                  {editDesignNodes.map((node, idx) => (
                    <div key={node.id || idx} className="space-y-2">
                      {/* 节点名称：下拉选择 + 自定义输入 */}
                      <div className="relative">
                        <select
                          value={node.nameIndex ?? 0}
                          onChange={e => updateDesignNodeNamePicker(idx, parseInt(e.target.value))}
                          className="w-full px-3 py-2 pr-10 border border-primary-200 rounded-lg text-sm font-medium focus:outline-none focus:border-primary-400 appearance-none bg-white"
                        >
                          {designNodeOptions.map((opt, optIdx) => (
                            <option key={optIdx} value={optIdx}>{opt}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400 pointer-events-none" />
                        <button
                          onClick={() => removeDesignNode(idx)}
                          className="absolute right-10 top-1/2 -translate-y-1/2 p-1 text-primary-300 hover:text-rose-500 rounded transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      {/* 如果选了"自定义"，显示输入框 */}
                      {node.isCustom && (
                        <input
                          type="text"
                          value={node.name}
                          onChange={e => updateDesignNodeName(idx, e.target.value)}
                          className="w-full px-3 py-2 border border-primary-200 rounded-lg text-sm focus:outline-none focus:border-primary-400"
                          placeholder="请输入自定义节点名称"
                        />
                      )}
                      {/* 开始日期 + 结束日期 */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <div className="text-xs text-primary-500 mb-1">开始</div>
                          <div className="px-3 py-2 bg-primary-50 border border-primary-200 rounded-lg text-sm">
                            <DatePicker
                              value={node.startDate}
                              onChange={date => updateDesignNodeStartDate(idx, date)}
                              placeholder="选择日期"
                            />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="text-xs text-primary-500 mb-1">结束</div>
                          <div className="px-3 py-2 bg-primary-50 border border-primary-200 rounded-lg text-sm">
                            <DatePicker
                              value={node.endDate}
                              onChange={date => updateDesignNodeEndDate(idx, date)}
                              placeholder="选择日期"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addDesignNode}
                  className="mt-3 w-full py-2 border border-dashed border-primary-200 text-primary-500 rounded-lg text-sm hover:border-primary-400 hover:text-primary-700 transition-colors"
                >
                  + 添加新节点
                </button>
              </div>
            </div>
            <div className="p-5 border-t border-primary-100 flex gap-3 shrink-0">
              <button onClick={() => setShowStartDesignModal(false)} className="flex-1 px-4 py-2.5 border border-primary-200 text-primary-700 rounded-xl font-medium hover:bg-primary-50 transition-colors">取消</button>
              <button onClick={confirmStartDesign} className="flex-1 px-4 py-2.5 bg-primary-900 text-white rounded-xl font-bold hover:bg-primary-800 transition-colors opacity-100">确认开启</button>
            </div>
          </div>
        </div>
      )}


      {/* 更换人员确认弹窗 */}
      {personnelConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 opacity-100">
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
                <button onClick={() => setPersonnelConfirm(null)} disabled={isChangingPersonnel} className="flex-1 px-4 py-2 border border-primary-200 text-primary-700 rounded-lg hover:bg-primary-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed">取消</button>
                <button onClick={handleConfirmPersonnelChange} disabled={isChangingPersonnel} className="flex-1 px-4 py-2 bg-primary-900 text-white rounded-lg hover:bg-primary-800 transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed opacity-100">
                  {isChangingPersonnel ? '处理中...' : '确认更换'}
                </button>
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

      {/* 恭喜签单弹窗 */}
      {signModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 text-center p-8 opacity-100">
            <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-rose-600" />
            </div>
            <h3 className="text-2xl font-bold text-rose-600 mb-2">品诺筑家签单确认</h3>
            <p className="text-sm text-primary-600 mb-8">
              【<span className="font-bold text-primary-900">{lead.name}</span>】项目确认签单？
            </p>
            <div className="space-y-4 text-left mb-8">
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-1">签单时间</label>
                <div className="w-full px-4 py-2.5 bg-primary-50 border border-primary-200 rounded-lg focus-within:border-primary-400 focus-within:bg-white transition-all text-sm text-primary-900">
                  <DatePicker value={signModal.date} onChange={v => setSignModal({...signModal, date: v})} placeholder="选择签单日期" />
                </div>
              </div>
              <div className="relative">
                <label className="block text-sm font-medium text-primary-700 mb-1">签单人</label>
                <div 
                  onClick={() => setOpenDropdown(openDropdown === 'signer' ? null : 'signer')}
                  className={`w-full px-4 py-2.5 bg-primary-50 border border-primary-200 rounded-lg text-sm transition-all cursor-pointer flex justify-between items-center ${openDropdown === 'signer' ? 'bg-white border-primary-400' : ''}`}
                >
                  <span className={signModal.signer ? 'text-primary-900' : 'text-primary-400'}>
                    {signModal.signer || '请选择签单人'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-primary-400 transition-transform ${openDropdown === 'signer' ? 'rotate-180' : ''}`} />
                </div>
                {openDropdown === 'signer' && (
                  <div className="absolute z-30 w-full mt-1 bg-white border border-primary-100 rounded-xl shadow-xl overflow-hidden py-1 max-h-48 overflow-y-auto">
                    {users.map(u => (
                      <div 
                        key={u._id}
                        onClick={() => {
                          setSignModal({...signModal, signer: u.name});
                          setOpenDropdown(null);
                        }}
                        className="px-4 py-2 text-sm text-primary-700 hover:bg-primary-50 cursor-pointer"
                      >
                        {u.name} ({u.role === 'admin' ? '管理员' : u.role === 'sales' ? '销售' : u.role === 'designer' ? '设计' : '项目'})
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setSignModal({...signModal, isOpen: false})} className="flex-1 px-4 py-3 border border-primary-200 text-primary-700 rounded-lg hover:bg-primary-50 transition-colors font-bold">再想想</button>
              <button onClick={handleConfirmSign} className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-bold shadow-lg shadow-amber-500/20">确认签单</button>
            </div>
          </div>
        </div>
      )}

      {/* 签单成功庆祝弹窗 */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-300 flex flex-col">
            <div className="bg-gradient-to-br from-amber-500 to-rose-600 p-8 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
              <div className="inline-block bg-white/20 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-sm font-bold tracking-widest mb-4 border border-white/30 shadow-sm">
                开单喜报
              </div>
              <h3 className="text-3xl font-black text-white drop-shadow-md mb-2">品诺筑家 恭喜签约</h3>
              <p className="text-white/90 text-sm">携手共筑美好家园</p>
            </div>
            <div className="p-8 text-center">
              <p className="text-primary-600 mb-2 text-sm">成功签约客户</p>
              <p className="text-2xl font-bold text-primary-900 mb-8 pb-4 border-b border-primary-100">
                {lead.name} <span className="text-base text-primary-400 font-normal">女士/先生</span>
              </p>
              <button 
                onClick={() => setShowSuccessModal(false)} 
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-xl hover:from-amber-600 hover:to-rose-600 transition-colors font-bold shadow-lg shadow-rose-500/30"
              >
                好的，继续工作
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑客户信息弹窗 */}
      {isEditModalOpen && editForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200 opacity-100">
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
                        {["自然进店", "老介新", "抖音", "自有关系", "其他"].map(option => (
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
                  {editForm.source === '其他' && (
                    <div className="col-span-1 relative z-10 mt-2">
                      <label className="block text-sm font-medium text-primary-900 mb-1">具体来源</label>
                      <input 
                        type="text"
                        placeholder="请输入具体来源"
                        value={editForm.customSource || ''}
                        onChange={e => setEditForm({...editForm, customSource: e.target.value})}
                        className="w-full px-4 py-2.5 border border-primary-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-white text-primary-900"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-primary-900 mb-1">房屋面积 (m²)</label>
                    <input type="number" value={editForm.area} onChange={e => setEditForm({...editForm, area: e.target.value})} className="w-full px-4 py-2.5 bg-primary-50 border border-transparent rounded-lg focus:border-primary-300 focus:bg-white focus:ring-2 focus:ring-primary-100 transition-all outline-none text-sm text-primary-900" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-900 mb-1">预算</label>
                    <input type="text" value={editForm.budget} onChange={e => setEditForm({...editForm, budget: e.target.value})} className="w-full px-4 py-2.5 bg-primary-50 border border-transparent rounded-lg focus:border-primary-300 focus:bg-white focus:ring-2 focus:ring-primary-100 transition-all outline-none text-sm text-primary-900" />
                  </div>
                  {canSeeDoorPassword(lead) && (
                    <div>
                      <label className="block text-sm font-medium text-primary-900 mb-1">入户密码</label>
                      <input type="text" value={editForm.doorPassword || ''} onChange={e => setEditForm({...editForm, doorPassword: e.target.value})} placeholder="选填" className="w-full px-4 py-2.5 bg-primary-50 border border-transparent rounded-lg focus:border-primary-300 focus:bg-white focus:ring-2 focus:ring-primary-100 transition-all outline-none text-sm text-primary-900" />
                    </div>
                  )}
                </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 px-4 py-2.5 border border-primary-200 text-primary-700 rounded-lg hover:bg-primary-50 transition-colors font-medium">取消</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-primary-900 text-white rounded-lg hover:bg-primary-800 transition-colors shadow-sm font-bold opacity-100">保存修改</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 设计节点文件上传 - 文件夹选择模态框 */}
      <FolderSelectModal
        isOpen={showDesignFileFolderModal}
        onClose={() => {
          setShowDesignFileFolderModal(false);
          setPendingDesignFiles([]);
          setCurrentUploadNodeIdx(null);
        }}
        onConfirm={handleDesignFileUpload}
        folders={lead?.fileFolders || ['默认文件夹']}
        defaultFolder="设计文件"
        defaultVisibility="internal"
        leadId={leadId}
      />
    </MainLayout>
  );
}
