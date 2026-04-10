"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft, FileText, Upload, Trash2, CheckCircle2, Circle, FileDown, FileSpreadsheet, CreditCard, User, Phone, MapPin } from "lucide-react";
import MainLayout from "../../../components/MainLayout";
import leadsData from "../../../../mock_data/leads.json";
import CustomerDocuments from "../../../../src/components/CustomerDocuments";

export default function ContractDetailPage() {
  const router = useRouter();
  const params = useParams();
  const leadId = params.id as string;
  
  const [customer, setCustomer] = useState<any>(null);
  
  // 模拟分期付款节点
  const [payments, setPayments] = useState([
    { id: 'p1', stage: '定金 (10%)', amount: 10000, status: '已收', date: '2024-03-20', method: '银行转账', receipt: 'receipt_1.jpg' },
    { id: 'p2', stage: '一期款 - 水电进场 (30%)', amount: 30000, status: '已收', date: '2024-04-05', method: '微信支付', receipt: 'receipt_2.jpg' },
    { id: 'p3', stage: '二期款 - 瓦工进场 (30%)', amount: 30000, status: '待收', date: '2024-04-25', method: '', receipt: null },
    { id: 'p4', stage: '三期款 - 油漆进场 (25%)', amount: 25000, status: '待收', date: '2024-05-15', method: '', receipt: null },
    { id: 'p5', stage: '尾款 - 竣工验收 (5%)', amount: 5000, status: '待收', date: '2024-06-10', method: '', receipt: null },
  ]);

  const [paymentToConfirm, setPaymentToConfirm] = useState<{id: string, action: '确认' | '撤销'} | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (leadId) {
      const foundLead = leadsData.find(l => l.id === leadId);
      if (foundLead) {
        setCustomer(foundLead);
        
        // 模拟根据实际客户调整合同状态
        const numId = parseInt(leadId.replace(/[^0-9]/g, ''));
        if (numId % 3 === 0) {
          setPayments(payments.map(p => ({ ...p, status: '待收', date: '', method: '' })));
        }
      }
    }
  }, [leadId]);

  if (!customer) {
    return (
      <MainLayout>
        <div className="p-8 max-w-[1200px] mx-auto flex items-center justify-center h-64">
          <div className="text-primary-600">加载中...</div>
        </div>
      </MainLayout>
    );
  }

  const executeTogglePayment = () => {
    if (!paymentToConfirm) return;
    const { id } = paymentToConfirm;
    setPayments(payments.map(p => {
      if (p.id === id) {
        return { 
          ...p, 
          status: p.status === '已收' ? '待收' : '已收',
          date: p.status === '已收' ? '' : new Date().toISOString().split('T')[0],
          method: p.status === '已收' ? '' : '银行转账'
        };
      }
      return p;
    }));
    setPaymentToConfirm(null);
  };

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const collectedAmount = payments.filter(p => p.status === '已收').reduce((sum, p) => sum + p.amount, 0);

  return (
    <MainLayout>
      <div className="p-8 max-w-[1200px] mx-auto space-y-8 pb-32">
        {/* 顶部标题区 */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative">
          <div>
            <button 
              onClick={() => router.back()}
              className="flex items-center text-sm font-medium text-primary-600 hover:text-primary-900 mb-4 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              返回合同管理
            </button>
            <div className="flex items-center gap-3 relative">
              <h1 className="text-3xl font-bold tracking-tight text-primary-900">合同详情</h1>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-md text-sm font-bold">执行中</span>
              <button 
                onClick={() => setDeleteConfirmId(customer.id)}
                className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center justify-center"
                title="删除此合同记录"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              {deleteConfirmId === customer.id && (
                <div className="absolute left-full ml-2 top-0 w-64 bg-white border border-rose-100 rounded-xl shadow-xl p-4 z-50 animate-in fade-in zoom-in-95">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="p-2 bg-rose-100 text-rose-600 rounded-full shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-primary-900 mb-1">确定要删除此合同吗？</h4>
                      <p className="text-xs text-primary-500 leading-relaxed">删除后将无法恢复，请谨慎操作。</p>
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
                      onClick={() => {
                        setDeleteConfirmId(null);
                        router.push('/contracts');
                      }} 
                      className="px-3 py-1.5 bg-rose-500 text-white rounded-lg text-xs font-medium hover:bg-rose-600 transition-colors shadow-sm shadow-rose-200"
                    >
                      确认删除
                    </button>
                  </div>
                </div>
              )}
            </div>
            <p className="text-primary-600 mt-2 font-mono text-sm">关联客户：{customer.name} ({customer.id})</p>
          </div>
          
          <div className="flex gap-3">
            <button className="flex items-center px-4 py-2 border border-primary-200 text-primary-700 rounded-lg hover:bg-primary-50 transition-colors font-medium text-sm">
              <FileDown className="w-4 h-4 mr-2" />
              导出 PDF
            </button>
            <button className="flex items-center px-4 py-2 bg-primary-900 text-white rounded-lg hover:bg-primary-800 transition-colors shadow-sm font-medium text-sm">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              导出 Excel
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：文件管理与基础信息 */}
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-primary-900 mb-4 flex items-center">
                <span className="w-1.5 h-4 bg-primary-900 mr-2 rounded-sm inline-block"></span>
                项目基础信息
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-primary-50">
                  <div>
                    <p className="text-xs text-primary-500 mb-1 flex items-center"><User className="w-3 h-3 mr-1" /> 客户姓名</p>
                    <p className="text-sm font-medium text-primary-900">{customer.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-primary-500 mb-1 flex items-center"><Phone className="w-3 h-3 mr-1" /> 联系电话</p>
                    <p className="text-sm font-medium text-primary-900 font-mono">{customer.phone}</p>
                  </div>
                </div>
                <div className="pb-4 border-b border-primary-50">
                  <p className="text-xs text-primary-500 mb-1 flex items-center"><MapPin className="w-3 h-3 mr-1" /> 项目地址</p>
                  <p className="text-sm font-medium text-primary-900">{customer.address || "未提供地址"}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-primary-400 mb-1">房屋类型</p>
                    <p className="text-sm font-medium text-primary-900">{customer.requirementType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-primary-400 mb-1">房屋面积</p>
                    <p className="text-sm font-medium text-primary-900">{customer.area} m²</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-primary-100">
                  <div>
                    <p className="text-xs text-primary-400 mb-1">负责销售</p>
                    <p className="text-sm font-medium text-primary-900">{customer.sales}</p>
                  </div>
                  <div>
                    <p className="text-xs text-primary-400 mb-1">主案设计</p>
                    <p className="text-sm font-medium text-primary-900">{customer.designer}</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-primary-100">
                  <p className="text-xs text-primary-400 mb-1">签单时间</p>
                  <p className="text-sm font-medium font-mono text-primary-900">{customer.lastFollowUp}</p>
                </div>
              </div>
            </div>

            {/* 全局同步：客户文件与资料 */}
            <div className="h-[400px]">
              <CustomerDocuments customerName={customer.name} />
            </div>
          </div>

          {/* 右侧：分期收款管理 */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-xl border border-primary-100 shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-primary-100 flex justify-between items-center bg-primary-50/30">
                <h2 className="text-lg font-bold text-primary-900 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2 text-primary-700" />
                  分期收款计划与执行
                </h2>
                <div className="text-right">
                  <p className="text-xs text-primary-500 mb-1">合同总金额</p>
                  <p className="text-xl font-bold font-mono text-primary-900">¥ {totalAmount.toLocaleString()}</p>
                </div>
              </div>
              
              <div className="p-6">
                <div className="mb-8">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-primary-600 font-medium">累计已收款</span>
                    <span className="font-mono font-bold text-emerald-600">¥ {collectedAmount.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-primary-100 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500" 
                      style={{ width: `${(collectedAmount / totalAmount) * 100}%` }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-primary-200 before:to-transparent">
                  {payments.map((payment, index) => (
                    <div key={payment.id} className="relative flex items-start group is-active">
                      
                      {/* Timeline Dot */}
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white shrink-0 shadow-sm z-10
                        ${payment.status === '已收' ? 'bg-emerald-500 text-white' : 'bg-primary-100 text-primary-400'}"
                      >
                        {payment.status === '已收' ? <CheckCircle2 className="w-5 h-5 text-emerald-500 bg-white rounded-full" /> : <Circle className="w-5 h-5 text-white fill-primary-200" />}
                      </div>
                      
                      {/* Card */}
                      <div className="ml-6 w-full p-5 rounded-xl border transition-all
                        ${payment.status === '已收' ? 'bg-emerald-50/30 border-emerald-100' : 'bg-white border-primary-100 hover:border-primary-300'}"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <span className="text-xs font-bold text-primary-400 mb-1 block">第 {index + 1} 期</span>
                            <h3 className="font-bold text-primary-900">{payment.stage}</h3>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              className="px-3 py-1.5 rounded text-xs font-medium border border-primary-200 text-primary-700 hover:bg-primary-50 transition-colors flex items-center"
                            >
                              <Upload className="w-3 h-3 mr-1" />
                              {payment.receipt ? "重新上传" : "上传凭证"}
                            </button>
                            {payment.status === '已收' ? (
                              <span className="px-3 py-1.5 rounded text-xs font-bold bg-emerald-100 text-emerald-700 flex items-center">
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> 已收款
                              </span>
                            ) : (
                              <button 
                                onClick={() => setPaymentToConfirm({ id: payment.id, action: '确认' })}
                                className="px-3 py-1.5 rounded text-xs font-bold transition-colors bg-primary-900 text-white hover:bg-primary-800"
                              >
                                确认收款
                              </button>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-end justify-between mt-4 pt-4 border-t border-primary-100/50">
                          <div className="space-y-1">
                            <p className="text-xs text-primary-500 flex items-center">
                              收款日期：{payment.date || "未付款"}
                            </p>
                            <p className="text-xs text-primary-500 flex items-center">
                              支付方式：{payment.method || "--"}
                            </p>
                            {payment.receipt && (
                              <p className="text-xs text-blue-500 hover:underline cursor-pointer mt-1 flex items-center">
                                <FileText className="w-3 h-3 mr-1" /> 查看凭证
                              </p>
                            )}
                          </div>
                          <p className="text-lg font-bold font-mono text-primary-900">¥ {payment.amount.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 确认操作弹窗 */}
      {paymentToConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-primary-900 mb-2">
              确定要{paymentToConfirm.action}收款吗？
            </h3>
            <p className="text-primary-600 text-sm mb-6">
              {paymentToConfirm.action === '确认' 
                ? "确认后该期款项将被标记为已收，并计入累计已收款。"
                : "撤销后该期款项将恢复为待收状态，并从累计已收款中扣除。"}
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setPaymentToConfirm(null)}
                className="flex-1 px-4 py-2.5 border border-primary-200 text-primary-700 rounded-lg hover:bg-primary-50 transition-colors font-medium text-sm"
              >
                取消
              </button>
              <button 
                onClick={executeTogglePayment}
                className={`flex-1 px-4 py-2.5 text-white rounded-lg transition-colors shadow-sm font-medium text-sm ${
                  paymentToConfirm.action === '确认' ? 'bg-primary-900 hover:bg-primary-800' : 'bg-rose-500 hover:bg-rose-600'
                }`}
              >
                确定{paymentToConfirm.action}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}