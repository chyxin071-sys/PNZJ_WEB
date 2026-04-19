"use client";

import { useState, useEffect } from "react";
import { Search, ArrowDownToLine, ArrowUpFromLine, History, Package, XCircle, ChevronDown, AlertTriangle } from "lucide-react";
import MainLayout from "../../components/MainLayout";

const CATEGORIES = ["全部", "主材", "辅材", "软装", "家电", "人工", "定制", "套餐"];

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [leadsData, setLeadsData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("全部");
  const [currentUser, setCurrentUser] = useState<any>(null);

  // 出入库弹窗
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockActionType, setStockActionType] = useState<'inbound' | 'outbound'>('inbound');
  const [stockProduct, setStockProduct] = useState<any>(null);
  const [stockAmount, setStockAmount] = useState('');
  const [stockRemark, setStockRemark] = useState('');
  const [stockCustomer, setStockCustomer] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 明细弹窗
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<any>(null);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);

  useEffect(() => {
    const userData = localStorage.getItem("pnzj_user");
    if (userData) {
      try { setCurrentUser(JSON.parse(userData)); } catch (e) {}
    }
    fetchProducts();
    fetchLeads();
  }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/materials');
      if (res.ok) {
        const data = await res.json();
        setProducts(data.map((item: any) => ({ ...item, id: item._id })));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLeads = async () => {
    try {
      const res = await fetch('/api/leads');
      if (res.ok) {
        const data = await res.json();
        setLeadsData(data.map((item: any) => ({ ...item, id: item._id })));
      }
    } catch (e) {}
  };

  const fetchHistory = async (productId: string) => {
    setHistoryRecords([]);
    try {
      const res = await fetch(`/api/inventory?productId=${productId}`);
      if (res.ok) {
        const data = await res.json();
        setHistoryRecords(Array.isArray(data) ? data : []);
      }
    } catch (e) {}
  };

  const handleStockAction = async () => {
    if (!stockProduct || !stockAmount || isNaN(Number(stockAmount)) || Number(stockAmount) <= 0) return;
    const amount = Number(stockAmount);
    if (stockActionType === 'outbound' && amount > (stockProduct.stock || 0)) {
      alert("出库数量不能大于当前库存");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: stockProduct.id,
          productName: stockProduct.name,
          type: stockActionType,
          quantity: amount,
          operator: currentUser?.name || '未知',
          remark: stockRemark || (stockActionType === 'inbound' ? '常规入库' : (stockCustomer ? `发货至 ${stockCustomer} 家工地` : '常规出库')),
          customer: stockActionType === 'outbound' ? stockCustomer : undefined
        })
      });

      if (res.ok) {
        setProducts(products.map(p => p.id === stockProduct.id
          ? { ...p, stock: stockActionType === 'inbound' ? (p.stock || 0) + amount : (p.stock || 0) - amount }
          : p
        ));
        setIsStockModalOpen(false);
        setStockProduct(null);
        setStockAmount('');
        setStockRemark('');
        setStockCustomer('');
      } else {
        alert("操作失败，请重试");
      }
    } catch (e) {
      alert("操作失败，请重试");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchCategory = activeCategory === "全部" || p.category === activeCategory;
    const matchSearch = !searchQuery || p.name?.includes(searchQuery) || p.brand?.includes(searchQuery) || p.sku?.includes(searchQuery);
    return matchCategory && matchSearch;
  });

  const lowStockCount = products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) < 20).length;
  const zeroStockCount = products.filter(p => !p.stock || p.stock === 0).length;

  return (
    <MainLayout>
      <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-4 md:space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-primary-900">库存管理</h1>
          <p className="text-primary-600 mt-2">记录出入库流水，实时掌握各产品库存动态</p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-primary-100 shadow-sm">
            <p className="text-sm font-medium text-primary-500">产品总数</p>
            <p className="text-2xl font-bold text-primary-900">{products.length}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-amber-100 shadow-sm">
            <p className="text-sm font-medium text-amber-600">库存预警 (&lt;20)</p>
            <p className="text-2xl font-bold text-amber-600">{lowStockCount}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-rose-100 shadow-sm">
            <p className="text-sm font-medium text-rose-500">零库存</p>
            <p className="text-2xl font-bold text-rose-600">{zeroStockCount}</p>
          </div>
        </div>

        {/* 筛选与搜索 */}
        <div className="bg-white p-5 rounded-xl border border-primary-100 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex space-x-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 hide-scrollbar">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`min-h-[44px] px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeCategory === cat ? "bg-primary-900 text-white shadow-md" : "bg-primary-50 text-primary-600 hover:bg-primary-100"}`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-600" />
            <input
              type="text"
              placeholder="搜索名称 / 品牌 / 型号..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full min-h-[44px] pl-9 pr-4 py-2.5 bg-primary-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary-900 focus:bg-white transition-all outline-none text-primary-900 placeholder:text-primary-600/60"
            />
          </div>
        </div>

        {/* 产品库存表格 */}
        <div className="bg-white rounded-xl border border-primary-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-primary-50/50 border-b border-primary-100 text-primary-600 text-sm">
                  <th className="py-4 px-6 font-medium whitespace-nowrap">产品信息</th>
                  <th className="py-4 px-6 font-medium whitespace-nowrap">分类</th>
                  <th className="py-4 px-6 font-medium whitespace-nowrap">单价</th>
                  <th className="py-4 px-6 font-medium whitespace-nowrap">当前库存</th>
                  <th className="py-4 px-6 font-medium text-center whitespace-nowrap">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-100 text-sm">
                {isLoading ? (
                  <tr><td colSpan={5} className="py-16 text-center text-primary-400">加载中...</td></tr>
                ) : filteredProducts.map(product => (
                  <tr key={product.id} className="hover:bg-primary-50/30 transition-colors">
                    <td className="py-4 px-6">
                      <p className="font-medium text-primary-900">{product.name}</p>
                      <p className="text-xs text-primary-500 mt-0.5">{product.brand} · {product.sku}</p>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-primary-50 text-primary-700 border border-primary-100">
                        {product.category}
                      </span>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <span className="text-sm font-mono text-primary-900">¥{(product.price || 0).toFixed(2)} / {product.unit}</span>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-mono font-bold px-2 py-1 rounded-md ${
                          !product.stock || product.stock === 0 ? 'bg-rose-50 text-rose-600' :
                          product.stock < 20 ? 'bg-amber-50 text-amber-600' : 'bg-primary-50 text-primary-900'
                        }`}>
                          {product.stock || 0} {product.unit}
                        </span>
                        {product.stock < 20 && product.stock > 0 && (
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => { setStockProduct(product); setStockActionType('inbound'); setIsStockModalOpen(true); }}
                          className="flex items-center px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                        >
                          <ArrowDownToLine className="w-3.5 h-3.5 mr-1" /> 入库
                        </button>
                        <button
                          onClick={() => { setStockProduct(product); setStockActionType('outbound'); setIsStockModalOpen(true); }}
                          className="flex items-center px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                        >
                          <ArrowUpFromLine className="w-3.5 h-3.5 mr-1" /> 出库
                        </button>
                        <button
                          onClick={() => { setHistoryProduct(product); fetchHistory(product.id); setIsHistoryModalOpen(true); }}
                          className="flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          <History className="w-3.5 h-3.5 mr-1" /> 明细
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!isLoading && filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-primary-600">
                      <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p>没有找到符合条件的产品</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 出入库弹窗 */}
        {isStockModalOpen && stockProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center p-6 border-b border-primary-100 bg-primary-50/50">
                <h2 className="text-xl font-bold text-primary-900 flex items-center">
                  {stockActionType === 'inbound'
                    ? <ArrowDownToLine className="w-5 h-5 mr-2 text-emerald-600" />
                    : <ArrowUpFromLine className="w-5 h-5 mr-2 text-amber-600" />}
                  {stockActionType === 'inbound' ? '产品入库' : '产品出库'}
                </h2>
                <button onClick={() => setIsStockModalOpen(false)} className="text-primary-400 hover:text-primary-600 transition-colors">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-primary-50 rounded-lg p-4 border border-primary-100">
                  <p className="text-sm font-bold text-primary-900 mb-1">{stockProduct.name}</p>
                  <div className="flex justify-between text-xs text-primary-600">
                    <span>当前库存: <span className="font-mono font-bold text-primary-900">{stockProduct.stock || 0}</span> {stockProduct.unit}</span>
                    <span>型号: {stockProduct.sku}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary-900 mb-1">
                    {stockActionType === 'inbound' ? '入库数量' : '出库数量'} *
                  </label>
                  <div className="relative">
                    <input
                      type="number" min="1"
                      value={stockAmount}
                      onChange={e => setStockAmount(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-primary-200 rounded-lg focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all outline-none font-mono text-lg"
                      placeholder="请输入数量"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-primary-400 text-sm">{stockProduct.unit}</span>
                  </div>
                </div>
                {stockActionType === 'outbound' && (
                  <div>
                    <label className="block text-sm font-medium text-primary-900 mb-1">关联客户 (选填)</label>
                    <div className="relative">
                      <div
                        onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                        className="w-full px-4 py-2.5 bg-white border border-primary-200 rounded-lg hover:border-primary-300 transition-all flex items-center justify-between cursor-pointer text-sm"
                      >
                        <span className={stockCustomer ? "text-primary-900 font-medium" : "text-primary-500"}>
                          {stockCustomer || "不关联具体客户"}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-primary-400 transition-transform ${isCustomerDropdownOpen ? 'rotate-180' : ''}`} />
                      </div>
                      {isCustomerDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setIsCustomerDropdownOpen(false)} />
                          <div className="absolute z-20 w-full mt-1 bg-white border border-primary-100 rounded-lg shadow-lg max-h-60 overflow-y-auto py-1">
                            <div onClick={() => { setStockCustomer(''); setIsCustomerDropdownOpen(false); }} className="px-4 py-2.5 text-sm text-primary-700 hover:bg-primary-50 cursor-pointer transition-colors">不关联具体客户</div>
                            {leadsData.filter(l => l.status === '已签单').map(lead => (
                              <div key={lead.id} onClick={() => { setStockCustomer(lead.name); setIsCustomerDropdownOpen(false); }} className="px-4 py-2.5 text-sm text-primary-900 hover:bg-primary-50 cursor-pointer transition-colors">{lead.name}</div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-primary-900 mb-1">操作备注 (选填)</label>
                  <textarea
                    value={stockRemark}
                    onChange={e => setStockRemark(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-primary-200 rounded-lg focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all outline-none resize-none h-20 text-sm"
                    placeholder={stockActionType === 'inbound' ? '如：新采购批次、退货入库等' : '如：用于工地施工、破损报废等'}
                  />
                </div>
              </div>
              <div className="p-6 border-t border-primary-100 bg-primary-50/30 flex gap-3">
                <button onClick={() => setIsStockModalOpen(false)} className="flex-1 px-4 py-2.5 border border-primary-200 text-primary-700 rounded-lg hover:bg-primary-50 transition-colors font-medium">取消</button>
                <button
                  onClick={handleStockAction}
                  disabled={isSaving || !stockAmount || Number(stockAmount) <= 0 || (stockActionType === 'outbound' && Number(stockAmount) > (stockProduct.stock || 0))}
                  className={`flex-1 px-4 py-2.5 text-white rounded-lg transition-colors shadow-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${stockActionType === 'inbound' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'}`}
                >
                  {isSaving ? '保存中...' : `确认${stockActionType === 'inbound' ? '入库' : '出库'}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 库存明细弹窗 */}
        {isHistoryModalOpen && historyProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 max-h-[80vh]">
              <div className="flex justify-between items-center p-6 border-b border-primary-100 bg-primary-50/50 shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-primary-900 flex items-center">
                    <History className="w-5 h-5 mr-2 text-blue-600" /> 库存明细记录
                  </h2>
                  <p className="text-sm text-primary-600 mt-1">{historyProduct.name} · 当前库存: {historyProduct.stock || 0} {historyProduct.unit}</p>
                </div>
                <button onClick={() => setIsHistoryModalOpen(false)} className="text-primary-400 hover:text-primary-600 transition-colors">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-white border-b border-primary-100 z-10">
                    <tr className="text-primary-600 text-xs uppercase tracking-wider">
                      <th className="py-3 px-6 font-medium">操作时间</th>
                      <th className="py-3 px-6 font-medium">类型</th>
                      <th className="py-3 px-6 font-medium">数量</th>
                      <th className="py-3 px-6 font-medium">操作人</th>
                      <th className="py-3 px-6 font-medium">备注</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary-50 text-sm">
                    {historyRecords.length > 0 ? historyRecords.map((record: any) => (
                      <tr key={record._id} className="hover:bg-primary-50/30 transition-colors">
                        <td className="py-3 px-6 text-primary-600 whitespace-nowrap">
                          {record.createdAt?.$date ? new Date(record.createdAt.$date).toLocaleString('zh-CN') : record.createdAt}
                        </td>
                        <td className="py-3 px-6 whitespace-nowrap">
                          {record.type === 'inbound' ? (
                            <span className="inline-flex items-center text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-xs font-bold">
                              <ArrowDownToLine className="w-3 h-3 mr-1" /> 入库
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-xs font-bold">
                              <ArrowUpFromLine className="w-3 h-3 mr-1" /> 出库
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-6 whitespace-nowrap font-mono font-bold text-primary-900">
                          {record.type === 'inbound' ? '+' : '-'}{record.quantity}
                        </td>
                        <td className="py-3 px-6 whitespace-nowrap text-primary-700">{record.operator}</td>
                        <td className="py-3 px-6 text-primary-500 max-w-[200px] truncate" title={record.remark}>{record.remark}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-primary-400">
                          <History className="w-8 h-8 mx-auto mb-2 opacity-20" />
                          暂无出入库记录
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-primary-100 bg-primary-50/30 flex justify-end shrink-0">
                <button onClick={() => setIsHistoryModalOpen(false)} className="px-6 py-2 border border-primary-200 text-primary-700 rounded-lg hover:bg-white transition-colors font-medium text-sm">关闭</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
