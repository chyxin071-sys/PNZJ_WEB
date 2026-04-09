"use client";

import { useState } from "react";
import { Plus, Search, Filter, MoreHorizontal, FileEdit, FileCheck, FileX, Printer, Calculator, PackagePlus } from "lucide-react";
import MainLayout from "../../components/MainLayout";
import quotesData from "../../../mock_data/quotes.json";

export default function QuotesPage() {
  const [activeStatus, setActiveStatus] = useState("全部");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "草稿": return "bg-zinc-100 text-zinc-600 border-zinc-200";
      case "待确认": return "bg-blue-50 text-blue-600 border-blue-100";
      case "已签单": return "bg-emerald-50 text-emerald-600 border-emerald-100";
      case "已作废": return "bg-rose-50 text-rose-600 border-rose-100";
      default: return "bg-zinc-50 text-zinc-700 border-zinc-200";
    }
  };

  const statuses = ["全部", "草稿", "待确认", "已签单", "已作废"];

  return (
    <MainLayout>
      <div className="p-8 max-w-[1600px] mx-auto space-y-8">
        {/* 顶部标题区 */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary-900">报价管理</h1>
            <p className="text-primary-600 mt-2">独立报价核算模块，支持引用材料大厅标准库或灵活手写录入</p>
          </div>
          <button className="flex items-center justify-center min-h-[44px] px-4 py-2.5 bg-primary-900 text-white rounded-lg hover:bg-primary-800 transition-colors shadow-sm font-medium w-full sm:w-auto">
            <Calculator className="w-5 h-5 mr-2" />
            新建报价单
          </button>
        </div>

        {/* 筛选与搜索 */}
        <div className="bg-white p-5 rounded-xl border border-primary-100 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex space-x-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 hide-scrollbar">
            {statuses.map((status) => (
                <button
                  key={status}
                  onClick={() => setActiveStatus(status)}
                  className={`min-h-[44px] px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeStatus === status ? "bg-primary-900 text-white shadow-md" : "bg-primary-50 text-primary-600 hover:bg-primary-100"}`}
                >
                  {status}
                </button>
              ))}
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-600" />
            <input
              type="text"
              placeholder="搜索客户 / 手机号 / 报价单号..."
              className="w-full min-h-[44px] pl-9 pr-4 py-2.5 bg-primary-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary-900 focus:bg-white transition-all outline-none text-primary-900 placeholder:text-primary-600/60"
            />
          </div>
        </div>

        {/* 数据表格 */}
        <div className="bg-white rounded-xl border border-primary-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-primary-50/50 border-b border-primary-100 text-primary-600 text-sm">
                  <th className="py-4 px-6 font-medium">报价单号 / 日期</th>
                  <th className="py-4 px-6 font-medium">关联客户</th>
                  <th className="py-4 px-6 font-medium">报价明细</th>
                  <th className="py-4 px-6 font-medium">创建人员</th>
                  <th className="py-4 px-6 font-medium">当前状态</th>
                  <th className="py-4 px-6 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-100 text-sm">
                {quotesData.map((quote) => (
                  <tr key={quote.id} className="hover:bg-primary-50/30 transition-colors group">
                    <td className="py-4 px-6">
                      <p className="text-sm font-mono font-medium text-primary-900">{quote.id}</p>
                      <p className="text-xs text-primary-600 mt-1">{quote.date}</p>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center text-primary-900 font-bold shrink-0 border border-primary-100">
                          {quote.customer.charAt(0)}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-bold text-primary-900">{quote.customer}</p>
                          <p className="text-xs text-primary-600 font-mono mt-0.5">{quote.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-primary-600">总价:</span>
                          <span className="font-mono">¥{quote.total.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs text-rose-500">
                          <span>优惠:</span>
                          <span className="font-mono">-¥{quote.discount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold text-primary-900 pt-1 border-t border-primary-100 border-dashed">
                          <span>成交价:</span>
                          <span className="font-mono">¥{quote.final.toLocaleString()}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-primary-900">{quote.sales}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${getStatusColor(quote.status)}`}>
                        {quote.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 text-primary-600 hover:text-primary-900 hover:bg-primary-50 rounded-lg transition-colors" title="编辑/关联材料">
                          <FileEdit className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-primary-600 hover:text-primary-900 hover:bg-primary-50 rounded-lg transition-colors" title="打印/导出">
                          <Printer className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-primary-600 hover:text-primary-900 hover:bg-primary-50 rounded-lg transition-colors">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
