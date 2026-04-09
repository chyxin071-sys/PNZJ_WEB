"use client";

import { useState } from "react";
import { Search, Plus, Filter, MoreVertical, CheckCircle2, XCircle, Shield, Building2, Users } from "lucide-react";
import MainLayout from "../../components/MainLayout";
import employeesData from "../../../mock_data/employees.json";

export default function EmployeesPage() {
  const [activeTab, setActiveTab] = useState("all");

  const roleMap: Record<string, { label: string, color: string, bg: string }> = {
    admin: { label: "管理员", color: "text-purple-700", bg: "bg-purple-50" },
    sales: { label: "销售", color: "text-blue-700", bg: "bg-blue-50" },
    designer: { label: "设计师", color: "text-emerald-700", bg: "bg-emerald-50" },
    manager: { label: "工长", color: "text-amber-700", bg: "bg-amber-50" },
  };

  return (
    <MainLayout>
      <div className="p-8 max-w-[1600px] mx-auto space-y-8">
        {/* 顶部区域 */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary-900">组织架构</h1>
            <p className="text-primary-600 mt-2">管理员工账号、部门归属与系统权限</p>
          </div>
          <button className="flex items-center justify-center min-h-[44px] px-4 py-2.5 bg-primary-900 text-white rounded-lg hover:bg-primary-800 transition-colors shadow-sm font-medium w-full sm:w-auto">
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
              placeholder="搜索员工姓名 / 手机号..."
              className="w-full min-h-[44px] pl-9 pr-4 py-2.5 bg-primary-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary-900 focus:bg-white transition-all outline-none text-primary-900 placeholder:text-primary-600/60"
            />
          </div>
        </div>

        {/* 员工列表表格 */}
        <div className="bg-white rounded-xl border border-primary-100 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-primary-50/50 border-b border-primary-100 text-primary-600 text-sm">
                  <th className="py-4 px-6 font-medium">员工姓名 / 账号</th>
                  <th className="py-4 px-6 font-medium">所属部门</th>
                  <th className="py-4 px-6 font-medium">系统角色</th>
                  <th className="py-4 px-6 font-medium">状态</th>
                  <th className="py-4 px-6 font-medium">入职时间</th>
                  <th className="py-4 px-6 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-100 text-sm">
                {employeesData.map((emp) => (
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
                    <td className="py-4 px-6 text-right">
                      <button className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-primary-600 hover:text-primary-900 hover:bg-primary-50 rounded-lg transition-colors ml-auto">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* 分页或底部状态栏 */}
          <div className="border-t border-primary-100 p-4 flex items-center justify-between text-sm text-primary-600 shrink-0 bg-primary-50/30">
            <p>显示 1 至 {employeesData.length} 条，共 {employeesData.length} 条</p>
            <div className="flex space-x-2">
              <button className="px-4 py-2 min-h-[44px] border border-primary-100 rounded-lg hover:bg-white disabled:opacity-50 font-medium transition-colors bg-transparent flex items-center justify-center" disabled>上一页</button>
              <button className="px-4 py-2 min-h-[44px] border border-primary-100 rounded-lg hover:bg-white disabled:opacity-50 font-medium transition-colors bg-transparent flex items-center justify-center" disabled>下一页</button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
