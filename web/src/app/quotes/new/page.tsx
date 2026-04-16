"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Plus, Package, Edit2, Trash2, Save, Search, X, FileText, ChevronDown } from "lucide-react";
import MainLayout from "../../../components/MainLayout";
import CustomerInfo from "../../../components/CustomerInfo";

// 简单的材料库 Mock 数据，模拟从 materials 页面导入
const mockMaterials = [
  { id: "M-001", name: "马可波罗 连纹大板 800*800", type: "主材", unit: "片", price: 128 },
  { id: "M-002", name: "多乐士 净味全效 哑光墙面漆 15L", type: "主材", unit: "桶", price: 580 },
  { id: "M-003", name: "欧普 极简静音木门 烤漆版", type: "定制", unit: "樘", price: 1599 },
  { id: "M-004", name: "日丰 LED 极简吸顶灯", type: "软装", unit: "套", price: 299 },
  { id: "M-005", name: "水电基础改造套餐 (按平米)", type: "人工", unit: "m²", price: 88 },
  { id: "M-006", name: "顾家 意式极简真皮沙发", type: "软装", unit: "套", price: 4500 },
  { id: "M-007", name: "东方雨虹 抗菌PPR水管", type: "辅材", unit: "米", price: 12 },
  { id: "M-008", name: "索菲亚 定制衣柜 投影面积", type: "定制", unit: "m²", price: 899 },
  { id: "M-009", name: "老板 厨卫集成吊顶模块", type: "主材", unit: "m²", price: 120 },
  { id: "M-010", name: "公牛 轨道插座 1米", type: "辅材", unit: "根", price: 150 },
  { id: "M-011", name: "美的 嵌入式洗碗机", type: "家电", unit: "台", price: 3299 },
  { id: "M-012", name: "方太 抽油烟机灶具套装", type: "家电", unit: "套", price: 4599 },
];

interface QuoteItem {
  id: string;
  category: string;
  name: string;
  unit: string;
  price: number;
  quantity: number;
  isCustom: boolean;
}

function NewQuoteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId = searchParams.get("leadId");
  
  const [customer, setCustomer] = useState<any>(null);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  
  // 弹窗状态
  const [isStandardModalOpen, setIsStandardModalOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [itemToRemove, setItemToRemove] = useState<string | null>(null); // 新增：用于在弹窗中移除材料的二次确认状态
  const [customItem, setCustomItem] = useState({ name: "", unit: "项", price: 0, quantity: 1, category: "杂项" });
  
  // 材料大厅弹窗内的状态
  const [materialSearch, setMaterialSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("全部");
  const [materialsData, setMaterialsData] = useState<any[]>([]);

  useEffect(() => {
    if (leadId) {
      fetchLeadDetail(leadId);
    }
    fetchMaterials();
  }, [leadId]);

  const fetchMaterials = async () => {
    try {
      const res = await fetch('/api/materials');
      if (res.ok) {
        const data = await res.json();
        // 过滤出上架的材料
        const activeMaterials = data.filter((m: any) => m.status === 'active');
        setMaterialsData(activeMaterials);
      }
    } catch (e) {
      console.error('Failed to fetch materials', e);
    }
  };

  const fetchLeadDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/leads/${id}`);
      if (res.ok) {
        const lead = await res.json();
        setCustomer({
          id: lead._id,
          name: lead.name,
          phone: lead.phone,
          address: lead.address || "暂无地址",
          requirementType: lead.requirement || "整装",
          area: lead.area,
          budget: lead.budget || "未填写",
          sales: lead.sales || "未分配",
          designer: lead.designer || "未分配"
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 计算金额
  const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const finalAmount = Math.max(0, totalAmount - discount);

  // 添加标准材料
  const addStandardItem = (material: any) => {
    const newItem: QuoteItem = {
      id: material.id, // 使用物料本身的 ID 避免重复判断出错
      category: material.type,
      name: material.name,
      unit: material.unit,
      price: material.price,
      quantity: 1,
      isCustom: false,
    };
    setItems([...items, newItem]);
    // 移除 setIsStandardModalOpen(false); 以支持连续添加
  };

  const addCustomItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const newItem: QuoteItem = {
      id: Date.now().toString(),
      category: "杂项",
      name: customItem.name,
      unit: customItem.unit,
      price: Number(customItem.price),
      quantity: Number(customItem.quantity),
      isCustom: true
    };
    setItems([...items, newItem]);
    setIsCustomModalOpen(false);
    setCustomItem({ name: "", unit: "项", price: 0, quantity: 1, category: "杂项" });
  };

  const updateItemQuantity = (id: string, newQty: number) => {
    setItems(items.map(item => item.id === id ? { ...item, quantity: Math.max(1, newQty) } : item));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleSave = async () => {
    if (!customer) {
      alert("请先关联客户线索");
      return;
    }
    if (items.length === 0) {
      alert("请至少添加一项报价明细");
      return;
    }

    const userInfoStr = localStorage.getItem("userInfo");
    const userInfo = userInfoStr ? JSON.parse(userInfoStr) : { name: "未知人员" };

    const newQuote = {
      leadId: customer.id,
      customerNo: customer.customerNo || customer.id,
      customer: customer.name,
      phone: customer.phone,
      address: customer.address || "",
      sales: customer.sales || userInfo.name,
      designer: customer.designer || "未分配",
      total: totalAmount,
      discount: discount,
      final: finalAmount,
      status: "初步",
      items: items
    };

    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newQuote)
      });
      if (res.ok) {
        const now = new Date();
        const timeString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        setLastSavedTime(timeString);
        alert("报价单保存成功！");
        router.push('/quotes');
      } else {
        alert("保存失败");
      }
    } catch (e) {
      console.error(e);
      alert("保存出错");
    }
  };

  return (
    <MainLayout>
      <div className="p-8 max-w-[1200px] mx-auto space-y-8 pb-32">
        {/* 顶部面包屑与标题 */}
        <div>
          <button 
            onClick={() => router.back()}
            className="flex items-center text-sm font-medium text-primary-600 hover:text-primary-900 mb-4 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            返回上一页
          </button>
          <h1 className="text-3xl font-bold tracking-tight text-primary-900">新建报价单</h1>
          <p className="text-primary-600 mt-2">支持从材料库拉取标准物料，或添加手写非标项目</p>
        </div>

        {/* 客户信息卡片 */}
        <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-primary-900 mb-4 flex items-center">
            <span className="w-1.5 h-4 bg-primary-900 mr-2 rounded-sm inline-block"></span>
            客户基础信息
          </h2>
          {customer ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="col-span-2 md:col-span-4 mb-2">
                <CustomerInfo 
                  name={customer.name}
                  phone={customer.phone}
                  customerNo={customer.customerNo || customer.id}
                />
              </div>
              <div>
                <p className="text-xs text-primary-400 mb-1">房屋信息</p>
                <p className="text-sm font-medium text-primary-900">{customer.address || "暂无地址"} · {customer.requirementType} · {customer.area ? `${customer.area}m²` : "面积未知"}</p>
              </div>
              <div>
                <p className="text-xs text-primary-400 mb-1">意向预算</p>
                <p className="text-sm font-medium text-primary-900">{customer.budget || "未填写"}</p>
              </div>
              <div>
                <p className="text-xs text-primary-400 mb-1">销售负责</p>
                <p className="text-sm font-medium text-primary-900">{customer.sales || "未分配"}</p>
              </div>
              <div>
                <p className="text-xs text-primary-400 mb-1">主案设计</p>
                <p className="text-sm font-medium text-primary-900">{customer.designer || "未分配"}</p>
              </div>
            </div>
          ) : (
            <div className="text-sm text-primary-500 italic">未关联客户线索，保存后可手动关联</div>
          )}
        </div>

        {/* 报价明细区域 */}
        <div className="bg-white rounded-xl border border-primary-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-primary-100 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-lg font-bold text-primary-900 flex items-center">
              <span className="w-1.5 h-4 bg-primary-900 mr-2 rounded-sm inline-block"></span>
              报价明细表
            </h2>
            <div className="flex space-x-3 w-full sm:w-auto">
              <button 
                onClick={() => setIsCustomModalOpen(true)}
                className="flex flex-1 sm:flex-none items-center justify-center px-4 py-2 bg-white border border-primary-200 text-primary-900 rounded-lg hover:bg-primary-50 transition-colors text-sm font-medium"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                添加手写项目
              </button>
              <button 
                onClick={() => setIsStandardModalOpen(true)}
                className="flex flex-1 sm:flex-none items-center justify-center px-4 py-2 bg-primary-50 text-primary-900 rounded-lg hover:bg-primary-100 transition-colors text-sm font-medium"
              >
                <Package className="w-4 h-4 mr-2" />
                从材料库引用
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-primary-50/30 border-b border-primary-100 text-primary-600 text-xs">
                  <th className="py-3 px-6 font-medium w-16">序号</th>
                  <th className="py-3 px-6 font-medium">项目名称</th>
                  <th className="py-3 px-6 font-medium w-24">类型</th>
                  <th className="py-3 px-6 font-medium w-24">单位</th>
                  <th className="py-3 px-6 font-medium w-32 text-right">单价 (元)</th>
                  <th className="py-3 px-6 font-medium w-32 text-center">数量</th>
                  <th className="py-3 px-6 font-medium w-32 text-right">小计 (元)</th>
                  <th className="py-3 px-6 font-medium w-20 text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-100 text-sm">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-primary-400">
                      <div className="flex flex-col items-center">
                        <FileText className="w-8 h-8 mb-2 opacity-20" />
                        <p>暂无报价项目，请点击上方按钮添加</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  ["人工", "主材", "辅材", "定制", "软装", "家电", "杂项"].map(category => {
                    const categoryItems = items.filter(item => item.category === category);
                    if (categoryItems.length === 0) return null;
                    return (
                      <React.Fragment key={category}>
                        <tr className="bg-primary-50/50">
                          <td colSpan={8} className="py-2.5 px-6 font-bold text-primary-900 border-y border-primary-100">
                            {category}
                          </td>
                        </tr>
                        {categoryItems.map((item, index) => (
                          <tr key={item.id} className="hover:bg-primary-50/30 transition-colors">
                            <td className="py-4 px-6 text-primary-500 font-mono text-xs">{index + 1}</td>
                            <td className="py-4 px-6 font-medium text-primary-900">
                              {item.name}
                              {item.isCustom && <span className="ml-2 text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-100">手写</span>}
                            </td>
                            <td className="py-4 px-6">
                              <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-primary-100 text-primary-700">
                                {item.category}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-primary-600">{item.unit}</td>
                            <td className="py-4 px-6 text-right font-mono text-primary-900">¥{item.price.toFixed(2)}</td>
                            <td className="py-4 px-6 text-center">
                              <input 
                                type="number" 
                                min="1" 
                                value={item.quantity}
                                onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 1)}
                                className="w-16 text-center py-1 border border-primary-200 rounded focus:outline-none focus:border-primary-500 font-mono"
                              />
                            </td>
                            <td className="py-4 px-6 text-right font-mono font-bold text-primary-900">¥{(item.price * item.quantity).toFixed(2)}</td>
                            <td className="py-4 px-6 text-center">
                              <button onClick={() => setItemToRemove(item.id)} className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 费用汇总卡片 */}
        <div className="bg-primary-900 rounded-xl shadow-lg p-6 sm:p-8 text-white flex flex-col sm:flex-row justify-between items-center sm:items-end gap-6">
          <div className="space-y-2 w-full sm:w-auto">
            <div className="flex justify-between sm:justify-start gap-8 text-primary-200 text-sm">
              <span>项目总金额：</span>
              <span className="font-mono">¥{totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between sm:justify-start gap-8 items-center text-primary-200 text-sm">
              <span>优惠金额：</span>
              <div className="flex items-center">
                <span className="mr-1">¥</span>
                <input 
                  type="number" 
                  min="0"
                  value={discount || ""}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="w-24 bg-primary-800 border border-primary-700 rounded px-2 py-1 text-white focus:outline-none focus:border-primary-500 font-mono"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
          <div className="text-right w-full sm:w-auto border-t border-primary-800 sm:border-0 pt-4 sm:pt-0">
            <p className="text-primary-300 text-sm mb-1">最终成交价</p>
            <p className="text-4xl font-bold font-mono tracking-tight text-amber-400">
              <span className="text-2xl mr-1">¥</span>
              {finalAmount.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* 底部固定操作栏 */}
      <div className="fixed bottom-0 left-0 md:left-64 right-0 bg-white border-t border-primary-100 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-30">
        <div className="max-w-[1200px] mx-auto flex justify-between items-center gap-4">
          <div className="text-sm text-primary-500 font-medium">
            {lastSavedTime ? (
              <span className="flex items-center text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
                已保存，更新时间：{lastSavedTime}
              </span>
            ) : (
              <span className="text-primary-400">尚未保存修改</span>
            )}
          </div>
          <div className="flex gap-4">
            <button onClick={() => router.back()} className="px-6 py-2.5 border border-primary-200 text-primary-700 rounded-lg hover:bg-primary-50 transition-colors font-medium">
              取消
            </button>
            <button onClick={handleSave} className="flex items-center px-8 py-2.5 bg-primary-900 text-white rounded-lg hover:bg-primary-800 transition-colors shadow-sm font-medium">
              <Save className="w-5 h-5 mr-2" />
              保存并生成报价单
            </button>
          </div>
        </div>
      </div>

      {/* 弹窗：从材料库导入 */}
      {isStandardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl flex flex-col h-[600px] animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-6 border-b border-primary-100 shrink-0">
              <h2 className="text-xl font-bold text-primary-900 flex items-center">
                <Package className="w-5 h-5 mr-2 text-primary-600" />
                从材料库导入
              </h2>
              <button onClick={() => setIsStandardModalOpen(false)} className="text-primary-400 hover:text-primary-900 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 border-b border-primary-100 flex flex-col sm:flex-row gap-4 shrink-0 bg-primary-50/50">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-500" />
                <input 
                  type="text" 
                  placeholder="搜索材料名称 / 编号..." 
                  value={materialSearch}
                  onChange={(e) => setMaterialSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-primary-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-900 outline-none bg-white"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto hide-scrollbar items-center">
                {["全部", "主材", "辅材", "软装", "定制", "家电", "人工"].map(cat => (
                  <button 
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeCategory === cat ? 'bg-primary-900 text-white' : 'bg-white border border-primary-200 text-primary-700 hover:bg-primary-50'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {materialsData
                  .filter(m => (activeCategory === "全部" || m.category === activeCategory) && ((m.name || '').includes(materialSearch) || (m.sku || '').includes(materialSearch)))
                  .map(material => (
                  <div key={material.id} className="flex flex-col justify-between p-4 border border-primary-100 rounded-xl hover:bg-primary-50 transition-colors group bg-white">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium px-2 py-0.5 bg-primary-100 text-primary-700 rounded">{material.category}</span>
                        <span className="text-xs text-primary-400 font-mono">{material.sku || '无型号'}</span>
                      </div>
                      <p className="text-sm font-bold text-primary-900 leading-snug">{material.name}</p>
                    </div>
                    <div className="flex items-end justify-between mt-4">
                      <p className="text-sm font-bold text-primary-900 font-mono">¥{(material.price || 0).toLocaleString()} <span className="text-xs text-primary-500 font-sans font-normal">/ {material.unit}</span></p>
                      {items.some(i => i.id === material.id) ? (
                        <button 
                          disabled
                          className="px-3 py-1.5 bg-primary-900 text-white text-xs font-medium rounded cursor-not-allowed shadow-sm"
                        >
                          已添加
                        </button>
                      ) : (
                        <button 
                          onClick={() => addStandardItem({ id: material.id, type: material.category, name: material.name, unit: material.unit, price: material.price })}
                          className="px-3 py-1.5 bg-primary-100 text-primary-700 text-xs font-medium rounded hover:bg-primary-900 hover:text-white transition-colors"
                        >
                          添加
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {materialsData.filter(m => (activeCategory === "全部" || m.category === activeCategory) && ((m.name || '').includes(materialSearch) || (m.sku || '').includes(materialSearch))).length === 0 && (
                  <div className="col-span-1 sm:col-span-2 py-12 text-center text-primary-500 text-sm">
                    没有找到匹配的材料
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 弹窗：添加手写项目 */}
      {isCustomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-6 border-b border-primary-100">
              <h2 className="text-xl font-bold text-primary-900">添加手写项目</h2>
              <button onClick={() => setIsCustomModalOpen(false)} className="text-primary-400 hover:text-primary-900 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); addCustomItem(); }} className="p-6 space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-primary-900 mb-1">所属分类 <span className="text-rose-500">*</span></label>
                <div 
                  onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                  className="w-full px-4 py-2 bg-primary-50 border border-transparent rounded-lg focus:border-primary-300 focus:bg-white focus:ring-2 focus:ring-primary-100 transition-all cursor-pointer flex justify-between items-center"
                >
                  <span className="text-primary-900">{customItem.category}</span>
                  <ChevronDown className="w-4 h-4 text-primary-500" />
                </div>
                {isCategoryDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsCategoryDropdownOpen(false)} />
                    <div className="absolute top-[64px] left-0 w-full bg-white border border-primary-100 rounded-lg shadow-lg overflow-hidden z-20 animate-in fade-in slide-in-from-top-2 duration-150 max-h-48 overflow-y-auto">
                      {["主材", "辅材", "定制", "软装", "家电", "人工", "杂项"].map(cat => (
                        <div 
                          key={cat}
                          onClick={() => {
                            setCustomItem({...customItem, category: cat});
                            setIsCategoryDropdownOpen(false);
                          }}
                          className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${customItem.category === cat ? 'bg-primary-900 text-white' : 'text-primary-700 hover:bg-primary-50'}`}
                        >
                          {cat}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-primary-900 mb-1">项目名称 <span className="text-rose-500">*</span></label>
                <input required type="text" value={customItem.name} onChange={e => setCustomItem({...customItem, name: e.target.value})} className="w-full px-4 py-2 bg-primary-50 border border-transparent rounded-lg focus:border-primary-300 focus:bg-white focus:ring-2 focus:ring-primary-100 transition-all outline-none" placeholder="例如：垃圾清运费" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-primary-900 mb-1">单位</label>
                  <input required type="text" value={customItem.unit} onChange={e => setCustomItem({...customItem, unit: e.target.value})} className="w-full px-4 py-2 bg-primary-50 border border-transparent rounded-lg focus:border-primary-300 focus:bg-white focus:ring-2 focus:ring-primary-100 transition-all outline-none" placeholder="例如：项" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-primary-900 mb-1">单价 (元) <span className="text-rose-500">*</span></label>
                  <input required type="number" min="0" step="0.01" value={customItem.price || ""} onChange={e => setCustomItem({...customItem, price: Number(e.target.value)})} className="w-full px-4 py-2 bg-primary-50 border border-transparent rounded-lg focus:border-primary-300 focus:bg-white focus:ring-2 focus:ring-primary-100 transition-all outline-none font-mono" placeholder="0.00" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-primary-900 mb-1">数量</label>
                <input required type="number" min="1" value={customItem.quantity} onChange={e => setCustomItem({...customItem, quantity: Number(e.target.value)})} className="w-full px-4 py-2 bg-primary-50 border border-transparent rounded-lg focus:border-primary-300 focus:bg-white focus:ring-2 focus:ring-primary-100 transition-all outline-none font-mono" />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsCustomModalOpen(false)} className="flex-1 px-4 py-2.5 border border-primary-200 text-primary-700 rounded-lg hover:bg-primary-50 transition-colors font-medium">取消</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-primary-900 text-white rounded-lg hover:bg-primary-800 transition-colors shadow-sm font-medium">确定添加</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* 删除/取消添加确认弹窗 */}
      {itemToRemove && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-primary-900 mb-2">确定要移除该项吗？</h3>
            <p className="text-primary-600 text-sm mb-6">此操作将把该项目从报价单中移除，如果需要可重新添加。</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setItemToRemove(null)}
                className="flex-1 px-4 py-2.5 border border-primary-200 text-primary-700 rounded-lg hover:bg-primary-50 transition-colors font-medium text-sm"
              >
                取消
              </button>
              <button 
                onClick={() => {
                  removeItem(itemToRemove);
                  setItemToRemove(null);
                }}
                className="flex-1 px-4 py-2.5 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors shadow-sm font-medium text-sm"
              >
                确定移除
              </button>
            </div>
          </div>
        </div>
      )}

    </MainLayout>
  );
}

export default function NewQuotePage() {
  return (
    <Suspense fallback={
      <MainLayout>
        <div className="p-8 max-w-[1200px] mx-auto flex items-center justify-center h-64">
          <div className="text-primary-600">加载中...</div>
        </div>
      </MainLayout>
    }>
      <NewQuoteContent />
    </Suspense>
  );
}
