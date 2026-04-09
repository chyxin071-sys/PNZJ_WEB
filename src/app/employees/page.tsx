"use client";

import { useState, useEffect } from "react";
import { Search, Plus, Filter, MoreVertical, CheckCircle2, XCircle, Shield, Building2, Users, X, Edit, Trash2, Ban, ChevronDown, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import MainLayout from "../../components/MainLayout";
import employeesData from "../../../mock_data/employees.json";

export default function EmployeesPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // 弹窗与下拉菜单状态
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [employeeToConfirm, setEmployeeToConfirm] = useState<{id: string, action: string} | null>(null);
  
  // 添加员工表单状态
  const [newEmployeeRoleDropdown, setNewEmployeeRoleDropdown] = useState(false);
  const [newEmployeeRole, setNewEmployeeRole] = useState("sales");
  
  // 自定义日历状态
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [newEmployeeJoinDate, setNewEmployeeJoinDate] = useState(new Date().toISOString().split('T')[0]);
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());

  // 日历辅助函数
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // 转换为周一为0
  };

  useEffect(() => {
    if (isAddModalOpen || employeeToConfirm) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isAddModalOpen, employeeToConfirm]);

  const roleMap: Record<string, { label: string, color: string, bg: string }> = {
    admin: { label: "管理员", color: "text-purple-700", bg: "bg-purple-50" },
    sales: { label: "销售", color: "text-blue-700", bg: "bg-blue-50" },
    designer: { label: "设计师", color: "text-emerald-700", bg: "bg-emerald-50" },
    manager: { label: "工长", color: "text-amber-700", bg: "bg-amber-50" },
  };

  // 筛选员工数据
  const filteredEmployees = employeesData.filter(emp => {
    const matchesTab = activeTab === "all" || emp.role === activeTab;
    const matchesSearch = emp.name.includes(searchQuery) || emp.username.includes(searchQuery);
    return matchesTab && matchesSearch;
  });

  return (
    <MainLayout>
      <div className="p-8 max-w-[1600px] mx-auto space-y-8">
        {/* 顶部区域 */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-primary-900">组织架构</h1>
            <p className="text-primary-600 mt-2">管理员工账号、部门归属与系统权限</p>
          </div>
          <button 
            onClick={() => {
              setEditingEmployee(null);
              setNewEmployeeRole("sales");
              const today = new Date();
              setNewEmployeeJoinDate(today.toISOString().split('T')[0]);
              setCalendarViewDate(today);
              setIsAddModalOpen(true);
            }}
            className="flex items-center justify-center min-h-[44px] px-4 py-2.5 bg-primary-900 text-white rounded-lg hover:bg-primary-800 transition-colors shadow-sm font-medium w-full sm:w-auto"
          >
            <Plus className="w-5 h-5 mr-2" />
            添加员工
          </button>
        </div>

        {/* 核心指标卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <div className="bg-white p-5 rounded-xl border border-primary-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm text-primary-600 font-medium mb-1">总人数</p>
              <p className="text-3xl font-bold text-primary-900">20</p>
            </div>
            <div className="p-3 bg-primary-50 rounded-lg text-primary-600"><Users className="w-6 h-6" /></div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-primary-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm text-primary-600 font-medium mb-1">销售部</p>
              <p className="text-3xl font-bold text-primary-900">8</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg text-blue-600"><Building2 className="w-6 h-6" /></div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-primary-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm text-primary-600 font-medium mb-1">设计部</p>
              <p className="text-3xl font-bold text-primary-900">5</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600"><Building2 className="w-6 h-6" /></div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-primary-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm text-primary-600 font-medium mb-1">工程部</p>
              <p className="text-3xl font-bold text-primary-900">6</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg text-amber-600"><Building2 className="w-6 h-6" /></div>
          </div>
        </div>

        {/* 搜索与筛选区 */}
        <div className="bg-white p-5 rounded-xl border border-primary-100 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex space-x-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 hide-scrollbar">
            {["all", "sales", "designer", "manager", "admin"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`min-h-[44px] px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? "bg-primary-900 text-white shadow-sm"
                    : "bg-primary-50 text-primary-600 hover:bg-primary-100 hover:text-primary-900"
                }`}
              >
                {tab === "all" ? "全部人员" : roleMap[tab].label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-600" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索员工姓名 / 手机号..."
              className="w-full min-h-[44px] pl-9 pr-4 py-2.5 bg-primary-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary-900 focus:bg-white transition-all outline-none text-primary-900 placeholder:text-primary-600/60"
            />
          </div>
        </div>

        {/* 员工列表表格 */}
        <div className="bg-white rounded-xl border border-primary-100 shadow-sm flex flex-col">
          <div className="w-full overflow-x-auto sm:overflow-visible rounded-t-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-primary-50/50 border-b border-primary-100 text-primary-600 text-sm">
                  <th className="py-4 px-6 font-medium">员工姓名 / 账号</th>
                  <th className="py-4 px-6 font-medium">所属部门</th>
                  <th className="py-4 px-6 font-medium">系统角色</th>
                  <th className="py-4 px-6 font-medium">状态</th>
                  <th className="py-4 px-6 font-medium">入职时间</th>
                  <th className="py-4 px-6 font-medium text-center w-24">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-100 text-sm">
                {filteredEmployees.length > 0 ? (
                  filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-primary-50/30 transition-colors group">
                      <td className="py-4 px-6">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center text-primary-900 font-bold shrink-0 border border-primary-100 group-hover:bg-white transition-colors">
                            {emp.name.charAt(0)}
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-bold text-primary-900">{emp.name}</p>
                            <p className="text-xs text-primary-600 font-mono mt-0.5">{emp.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center text-primary-900 font-medium">
                          <Building2 className="w-4 h-4 mr-2 text-primary-600" />
                          {emp.department}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${roleMap[emp.role].bg} ${roleMap[emp.role].color}`}>
                          <Shield className="w-3 h-3 mr-1" />
                          {roleMap[emp.role].label}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {emp.status === 'active' ? (
                          <span className="inline-flex items-center text-emerald-600 font-medium">
                            <CheckCircle2 className="w-4 h-4 mr-1.5" />
                            在职
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-rose-500 font-medium">
                            <XCircle className="w-4 h-4 mr-1.5" />
                            已离职 (禁止登录)
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-primary-600 font-medium font-mono text-sm">
                        {emp.joinDate}
                      </td>
                      <td className="py-4 px-6">
                        <div className="relative flex justify-center">
                          <button 
                            onClick={() => setActiveActionMenu(activeActionMenu === emp.id ? null : emp.id)}
                            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-primary-600 hover:text-primary-900 hover:bg-primary-50 rounded-lg transition-colors"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                          
                          {/* 统一UI的操作下拉菜单 */}
                          {activeActionMenu === emp.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setActiveActionMenu(null)} />
                              <div className={`absolute right-0 w-36 bg-white rounded-lg shadow-lg border border-primary-100 py-1 z-20 ${
                                filteredEmployees.length > 3 && filteredEmployees.findIndex(e => e.id === emp.id) >= filteredEmployees.length - 2
                                  ? 'bottom-full mb-1' // 最后两个元素向上展开
                                  : 'top-full mt-1' // 默认向下展开
                              }`}>
                                <button 
                                  onClick={() => {
                                    setEditingEmployee(emp);
                                    setNewEmployeeRole(emp.role);
                                    const joinDate = emp.joinDate || new Date().toISOString().split('T')[0];
                                    setNewEmployeeJoinDate(joinDate);
                                    setCalendarViewDate(new Date(joinDate));
                                    setIsAddModalOpen(true);
                                    setActiveActionMenu(null);
                                  }}
                                  className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-primary-50 text-primary-900 flex items-center transition-colors"
                                >
                                  <Edit className="w-4 h-4 mr-2 text-primary-600" />
                                  编辑员工
                                </button>
                                <button 
                                  onClick={() => {
                                    setEmployeeToConfirm({ id: emp.id, action: emp.status === 'active' ? '停用账号' : '恢复账号' });
                                    setActiveActionMenu(null);
                                  }}
                                  className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-amber-50 text-amber-700 flex items-center transition-colors border-t border-primary-50"
                                >
                                  <Ban className="w-4 h-4 mr-2" />
                                  {emp.status === 'active' ? '停用账号' : '恢复账号'}
                                </button>
                                <button 
                                  onClick={() => {
                                    setEmployeeToConfirm({ id: emp.id, action: '删除员工' });
                                    setActiveActionMenu(null);
                                  }}
                                  className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-rose-50 text-rose-600 flex items-center transition-colors"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  删除员工
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-primary-500">
                      没有找到匹配的员工数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* 分页或底部状态栏 */}
          <div className="border-t border-primary-100 p-4 flex items-center justify-between text-sm text-primary-600 shrink-0 bg-primary-50/30">
            <p>显示 1 至 {filteredEmployees.length} 条，共 {filteredEmployees.length} 条</p>
            <div className="flex space-x-2">
              <button className="px-4 py-2 min-h-[44px] border border-primary-100 rounded-lg hover:bg-white disabled:opacity-50 font-medium transition-colors bg-transparent flex items-center justify-center" disabled>上一页</button>
              <button className="px-4 py-2 min-h-[44px] border border-primary-100 rounded-lg hover:bg-white disabled:opacity-50 font-medium transition-colors bg-transparent flex items-center justify-center" disabled>下一页</button>
            </div>
          </div>
        </div>
      </div>

      {/* 添加/编辑员工弹窗 (统一UI) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-primary-100 shrink-0">
              <h3 className="text-lg font-bold text-primary-900">{editingEmployee ? '编辑员工信息' : '添加新员工'}</h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-primary-400 hover:text-primary-600 transition-colors p-1 rounded-lg hover:bg-primary-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form className="p-6 space-y-4 overflow-y-visible" onSubmit={(e) => { e.preventDefault(); setIsAddModalOpen(false); }}>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-primary-900">员工姓名 <span className="text-rose-500">*</span></label>
                <input 
                  type="text" 
                  defaultValue={editingEmployee?.name || ''}
                  placeholder="请输入真实姓名"
                  className="w-full px-3 py-2 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-900 text-sm"
                  required
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-primary-900">手机号码 (登录账号) <span className="text-rose-500">*</span></label>
                <input 
                  type="tel" 
                  defaultValue={editingEmployee?.username || ''}
                  placeholder="请输入11位手机号"
                  className="w-full px-3 py-2 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-900 text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5 relative">
                <label className="text-sm font-medium text-primary-900">系统角色 <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <button 
                    type="button"
                    onClick={() => setNewEmployeeRoleDropdown(!newEmployeeRoleDropdown)}
                    className="w-full px-3 py-2 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-900 text-sm flex items-center justify-between bg-white text-primary-900 text-left"
                  >
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${roleMap[newEmployeeRole].bg} ${roleMap[newEmployeeRole].color}`}>
                      <Shield className="w-3 h-3 mr-1" />
                      {roleMap[newEmployeeRole].label}
                    </span>
                    <ChevronDown className="w-4 h-4 text-primary-400" />
                  </button>
                  
                  {newEmployeeRoleDropdown && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setNewEmployeeRoleDropdown(false)} />
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-primary-100 py-1 z-30">
                        {Object.entries(roleMap).map(([key, role]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              setNewEmployeeRole(key);
                              setNewEmployeeRoleDropdown(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-primary-50 transition-colors flex items-center ${newEmployeeRole === key ? 'bg-primary-50/50' : ''}`}
                          >
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${role.bg} ${role.color}`}>
                              <Shield className="w-3 h-3 mr-1" />
                              {role.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-primary-900">入职时间 <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                    className="w-full px-3 py-2 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-900 text-sm flex items-center justify-between bg-white text-primary-900 text-left"
                  >
                    {newEmployeeJoinDate}
                    <Calendar className="w-4 h-4 text-primary-400" />
                  </button>
                  
                  {isDatePickerOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsDatePickerOpen(false)} />
                      <div className="absolute left-0 bottom-full mb-1 bg-white rounded-xl shadow-xl border border-primary-100 p-4 z-30 w-64 origin-bottom-left animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex justify-between items-center mb-3">
                          <button 
                            type="button" 
                            onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1))}
                            className="p-1 hover:bg-primary-50 rounded-md transition-colors"
                          >
                            <ChevronLeft className="w-4 h-4 text-primary-600" />
                          </button>
                          <span className="font-bold text-sm text-primary-900">
                            {calendarViewDate.getFullYear()}年{calendarViewDate.getMonth() + 1}月
                          </span>
                          <button 
                            type="button" 
                            onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1))}
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
                            const isSelected = dateStr === newEmployeeJoinDate;
                            return (
                              <button
                                key={d}
                                type="button"
                                onClick={() => { 
                                  setNewEmployeeJoinDate(dateStr); 
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
                            onClick={() => {
                              const today = new Date();
                              setNewEmployeeJoinDate(today.toISOString().split('T')[0]);
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

              <div className="pt-4 flex justify-end gap-3 border-t border-primary-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-900 hover:bg-primary-800 rounded-lg shadow-sm transition-colors flex items-center"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  {editingEmployee ? '保存修改' : '确认添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 二次确认弹窗 (停用/恢复/删除) */}
      {employeeToConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-primary-900 mb-2">
              确定要{employeeToConfirm.action}吗？
            </h3>
            <p className="text-primary-600 text-sm mb-6">
              {employeeToConfirm.action === '删除员工' 
                ? "此操作不可恢复，该员工的所有数据将被清除。"
                : employeeToConfirm.action === '停用账号' 
                  ? "停用后，该员工将无法再登录系统，但其历史数据会被保留。"
                  : "恢复后，该员工将重新获得系统的登录权限。"}
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setEmployeeToConfirm(null)}
                className="flex-1 px-4 py-2.5 border border-primary-200 text-primary-700 rounded-lg hover:bg-primary-50 transition-colors font-medium text-sm"
              >
                取消
              </button>
              <button 
                onClick={() => setEmployeeToConfirm(null)}
                className={`flex-1 px-4 py-2.5 text-white rounded-lg transition-colors shadow-sm font-medium text-sm ${
                  employeeToConfirm.action === '删除员工' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-primary-900 hover:bg-primary-800'
                }`}
              >
                确定{employeeToConfirm.action.replace('员工', '').replace('账号', '')}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
