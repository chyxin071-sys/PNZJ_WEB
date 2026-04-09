"use client";

import { Plus, Search, Filter, MoreHorizontal, MessageSquare, UserPlus } from "lucide-react";
import MainLayout from "../../components/MainLayout";
import leadsData from "../../../mock_data/leads.json";

export default function LeadsPage() {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "沟通中": return "bg-blue-50 text-blue-700 border-blue-100";
      case "已量房": return "bg-indigo-50 text-indigo-700 border-indigo-100";
      case "方案阶段": return "bg-purple-50 text-purple-700 border-purple-100";
      case "已签单": return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "已流失": return "bg-zinc-100 text-zinc-500 border-zinc-200";
      default: return "bg-zinc-50 text-zinc-700 border-zinc-200";
    }
  };

  return (
    <MainLayout>
      <div className="p-4 md:p-8 h-full flex flex-col">
        {/* 页面标题与操作区 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 shrink-0">
          <div>
            <h2 className="text-2xl font-light text-zinc-900 tracking-wider">客户线索</h2>
            <p className="text-sm text-zinc-500 mt-1 font-light">共 {leadsData.length} 条客户记录</p>
          </div>
          <button className="flex items-center justify-center bg-primary-900 hover:bg-primary-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4 mr-2" />
            录入新线索
          </button>
        </div>

        {/* 筛选与搜索工具栏 */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6 shrink-0">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text" 
              placeholder="搜索客户姓名、手机号..." 
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-primary-100 rounded-lg text-sm focus:outline-none focus:border-primary-700 focus:ring-1 focus:ring-primary-700 transition-all placeholder:text-zinc-400"
            />
          </div>
          <button className="flex items-center justify-center bg-white border border-primary-100 hover:bg-primary-50 text-zinc-700 px-4 py-2.5 rounded-lg text-sm transition-colors whitespace-nowrap">
            <Filter className="w-4 h-4 mr-2" />
            筛选状态
          </button>
        </div>

        {/* 线索列表 (响应式表格/卡片) */}
        <div className="flex-1 bg-white rounded-xl border border-primary-50 overflow-hidden flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-primary-50/50 border-b border-primary-50">
                  <th className="py-4 px-6 text-xs font-medium text-zinc-500 uppercase tracking-wider">客户信息</th>
                  <th className="py-4 px-6 text-xs font-medium text-zinc-500 uppercase tracking-wider">当前状态</th>
                  <th className="py-4 px-6 text-xs font-medium text-zinc-500 uppercase tracking-wider">预算与来源</th>
                  <th className="py-4 px-6 text-xs font-medium text-zinc-500 uppercase tracking-wider">负责人员</th>
                  <th className="py-4 px-6 text-xs font-medium text-zinc-500 uppercase tracking-wider">最新跟进</th>
                  <th className="py-4 px-6 text-xs font-medium text-zinc-500 uppercase tracking-wider text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-50">
                {leadsData.map((lead) => (
                  <tr key={lead.id} className="hover:bg-primary-50/30 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-900 font-medium shrink-0">
                          {lead.name.charAt(0)}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-zinc-900">{lead.name}</p>
                          <p className="text-xs text-zinc-500">{lead.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(lead.status)}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-sm text-zinc-900">{lead.budget}</p>
                      <p className="text-xs text-zinc-500">{lead.source}</p>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm text-zinc-900 flex items-center">
                        <span className="text-zinc-500 w-12 text-xs">销售:</span> {lead.sales}
                      </div>
                      <div className="text-sm text-zinc-900 flex items-center mt-1">
                        <span className="text-zinc-500 w-12 text-xs">设计:</span> 
                        {lead.designer === "未分配" ? (
                          <span className="text-amber-600 text-xs flex items-center bg-amber-50 px-2 py-0.5 rounded cursor-pointer hover:bg-amber-100">
                            <UserPlus className="w-3 h-3 mr-1" /> 分配
                          </span>
                        ) : lead.designer}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-zinc-500">
                      {lead.lastFollowUp}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 text-primary-700 hover:bg-primary-100 rounded-lg transition-colors" title="跟进记录">
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 rounded-lg transition-colors">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* 分页区域 (静态占位) */}
          <div className="border-t border-primary-50 p-4 flex items-center justify-between text-sm text-zinc-500 shrink-0">
            <p>显示 1 至 10 条，共 10 条</p>
            <div className="flex space-x-1">
              <button className="px-3 py-1 border border-primary-100 rounded hover:bg-primary-50 disabled:opacity-50" disabled>上一页</button>
              <button className="px-3 py-1 border border-primary-100 rounded hover:bg-primary-50 disabled:opacity-50" disabled>下一页</button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}