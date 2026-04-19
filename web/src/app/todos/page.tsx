"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Check, Clock, Calendar, Users, Target, Search, Plus, X, Edit2, Trash2, ArrowUpAZ, ArrowDownAZ, ChevronDown, ChevronLeft, ChevronRight, Paperclip, Image as ImageIcon, Upload } from "lucide-react";
import MainLayout from "../../components/MainLayout";
import { useRouter } from "next/navigation";

// -- 常量定义 --
const ROLE_MAP: Record<string, string> = {
  admin: "超级管理员",
  sales: "销售",
  designer: "设计",
  manager: "项目经理"
};

const ROLE_COLOR_MAP: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700 border-purple-200",
  sales: "bg-blue-100 text-blue-700 border-blue-200",
  designer: "bg-pink-100 text-pink-700 border-pink-200",
  manager: "bg-cyan-100 text-cyan-700 border-cyan-200"
};

const PRIORITY_MAP: Record<string, string> = {
  low: "普通",
  medium: "重要",
  high: "紧急"
};

const PRIORITY_COLOR_MAP: Record<string, string> = {
  low: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  high: "bg-rose-50 text-rose-700 border-rose-200"
};

// -- 自定义下拉组件 --
const CustomSelect = ({ value, onChange, options, placeholder = "请选择", className = "", dropdownClassName = "" }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((o: any) => o.value === value);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        className="flex items-center justify-between w-full h-full bg-white border border-primary-200 rounded-lg text-sm text-primary-700 focus:outline-none hover:border-primary-300 transition-colors cursor-pointer px-3 py-2"
      >
        <div className="flex-1 truncate text-left flex items-center">
          {selectedOption ? (selectedOption.render ? selectedOption.render(selectedOption) : selectedOption.label) : placeholder}
        </div>
        <ChevronDown className={`w-4 h-4 text-primary-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      {isOpen && (
        <div className={`absolute z-[100] top-full left-0 right-0 mt-1 bg-white border border-primary-100 shadow-xl rounded-xl max-h-64 overflow-y-auto animate-in fade-in zoom-in-95 duration-100 ${dropdownClassName}`}>
          {options.map((opt: any) => (
            <div 
              key={opt.value} 
              onClick={() => { onChange(opt.value); setIsOpen(false); }} 
              className={`px-3 py-2 hover:bg-primary-50 cursor-pointer text-sm border-b border-primary-50 last:border-0 transition-colors ${value === opt.value ? 'bg-primary-50 font-bold text-primary-900' : 'text-primary-700'}`}
            >
              {opt.render ? opt.render(opt) : opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function TodosPage() {
  const router = useRouter();
  const [todos, setTodos] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [leadsData, setLeadsData] = useState<any[]>([]);
  const [projectsData, setProjectsData] = useState<any[]>([]);

  const fetchTodos = async () => {
    try {
      const res = await fetch('/api/todos');
      if (res.ok) {
        const data = await res.json();
        // 适配云开发数据格式
        const formatted = data.map((item: any) => ({
          ...item,
          id: item._id,
          createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString()
        }));
        setTodos(formatted);
      }
    } catch (e) {
      console.error('获取待办失败', e);
    }
  };
  
  // -- 筛选器状态 --
  const [filterView, setFilterView] = useState<"与我相关" | "团队全部">("与我相关");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateSort, setDateSort] = useState<"asc" | "desc">("asc");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [personFilter, setPersonFilter] = useState<string>("all"); // specific employee id

  // -- 弹窗与表单状态 --
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // 自定义日历状态
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());

  // 日历辅助函数
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // 转换为周一为0
  };

  // 基础数据
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    dueDate: "",
    priority: "normal",
    assignedToId: "",
    relatedType: "lead",
    relatedId: "",
    attachments: [] as { type: string, url: string, name: string }[]
  });

  useEffect(() => {
    const userData = localStorage.getItem("pnzj_user") || localStorage.getItem("userInfo");
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setCurrentUser(user);
        if (user.role !== 'admin') {
          setFilterView("与我相关");
        } else {
          setFilterView("团队全部");
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchTodos();

    // 拉取真实员工、线索、工地数据
    fetch('/api/employees').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setEmployees(data);
    }).catch(console.error);

    fetch('/api/leads').then(r => r.json()).then(data => {
      if (Array.isArray(data)) {
        setLeadsData(data.map((l: any) => ({ id: l._id, name: l.name, address: l.address, status: l.status })));
      }
    }).catch(console.error);

    fetch('/api/projects').then(r => r.json()).then(data => {
      if (Array.isArray(data)) {
        setProjectsData(data.map((p: any) => ({ id: p._id, customer: p.customer, address: p.address, status: p.status })));
      }
    }).catch(console.error);
  }, []);

  const toggleTodoStatus = async (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    
    const newStatus = todo.status === 'completed' ? 'pending' : 'completed';
    
    // 乐观更新 UI
    setTodos(todos.map(t => t.id === id ? { ...t, status: newStatus } : t));
    
    try {
      await fetch(`/api/todos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (e) {
      console.error('更新状态失败', e);
      // 失败则回滚
      setTodos(todos.map(t => t.id === id ? { ...t, status: todo.status } : t));
    }
  };

  // 日期辅助函数
  const isToday = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  };
  const isThisWeek = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const day = now.getDay() || 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - day + 1);
    monday.setHours(0,0,0,0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23,59,59,999);
    return date >= monday && date <= sunday;
  };
  const isThisMonth = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  };

  // 根据当前条件过滤待办
  const filteredTodos = useMemo(() => {
    return todos.filter(t => {
      // 1. 视图过滤（与我相关 vs 团队全部）
      if (filterView === "与我相关" && currentUser) {
        const myName = currentUser.name;
        const inAssignees = t.assignees?.some((a: any) => a.name === myName);
        const isAssignedTo = t.assignedTo?.name === myName;
        const isCreator = t.createdBy?.name === myName || t.creatorName === myName;
        if (!inAssignees && !isAssignedTo && !isCreator) return false;
      }
      // 2. 状态过滤
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      // 3. 日期范围过滤
      if (dateFilter === "today" && !isToday(t.dueDate)) return false;
      if (dateFilter === "week" && !isThisWeek(t.dueDate)) return false;
      if (dateFilter === "month" && !isThisMonth(t.dueDate)) return false;
      // 4. 人员过滤 (仅在"团队全部"且选择了具体人时生效)
      if (filterView === "团队全部" && personFilter !== "all") {
        const inAssignees = t.assignees?.some((a: any) => a.id === personFilter);
        const isAssignedTo = t.assignedTo?.id === personFilter;
        const isCreator = t.createdBy?.id === personFilter;
        if (!inAssignees && !isAssignedTo && !isCreator) return false;
      }
      // 5. 搜索过滤
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!t.title?.toLowerCase().includes(q) && 
            !t.relatedTo?.name?.toLowerCase().includes(q) &&
            !t.assignedTo?.name?.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      // 排序逻辑：未完成在前
      if (a.status === 'pending' && b.status === 'completed') return -1;
      if (a.status === 'completed' && b.status === 'pending') return 1;
      // 然后按截止日期升降序
      const timeA = new Date(a.dueDate).getTime();
      const timeB = new Date(b.dueDate).getTime();
      return dateSort === 'asc' ? timeA - timeB : timeB - timeA;
    });
  }, [todos, filterView, filterStatus, dateFilter, personFilter, searchQuery, dateSort, currentUser]);

  const pendingCount = filteredTodos.filter(t => t.status === 'pending').length;
  const completedCount = filteredTodos.filter(t => t.status === 'completed').length;

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const totalPages = Math.ceil(filteredTodos.length / itemsPerPage);
  const paginatedTodos = filteredTodos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterView, filterStatus, dateFilter, personFilter, searchQuery, dateSort]);

  // -- 弹窗表单操作 --
  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      title: "",
      description: "",
      dueDate: new Date().toISOString().split('T')[0],
      priority: "normal",
      assignedToId: currentUser?._id || currentUser?.id || "",
      relatedType: "lead",
      relatedId: "",
      attachments: []
    });
    setIsModalOpen(true);
  };

  const openEditModal = (todo: any) => {
    setEditingId(todo.id);
    setFormData({
      title: todo.title,
      description: todo.description,
      dueDate: todo.dueDate,
      priority: todo.priority,
      assignedToId: todo.assignedTo?.id || "",
      relatedType: todo.relatedTo?.type || "lead",
      relatedId: todo.relatedTo?.id || "",
      attachments: todo.attachments || []
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/todos/${id}`, { method: 'DELETE' });
      setTodos(todos.filter(t => t.id !== id));
    } catch (e) {
      console.error('删除失败', e);
    }
    setDeleteConfirmId(null);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.dueDate) return alert("请填写标题和截止日期");

    const assignedEmp = employees.find(e => (e._id || e.id) === formData.assignedToId) || currentUser;
    let relatedName = "";
    if (formData.relatedType === 'lead') {
      relatedName = leadsData.find(l => l.id === formData.relatedId)?.name || "未知线索";
    } else {
      const proj = projectsData.find(p => p.id === formData.relatedId);
      relatedName = proj ? `${proj.customer} - ${proj.address}` : "未知工地";
    }

    if (editingId) {
      const updatedData = {
        title: formData.title,
        description: formData.description,
        dueDate: formData.dueDate,
        priority: formData.priority,
        attachments: formData.attachments,
        assignedTo: {
          id: assignedEmp?._id || assignedEmp?.id || '',
          name: assignedEmp?.name || '',
          role: assignedEmp?.role || ''
        },
        relatedTo: {
          type: formData.relatedType,
          id: formData.relatedId,
          name: relatedName
        }
      };
      
      // 乐观更新 UI
      setTodos(todos.map(t => t.id === editingId ? { ...t, ...updatedData } : t));
      setIsModalOpen(false);

      try {
        await fetch(`/api/todos/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedData)
        });
      } catch (e) {
        console.error('编辑失败', e);
        fetchTodos(); // 出错重新拉取
      }
    } else {
      const newTodo = {
        title: formData.title,
        description: formData.description,
        dueDate: formData.dueDate,
        priority: formData.priority,
        attachments: formData.attachments,
        status: "pending",
        createdBy: {
          id: currentUser?.id || 'admin',
          name: currentUser?.name || '系统',
          role: currentUser?.role || 'admin'
        },
        assignedTo: {
          id: assignedEmp?._id || assignedEmp?.id || '',
          name: assignedEmp?.name || '',
          role: assignedEmp?.role || ''
        },
        relatedTo: {
          type: formData.relatedType,
          id: formData.relatedId,
          name: relatedName
        }
      };
      
      setIsModalOpen(false);
      
      try {
        const res = await fetch('/api/todos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newTodo)
        });
        if (res.ok) {
          fetchTodos(); // 创建成功后重新拉取
        }
      } catch (e) {
        console.error('新建失败', e);
      }
    }
  };

  // 是否有权限编辑/删除（只有创建者或超级管理员可以修改/删除，负责人只能打勾）
  const canEditOrDelete = (todo: any) => {
    if (!currentUser) return false;
    return currentUser.role === 'admin' || currentUser.name === todo.createdBy?.name;
  };

  return (
    <MainLayout>
      <div className="p-8 max-w-[1200px] mx-auto space-y-6">
        
        {/* 头部与统计 */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary-900">团队协同与待办</h1>
            <p className="text-primary-600 mt-2">在这里管理所有的跨角色协作任务与跟进事项</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-4 flex items-center gap-4 min-w-[150px]">
              <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-primary-500">待处理</p>
                <p className="text-2xl font-bold text-primary-900">{pendingCount}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-4 flex items-center gap-4 min-w-[150px]">
              <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
                <Check className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-primary-500">已完成</p>
                <p className="text-2xl font-bold text-primary-900">{completedCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 超级筛选器与工具栏 */}
        <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-5 flex flex-col gap-4">
          
          {/* 第一排：视图与新建 */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex bg-primary-50 rounded-lg p-1 w-full sm:w-auto">
              <button 
                onClick={() => setFilterView('与我相关')}
                className={`flex-1 sm:flex-none px-6 py-2 text-sm font-bold rounded-md transition-colors ${filterView === '与我相关' ? 'bg-white shadow-sm text-primary-900' : 'text-primary-500 hover:text-primary-900'}`}
              >
                与我相关
              </button>
              {currentUser?.role === 'admin' && (
                <button 
                  onClick={() => setFilterView('团队全部')}
                  className={`flex-1 sm:flex-none px-6 py-2 text-sm font-bold rounded-md transition-colors ${filterView === '团队全部' ? 'bg-white shadow-sm text-primary-900' : 'text-primary-500 hover:text-primary-900'}`}
                >
                  团队全部
                </button>
              )}
            </div>
            <button 
              onClick={openCreateModal}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors shadow-sm shadow-primary-900/20"
            >
              <Plus className="w-4 h-4" />
              新建待办
            </button>
          </div>

          <div className="h-px bg-primary-100 w-full"></div>

          {/* 第二排：多维细分筛选 */}
          <div className="flex flex-wrap items-center gap-3">
            {/* 状态筛选 */}
            <CustomSelect 
              value={filterStatus}
              onChange={(val: any) => setFilterStatus(val)}
              options={[
                { label: "全部状态", value: "all" },
                { label: "进行中", value: "pending" },
                { label: "已完成", value: "completed" }
              ]}
              className="w-32"
            />

            {/* 日期范围筛选 */}
            <CustomSelect 
              value={dateFilter}
              onChange={(val: any) => setDateFilter(val)}
              options={[
                { label: "所有日期", value: "all" },
                { label: "今天截止", value: "today" },
                { label: "本周截止", value: "week" },
                { label: "本月截止", value: "month" }
              ]}
              className="w-32"
            />

            {/* 人员筛选 (仅限团队全部视图) */}
            {filterView === '团队全部' && (
              <CustomSelect
                value={personFilter}
                onChange={(val: any) => setPersonFilter(val)}
                options={[
                  { label: "所有员工", value: "all" },
                  ...employees.map(emp => ({
                    label: emp.name,
                    value: emp._id || emp.id,
                    render: () => (
                      <div className="flex items-center justify-between w-full">
                        <span>{emp.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${ROLE_COLOR_MAP[emp.role] || ''}`}>
                          {ROLE_MAP[emp.role] || emp.role}
                        </span>
                      </div>
                    )
                  }))
                ]}
                className="w-48"
              />
            )}

            {/* 日期升降序 */}
            <button
              onClick={() => setDateSort(dateSort === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 bg-white border border-primary-200 rounded-lg text-sm text-primary-700 flex items-center gap-1.5 hover:bg-primary-50 transition-colors"
              title="切换日期排序"
            >
              {dateSort === 'asc' ? <ArrowUpAZ className="w-4 h-4 text-primary-500" /> : <ArrowDownAZ className="w-4 h-4 text-primary-500" />}
              {dateSort === 'asc' ? '日期升序' : '日期降序'}
            </button>

            {/* 搜索框 */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
              <input 
                type="text" 
                placeholder="搜索待办标题、客户或工地..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-primary-50 border border-transparent rounded-lg text-sm focus:outline-none focus:bg-white focus:border-primary-300 transition-all"
              />
            </div>
          </div>
        </div>

        {/* 待办列表主体 */}
        <div className="space-y-4">
          {filteredTodos.length > 0 ? paginatedTodos.map((todo) => (
            <div 
              key={todo.id} 
              className={`bg-white rounded-xl border p-5 transition-all duration-300 flex flex-col sm:flex-row sm:items-center gap-5 group relative overflow-hidden
                ${todo.status === 'completed' ? 'border-primary-100 opacity-60 bg-primary-50/30' : 'border-primary-200 hover:border-primary-400 shadow-sm hover:shadow-md'}
              `}
            >
              {/* 左侧：打勾按钮与标题描述 */}
              <div 
                className="flex items-start gap-4 flex-1 min-w-0 cursor-pointer"
                onClick={() => openEditModal(todo)}
              >
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleTodoStatus(todo.id); }}
                  className={`mt-1 shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300
                    ${todo.status === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-primary-300 hover:border-primary-500 text-transparent hover:text-primary-200'}
                  `}
                >
                  <Check className="w-4 h-4" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className={`text-lg font-bold truncate transition-colors duration-300
                      ${todo.status === 'completed' ? 'text-primary-400 line-through' : 'text-primary-900 group-hover:text-primary-700'}
                    `}>
                      {todo.title}
                    </h3>
                    {todo.status !== 'completed' && todo.priority && PRIORITY_MAP[todo.priority] && (
                      <span className={`px-2 py-0.5 rounded text-xs font-bold border ${PRIORITY_COLOR_MAP[todo.priority]}`}>
                        {PRIORITY_MAP[todo.priority]}
                      </span>
                    )}
                  </div>
                  <p className={`text-sm line-clamp-2 ${todo.status === 'completed' ? 'text-primary-400' : 'text-primary-600'}`}>
                    {todo.description}
                  </p>
                  
                  {/* 附件展示区 */}
                  {todo.attachments && todo.attachments.length > 0 && (
                    <div className="flex items-center gap-2 mt-3">
                      {todo.attachments.map((att: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-1.5 px-2 py-1 bg-primary-50 border border-primary-100 rounded text-xs text-primary-600 hover:bg-primary-100 transition-colors">
                          {att.type === 'image' ? <ImageIcon className="w-3.5 h-3.5 text-primary-400" /> : <Paperclip className="w-3.5 h-3.5 text-primary-400" />}
                          <span className="truncate max-w-[100px]">{att.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 右侧：关联信息与属性标签 */}
              <div className="flex flex-wrap sm:flex-col sm:items-end gap-3 sm:gap-2 shrink-0 sm:w-64 pl-10 sm:pl-0 border-t sm:border-t-0 sm:border-l border-primary-100 pt-3 sm:pt-0 sm:pl-5 relative">
                
                {/* 悬浮的操作按钮 (仅创建者或Admin可见) */}
                {canEditOrDelete(todo) && (
                  <div className="absolute -top-3 -right-2 sm:-right-4 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white/90 backdrop-blur-sm p-1 rounded-bl-lg shadow-sm border border-primary-100">
                    <button 
                      onClick={() => openEditModal(todo)}
                      className="p-1.5 text-primary-400 hover:text-primary-900 hover:bg-primary-50 rounded transition-colors"
                      title="编辑"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="relative">
                      <button 
                        onClick={() => setDeleteConfirmId(todo.id)}
                        className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      {deleteConfirmId === todo.id && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-rose-100 rounded-lg shadow-xl p-3 z-50 animate-in fade-in">
                          <p className="text-xs font-bold text-primary-900 mb-3 text-center">确定删除该待办？</p>
                          <div className="flex gap-2 justify-center">
                            <button onClick={() => setDeleteConfirmId(null)} className="px-3 py-1 bg-primary-50 text-primary-600 rounded text-xs hover:bg-primary-100">取消</button>
                            <button onClick={() => handleDelete(todo.id)} className="px-3 py-1 bg-rose-500 text-white rounded text-xs hover:bg-rose-600">删除</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 关联跳转 */}
                <div className="flex items-center gap-1.5 bg-primary-50 px-2.5 py-1 rounded-md w-full sm:w-auto overflow-hidden mt-2 sm:mt-0">
                  <Target className="w-3.5 h-3.5 text-primary-400 shrink-0" />
                  <span className="shrink-0 text-xs font-medium text-primary-500">
                    {todo.relatedTo?.type === 'lead' ? '线索' : '工地'}
                  </span>
                  <button 
                    onClick={() => router.push(todo.relatedTo?.type === 'lead' ? `/leads/${todo.relatedTo?.id}` : `/projects/${todo.relatedTo?.id}`)}
                    className="text-xs font-bold text-primary-900 hover:text-primary-600 truncate hover:underline"
                    title={todo.relatedTo?.name}
                  >
                    {todo.relatedTo?.name || '未知关联'}
                  </button>
                </div>

                {/* 截止时间 */}
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium
                  ${todo.status === 'completed' ? 'text-primary-400' : 'text-amber-700 bg-amber-50'}
                `}>
                  <Calendar className="w-3.5 h-3.5" />
                  {todo.dueDate} 截止
                </div>

                {/* 执行人与创建人 */}
                <div className="flex items-center gap-3 text-xs text-primary-500">
                  <span className="flex items-center gap-1" title="执行人">
                    <Users className="w-3.5 h-3.5" /> {todo.assignedTo?.name || '未指派'}
                  </span>
                  <span className="text-primary-300">|</span>
                  <span className="truncate max-w-[80px]" title={`派发人: ${todo.createdBy?.name || '系统'}`}>
                    派发: {todo.createdBy?.name || '系统'}
                  </span>
                </div>

              </div>
            </div>
          )) : (
            <div className="bg-white rounded-xl border border-primary-100 border-dashed p-16 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-primary-300" />
              </div>
              <h3 className="text-lg font-bold text-primary-900 mb-1">暂无匹配待办</h3>
              <p className="text-sm text-primary-500 max-w-sm">
                当前筛选条件下没有找到任何任务。您可以调整上方的筛选器，或者点击“新建待办”创建新任务。
              </p>
            </div>
          )}
        </div>

        {/* 分页控件 */}
        {filteredTodos.length > 0 && (
          <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-4 flex flex-col sm:flex-row items-center justify-between text-sm text-primary-600 gap-4">
            <p>显示 {(currentPage - 1) * itemsPerPage + 1} 至 {Math.min(currentPage * itemsPerPage, filteredTodos.length)} 条，共 {filteredTodos.length} 条</p>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 min-h-[44px] flex items-center justify-center border border-primary-100 rounded-lg hover:bg-primary-50 disabled:opacity-50 font-medium transition-colors"
              >
                上一页
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-4 py-2 min-h-[44px] flex items-center justify-center border border-primary-100 rounded-lg hover:bg-primary-50 disabled:opacity-50 font-medium transition-colors"
              >
                下一页
              </button>
            </div>
          </div>
        )}

      </div>

      {/* 新建/编辑待办弹窗 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-primary-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 duration-300">
            <div className="sticky top-0 bg-white border-b border-primary-100 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-primary-900">{editingId ? '编辑待办事项' : '新建待办事项'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-primary-400 hover:bg-primary-50 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-primary-900 mb-1.5">任务标题 <span className="text-rose-500">*</span></label>
                <input 
                  type="text" 
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-2.5 bg-primary-50 border border-primary-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:bg-white transition-all"
                  placeholder="例如：催促客户交定金、工地材料进场验收等"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-primary-900 mb-1.5">详细描述</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-primary-50 border border-primary-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:bg-white transition-all resize-none"
                  placeholder="补充更多任务细节..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-primary-900 mb-1.5">截止日期 <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => { setIsDatePickerOpen(!isDatePickerOpen); setCalendarViewDate(new Date(formData.dueDate || new Date())); }}
                      className="w-full px-4 h-[42px] bg-primary-50 border border-primary-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:bg-white transition-all flex items-center justify-between text-primary-900 text-left"
                    >
                      {formData.dueDate || "选择日期"}
                      <Calendar className="w-4 h-4 text-primary-400" />
                    </button>
                    
                    {isDatePickerOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsDatePickerOpen(false)} />
                        <div className="absolute left-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-primary-100 p-4 z-30 w-64 origin-top-left animate-in fade-in zoom-in-95 duration-150">
                          <div className="flex justify-between items-center mb-3">
                            <button 
                              type="button" 
                              onClick={(e) => { e.preventDefault(); setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1)); }}
                              className="p-1 hover:bg-primary-50 rounded-md transition-colors"
                            >
                              <ChevronLeft className="w-4 h-4 text-primary-600" />
                            </button>
                            <span className="font-bold text-sm text-primary-900">
                              {calendarViewDate.getFullYear()}年{calendarViewDate.getMonth() + 1}月
                            </span>
                            <button 
                              type="button" 
                              onClick={(e) => { e.preventDefault(); setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1)); }}
                              className="p-1 hover:bg-primary-50 rounded-md transition-colors"
                            >
                              <ChevronRight className="w-4 h-4 text-primary-600" />
                            </button>
                          </div>
                          <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2 font-medium text-primary-400">
                            {['一','二','三','四','五','六','日'].map(d => <div key={d}>{d}</div>)}
                          </div>
                          <div className="grid grid-cols-7 gap-1 text-center text-sm">
                            {Array(getFirstDayOfMonth(calendarViewDate.getFullYear(), calendarViewDate.getMonth())).fill(null).map((_, i) => (
                              <div key={`empty-${i}`} />
                            ))}
                            {Array.from({ length: getDaysInMonth(calendarViewDate.getFullYear(), calendarViewDate.getMonth()) }, (_, i) => i + 1).map(d => {
                              const dateStr = `${calendarViewDate.getFullYear()}-${String(calendarViewDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                              const isSelected = dateStr === formData.dueDate;
                              return (
                                <button
                                  key={d}
                                  type="button"
                                  onClick={(e) => { 
                                    e.preventDefault();
                                    setFormData({...formData, dueDate: dateStr}); 
                                    setIsDatePickerOpen(false); 
                                  }}
                                  className={`w-7 h-7 flex items-center justify-center rounded-md hover:bg-primary-100 transition-colors mx-auto ${isSelected ? 'bg-primary-900 text-white hover:bg-primary-800 font-bold' : 'text-primary-900'}`}
                                >
                                  {d}
                                </button>
                              );
                            })}
                          </div>
                          <div className="mt-3 pt-3 border-t border-primary-50 flex justify-between">
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                const today = new Date();
                                const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                                setFormData({...formData, dueDate: dateStr});
                                setCalendarViewDate(today);
                                setIsDatePickerOpen(false);
                              }}
                              className="text-xs font-medium text-primary-600 hover:text-primary-900"
                            >
                              回到今天
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-primary-900 mb-1.5">优先级</label>
                  <CustomSelect 
                    value={formData.priority}
                    onChange={(val: any) => setFormData({...formData, priority: val})}
                    options={[
                      { label: "普通", value: "low", render: () => <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-slate-400"></span>普通</div> },
                      { label: "重要", value: "medium", render: () => <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500"></span>重要</div> },
                      { label: "紧急", value: "high", render: () => <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-rose-500"></span>紧急</div> }
                    ]}
                    className="w-full h-[42px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-primary-900 mb-1.5">指派给谁 (执行人)</label>
                  <CustomSelect
                    value={formData.assignedToId}
                    onChange={(val: any) => setFormData({...formData, assignedToId: val})}
                    options={employees.map(emp => ({
                      label: emp.name,
                      value: emp._id || emp.id,
                      render: () => (
                        <div className="flex items-center justify-between w-full">
                          <span>{emp.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${ROLE_COLOR_MAP[emp.role] || ''}`}>
                            {ROLE_MAP[emp.role] || emp.role}
                          </span>
                        </div>
                      )
                    }))}
                    className="w-full h-[42px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-primary-900 mb-1.5">关联类型</label>
                  <div className="flex p-1 bg-primary-50 rounded-xl border border-primary-200">
                    <button
                      onClick={() => setFormData({...formData, relatedType: 'lead', relatedId: ''})}
                      className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-colors ${formData.relatedType === 'lead' ? 'bg-white shadow text-primary-900' : 'text-primary-500 hover:text-primary-900'}`}
                    >
                      未开工(线索)
                    </button>
                    <button
                      onClick={() => setFormData({...formData, relatedType: 'project', relatedId: ''})}
                      className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-colors ${formData.relatedType === 'project' ? 'bg-white shadow text-primary-900' : 'text-primary-500 hover:text-primary-900'}`}
                    >
                      已开工(工地)
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-primary-900 mb-1.5">
                  选择关联的{formData.relatedType === 'lead' ? '客户线索' : '施工工地'}
                </label>
                <CustomSelect
                  value={formData.relatedId}
                  onChange={(val: any) => setFormData({...formData, relatedId: val})}
                  options={formData.relatedType === 'lead' ? (
                    leadsData.map(lead => ({ label: `${lead.name} (${lead.address || ''}) - ${lead.status || ''}`, value: lead.id }))
                  ) : (
                    projectsData.map(proj => ({ label: `${proj.customer} - ${proj.address || ''} - ${proj.status || ''}`, value: proj.id }))
                  )}
                  placeholder={`请选择${formData.relatedType === 'lead' ? '客户' : '工地'}`}
                  className="w-full h-[42px]"
                />
              </div>

              {/* 附件与图片上传区 */}
              <div>
                <label className="block text-sm font-bold text-primary-900 mb-1.5">附件与图片 (现场照片/图纸)</label>
                <div className="flex flex-wrap gap-3 mb-2">
                  {formData.attachments && formData.attachments.map((att: any, idx) => (
                    <div key={idx} className="relative group rounded-lg overflow-hidden border border-primary-200 bg-primary-50">
                      {att.type === 'image' ? (
                        <div className="w-20 h-20 bg-cover bg-center" style={{ backgroundImage: `url(${att.url})` }} />
                      ) : (
                        <div className="w-20 h-20 flex flex-col items-center justify-center p-2 text-primary-500">
                          <Paperclip className="w-6 h-6 mb-1" />
                          <span className="text-[10px] text-center w-full truncate">{att.name}</span>
                        </div>
                      )}
                      <button 
                        onClick={() => setFormData({...formData, attachments: formData.attachments.filter((_, i) => i !== idx)})}
                        className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {/* 模拟上传按钮 */}
                  <button className="w-20 h-20 rounded-lg border-2 border-dashed border-primary-200 hover:border-primary-400 hover:bg-primary-50 flex flex-col items-center justify-center text-primary-400 transition-colors">
                    <Upload className="w-5 h-5 mb-1" />
                    <span className="text-[10px] font-medium">上传文件</span>
                  </button>
                </div>
                <p className="text-xs text-primary-400">支持 jpg, png, pdf, docx 格式，每个文件不超过 10MB</p>
              </div>

            </div>

            <div className="sticky bottom-0 bg-primary-50 border-t border-primary-100 p-4 sm:p-6 flex justify-end gap-3 rounded-b-2xl">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2.5 border border-primary-200 text-primary-600 rounded-xl text-sm font-bold hover:bg-white hover:border-primary-300 transition-colors"
              >
                取消
              </button>
              <button 
                onClick={handleSave}
                className="px-8 py-2.5 bg-primary-900 text-white rounded-xl text-sm font-bold hover:bg-primary-800 shadow-md shadow-primary-900/20 transition-colors"
              >
                保存待办
              </button>
            </div>
          </div>
        </div>
      )}

    </MainLayout>
  );
}