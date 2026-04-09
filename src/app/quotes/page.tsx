"use client";

import { FileText, Upload, Plus, Download, CheckCircle2, CircleDashed } from "lucide-react";
import MainLayout from "../../components/MainLayout";
import quotesData from "../../../mock_data/quotes.json";

export default function QuotesPage() {
  return (
    <MainLayout>
      <div className="p-4 md:p-8 h-full flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 shrink-0">
          <div>
            <h2 className="text-2xl font-light text-zinc-900 tracking-wider">报价与材料管理</h2>
            <p className="text-sm text-zinc-500 mt-1 font-light">管理合同总价明细与主材进场状态</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center justify-center bg-white border border-primary-100 hover:bg-primary-50 text-zinc-700 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
              <Upload className="w-4 h-4 mr-2" />
              导入报价单
            </button>
            <button className="flex items-center justify-center bg-primary-900 hover:bg-primary-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
              <Plus className="w-4 h-4 mr-2" />
              新建报价
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
          {quotesData.map((quote) => (
            <div key={quote.id} className="bg-white rounded-2xl border border-primary-50 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col h-full">
              {/* 卡片头部 */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center text-primary-800">
                    <FileText className="w-6 h-6" strokeWidth={1.5} />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-zinc-900">{quote.customerName}的家</h3>
                    <p className="text-xs text-zinc-500 mt-1">{quote.area} | {quote.designer}设计</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border
                  ${quote.status === '已签约' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                    quote.status === '待确认' ? 'bg-amber-50 text-amber-700 border-amber-100' : 
                    'bg-zinc-50 text-zinc-600 border-zinc-200'}`}>
                  {quote.status}
                </span>
              </div>

              {/* 地址 */}
              <div className="mb-6">
                <p className="text-sm text-zinc-600 font-light bg-primary-50/50 px-3 py-2 rounded-lg border border-primary-50/50">
                  {quote.address}
                </p>
              </div>

              {/* 核心数据 */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">总报价 (元)</p>
                  <p className="text-xl font-light text-zinc-900">¥ {quote.totalAmount}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">主材进场状态</p>
                  <div className="flex items-center text-sm font-medium">
                    {quote.materialsStatus === '已确认进场' ? (
                      <span className="text-emerald-600 flex items-center"><CheckCircle2 className="w-4 h-4 mr-1.5" />已进场</span>
                    ) : quote.materialsStatus === '选材中' ? (
                      <span className="text-amber-600 flex items-center"><CircleDashed className="w-4 h-4 mr-1.5 animate-spin-slow" />选材中</span>
                    ) : (
                      <span className="text-zinc-400 flex items-center"><CircleDashed className="w-4 h-4 mr-1.5" />未开始</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 底部操作区 */}
              <div className="mt-auto pt-4 border-t border-primary-50 flex items-center justify-between">
                <p className="text-xs text-zinc-400">更新于 {quote.updateTime}</p>
                <div className="flex space-x-2">
                  <button className="text-zinc-400 hover:text-primary-700 p-2 hover:bg-primary-50 rounded-md transition-colors" title="下载报价单PDF">
                    <Download className="w-4 h-4" />
                  </button>
                  <button className="text-primary-700 font-medium text-sm px-3 py-1.5 hover:bg-primary-50 rounded-md transition-colors">
                    查看详情
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}