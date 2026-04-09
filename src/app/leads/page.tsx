"use client";

import { useState } from "react";
import { Plus, Search, Filter, MoreHorizontal, MessageSquare, UserPlus, FileText, ChevronDown } from "lucide-react";
import MainLayout from "../../components/MainLayout";
import leadsData from "../../../mock_data/leads.json";

export default function LeadsPage() {
  const [activeRating, setActiveRating] = useState("全部");

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

  const getRatingBadge = (rating: string) => {
    switch (rating) {
      case "A": return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-rose-50 text-rose-600 border border-rose-100">A级 (高意向)</span>;
      case "B": return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-600 border border-amber-100">B级 (对比中)</span>;
      case "C": return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100">C级 (观望中)</span>;
      case "D": return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-zinc-100 text-zinc-500 border border-zinc-200">D级 (无意向)</span>;
      default: return null;
    }
  };

  const ratings = ["全部", "A级", "B级", "C级", "D级"];

  return (
    <MainLayout>
      <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      {/* 顶部标题区 */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary-900">客户线索</h1>
          <p className="text-primary-600 mt-2">共 {leadsData.length} 条客户记录，请及时跟进高意向客户</p>
        </div>
        <button className="flex items-center justify-center min-h-[44px] px-4 py-2.5 bg-primary-900 text-white rounded-lg hover:bg-primary-800 transition-colors shadow-sm font-medium w-full sm:w-auto">
          <Plus className="w-5 h-5 mr-2" />
          录入新线索
        </button>
      </div>

      {/* 筛选与搜索 - 融合风格 */}
      <div className="bg-white p-5 rounded-xl border border-primary-100 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex space-x-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 hide-scrollbar">
          {ratings.map((rating) => (
            <button
              key={rating}
              onClick={() => setActiveRating(rating)}
              className={`min-h-[44px] px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeRating === rating ? "bg-primary-900 text-white shadow-md" : "bg-primary-50 text-primary-600 hover:bg-primary-100"}`}
            >
              {rating}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button className="flex items-center justify-center min-h-[44px] bg-white border border-primary-100 hover:bg-primary-50 text-primary-900 px-4 py-2.5 rounded-lg text-sm transition-colors whitespace-nowrap font-medium w-full sm:w-auto">
            <Filter className="w-4 h-4 mr-2" />
            高级筛选
            <ChevronDown className="w-4 h-4 ml-1 opacity-50" />
          </button>
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-600" />
            <input
              type="text"
              placeholder="搜索客户姓名/手机号..."
              className="w-full min-h-[44px] pl-9 pr-4 py-2.5 bg-primary-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary-900 focus:bg-white transition-all outline-none text-primary-900 placeholder:text-primary-600/60"
            />
          </div>
        </div>
      </div>

      {/* 数据表格 - 极简高级感 */}
      <div className="bg-white rounded-xl border border-primary-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-primary-50/50 border-b border-primary-100 text-primary-600 text-sm">
                <th className="py-4 px-6 font-medium">客户信息</th>
                <th className="py-4 px-6 font-medium">评级 & 状态</th>
                <th className="py-4 px-6 font-medium">房屋信息</th>
                <th className="py-4 px-6 font-medium">负责人员</th>
                <th className="py-4 px-6 font-medium">最新跟进</th>
                <th className="py-4 px-6 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-100 text-sm">
              {leadsData.map((lead) => (
                <tr key={lead.id} className="hover:bg-primary-50/30 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center text-primary-900 font-bold shrink-0 border border-primary-100 group-hover:bg-white transition-colors">
                        {lead.name.charAt(0)}
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-bold text-primary-900">{lead.name}</p>
                        <p className="text-xs text-primary-600 font-mono mt-0.5">{lead.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-col items-start gap-1.5">
                      {getRatingBadge(lead.rating)}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(lead.status)}`}>
                        {lead.status}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-sm font-medium text-primary-900">{lead.houseType} · {lead.area}m²</p>
                    <p className="text-xs text-primary-600 mt-0.5">预算: {lead.budget}</p>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-sm text-primary-900 flex items-center">
                      <span className="text-primary-600 w-12 text-xs">销售:</span> {lead.sales}
                    </div>
                    <div className="text-sm text-primary-900 flex items-center mt-1">
                      <span className="text-primary-600 w-12 text-xs">设计:</span>
                      {lead.designer === "未分配" ? (
                        <span className="text-amber-600 text-xs font-medium flex items-center bg-amber-50 px-2 py-0.5 rounded cursor-pointer hover:bg-amber-100 border border-amber-100">
                          <UserPlus className="w-3 h-3 mr-1" /> 分配
                        </span>
                      ) : lead.designer}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-sm text-primary-900">{lead.lastFollowUp}</p>
                    <p className="text-xs text-primary-600 mt-0.5 line-clamp-1 max-w-[150px]" title={lead.notes}>{lead.notes}</p>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-primary-600 hover:text-primary-900 hover:bg-primary-50 rounded-lg transition-colors" title="跟进记录">
                        <MessageSquare className="w-5 h-5" />
                      </button>
                      <button className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-primary-600 hover:text-primary-900 hover:bg-primary-50 rounded-lg transition-colors" title="生成报价">
                        <FileText className="w-5 h-5" />
                      </button>
                      <button className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-primary-600 hover:text-primary-900 hover:bg-primary-50 rounded-lg transition-colors">
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-primary-100 p-4 flex items-center justify-between text-sm text-primary-600 shrink-0 bg-primary-50/30">
          <p>显示 1 至 {leadsData.length} 条，共 {leadsData.length} 条</p>
          <div className="flex space-x-2">
            <button className="px-4 py-2 min-h-[44px] flex items-center justify-center border border-primary-100 rounded-lg hover:bg-white disabled:opacity-50 font-medium transition-colors bg-transparent" disabled>上一页</button>
            <button className="px-4 py-2 min-h-[44px] flex items-center justify-center border border-primary-100 rounded-lg hover:bg-white disabled:opacity-50 font-medium transition-colors bg-transparent" disabled>下一页</button>
          </div>
        </div>
      </div>
    </div>
    </MainLayout>
  );
}

