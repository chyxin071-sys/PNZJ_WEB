"use client";

import { useState, useEffect } from "react";
import { Search, Plus, Package, Filter, MoreHorizontal, CheckCircle2, XCircle, Grid, Zap, Layers, Home, Monitor, UserCheck, LayoutTemplate, ArrowDownToLine, ArrowUpFromLine, History, ChevronDown } from "lucide-react";
import leadsData from "../../../mock_data/leads.json";

// 定义库存记录类型
export interface StockHistory {
  id: string;
  productId: string;
  type: 'inbound' | 'outbound';
  quantity: number;
  date: string;
  operator: string;
  remark: string;
  customer?: string; // 新增关联客户字段
}

// 模拟数据 - 库存管理
const generateMockProducts = () => {
  const categories = ["主材", "辅材", "软装", "家电", "人工", "套餐"];
  const brands = ["马可波罗", "立邦", "顾家", "美的", "东鹏", "欧派", "索菲亚", "海尔", "格力", "老板", "方太", "科勒", "九牧", "箭牌", "公牛", "西门子", "施耐德", "欧普", "雷士", "品诺筑家"];
  
  const baseProducts = [
    { id: "1", name: "马可波罗 亚金石 800x800", brand: "马可波罗", category: "主材", sku: "MK-001", unit: "平方米", price: 128.00, stock: 500, status: "active" },
    { id: "2", name: "立邦 净味抗甲醛5合1", brand: "立邦", category: "辅材", sku: "NP-002", unit: "桶", price: 450.00, stock: 120, status: "active" },
    { id: "3", name: "顾家 意式极简真皮沙发", brand: "顾家", category: "软装", sku: "GJ-S01", unit: "套", price: 8999.00, stock: 15, status: "active" },
    { id: "4", name: "美的 1.5匹新风空调", brand: "美的", category: "家电", sku: "MD-AC15", unit: "台", price: 3299.00, stock: 40, status: "active" },
    { id: "5", name: "标准拆除工人人工费", brand: "-", category: "人工", sku: "LB-001", unit: "平方米", price: 45.00, stock: 999, status: "active" },
    { id: "6", name: "39800 极简装整装套餐", brand: "品诺筑家", category: "套餐", sku: "PKG-398", unit: "套", price: 39800.00, stock: 999, status: "active" },
    { id: "7", name: "东鹏 玉岛白 600x1200", brand: "东鹏", category: "主材", sku: "DP-005", unit: "平方米", price: 158.00, stock: 0, status: "inactive" },
  ];

  const generated = [...baseProducts];
  for (let i = 8; i <= 35; i++) {
    const cat = categories[Math.floor(Math.random() * categories.length)];
    const brand = cat === "人工" ? "-" : brands[Math.floor(Math.random() * brands.length)];
    const price = cat === "人工" ? Math.floor(Math.random() * 200 + 50) : cat === "套餐" ? Math.floor(Math.random() * 50000 + 30000) : Math.floor(Math.random() * 4000 + 100);
    const unit = cat === "主材" || cat === "人工" ? "平方米" : cat === "辅材" ? "桶" : "套";
    generated.push({
      id: i.toString(),
      name: `${brand} ${cat === "人工" ? "标准施工费" : cat === "套餐" ? "精装全包" : "高级款"} ${i}`,
      brand: brand,
      category: cat,
      sku: `型号-${i.toString().padStart(3, '0')}`,
      unit: unit,
      price: price,
      stock: Math.floor(Math.random() * 500),
      status: Math.random() > 0.8 ? "inactive" : "active"
    });
  }
  return generated;
};

const mockProducts = generateMockProducts();

// 生成虚拟库存记录数据
const generateMockStockHistory = () => {
  const history: StockHistory[] = [];
  const signedCustomers = leadsData.filter(l => l.status === '已签单');
  
  mockProducts.forEach(product => {
    // 随机为某些产品生成 1-3 条出入库记录
    if (Math.random() > 0.3) {
      const recordCount = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < recordCount; i++) {
        const isOutbound = Math.random() > 0.5;
        const customer = isOutbound && signedCustomers.length > 0 
          ? signedCustomers[Math.floor(Math.random() * signedCustomers.length)].name 
          : undefined;
          
        history.push({
          id: `hist-${product.id}-${i}`,
          productId: product.id,
          type: isOutbound ? 'outbound' : 'inbound',
          quantity: Math.floor(Math.random() * 50) + 1,
          date: `2024-05-${Math.floor(Math.random() * 20 + 1).toString().padStart(2, '0')} 14:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
          operator: '蒋老板',
          remark: isOutbound 
            ? (customer ? `发货至 ${customer} 家工地` : '常规出库')
            : '常规采购入库',
          customer: customer
        });
      }
    }
  });
  
  // 按时间倒序排序
  return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

const mockStockHistory = generateMockStockHistory();

const categories = ["全部", "主材", "辅材", "软装", "家电", "人工", "套餐"];

import MainLayout from "../../components/MainLayout";

export default function MaterialsPage() {
  const [activeCategory, setActiveCategory] = useState("全部");
  const [searchQuery, setSearchQuery] = useState("");
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [productToConfirm, setProductToConfirm] = useState<{id: string, action: '下架' | '上架' | '删除'} | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const [products, setProducts] = useState(mockProducts);
  const [stockHistory, setStockHistory] = useState<StockHistory[]>(mockStockHistory);
  
  // 库存管理相关 states
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockActionType, setStockActionType] = useState<'inbound' | 'outbound'>('inbound');
  const [stockProduct, setStockProduct] = useState<any>(null);
  const [stockAmount, setStockAmount] = useState<string>('');
  const [stockRemark, setStockRemark] = useState<string>('');
  const [stockCustomer, setStockCustomer] = useState<string>(''); // 新增：出库关联客户
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false); // 新增：关联客户下拉菜单状态
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false); // 新增：新增/编辑产品时的分类下拉菜单状态
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false); // 新增：全局状态筛选下拉菜单状态

  // 状态筛选器 state
  const [activeStatus, setActiveStatus] = useState<string>("全部"); // 新增状态筛选器

  // 历史记录相关 states
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<any>(null);

  useEffect(() => {
    if (isEditModalOpen || isStockModalOpen || isHistoryModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isEditModalOpen, isStockModalOpen, isHistoryModalOpen]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "主材": return <Grid className="w-5 h-5" />;
      case "辅材": return <Layers className="w-5 h-5" />;
      case "软装": return <Home className="w-5 h-5" />;
      case "家电": return <Monitor className="w-5 h-5" />;
      case "人工": return <UserCheck className="w-5 h-5" />;
      case "套餐": return <LayoutTemplate className="w-5 h-5" />;
      default: return <Package className="w-5 h-5" />;
    }
  };

  const executeProductAction = () => {
    if (!productToConfirm) return;
    const { id, action } = productToConfirm;
    
    if (action === '删除') {
      setProducts(products.filter(p => p.id !== id));
    } else {
      setProducts(products.map(p => {
        if (p.id === id) {
          return { ...p, status: action === '下架' ? 'inactive' : 'active' };
        }
        return p;
      }));
    }
    setProductToConfirm(null);
  };
  const handleStockAction = () => {
    if (!stockProduct || !stockAmount || isNaN(Number(stockAmount)) || Number(stockAmount) <= 0) return;
    const amount = Number(stockAmount);

    if (stockActionType === 'outbound' && amount > stockProduct.stock) {
      alert("出库数量不能大于当前库存");
      return;
    }

    // 更新库存数量
    setProducts(products.map(p => {
      if (p.id === stockProduct.id) {
        return { 
          ...p, 
          stock: stockActionType === 'inbound' ? p.stock + amount : p.stock - amount 
        };
      }
      return p;
    }));

    // 记录历史
    const newHistory: StockHistory = {
      id: Date.now().toString(),
      productId: stockProduct.id,
      type: stockActionType,
      quantity: amount,
      date: new Date().toLocaleString('zh-CN'),
      operator: '蒋老板',
      remark: stockRemark || (stockActionType === 'inbound' ? '常规入库' : (stockCustomer ? `发货至 ${stockCustomer} 家工地` : '常规出库')),
      customer: stockActionType === 'outbound' ? stockCustomer : undefined
    };
    
    setStockHistory([newHistory, ...stockHistory]);
    
    // 重置状态
    setIsStockModalOpen(false);
    setStockProduct(null);
    setStockAmount('');
    setStockRemark('');
    setStockCustomer('');
    setIsCustomerDropdownOpen(false);
  };

  // Hydration mismatch fix
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <MainLayout><div className="p-8 text-primary-600">加载中...</div></MainLayout>;
  }

  const filteredProducts = products.filter(p => {
    const matchCategory = activeCategory === "全部" || p.category === activeCategory;
    const matchSearch = p.name.includes(searchQuery) || p.brand.includes(searchQuery) || p.sku.includes(searchQuery);
    const matchStatus = activeStatus === "全部" || 
                        (activeStatus === "上架" && p.status === "active") || 
                        (activeStatus === "下架" && p.status === "inactive");
    return matchCategory && matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <MainLayout>
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-4 md:space-y-8">
      {/* 顶部标题区 */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-primary-900">库存管理</h1>
          <p className="text-primary-600 mt-2">公司标准化物料与套餐库，支持出入库记录与库存动态管理</p>
        </div>
        <button 
          onClick={() => {
            setEditingProduct({
              name: "", brand: "", category: "主材", sku: "", unit: "", price: "", stock: ""
            });
            setIsEditModalOpen(true);
          }}
          className="flex items-center justify-center min-h-[44px] px-4 py-2.5 bg-primary-900 text-white rounded-lg hover:bg-primary-800 transition-colors shadow-sm font-medium w-full sm:w-auto"
        >
          <Plus className="w-5 h-5 mr-2" />
          新增产品
        </button>
      </div>

      {/* 筛选与搜索 - 融合风格 */}
      <div className="bg-white p-5 rounded-xl border border-primary-100 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
        {/* 分类标签 */}
        <div className="flex space-x-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 hide-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`min-h-[44px] px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeCategory === cat ? "bg-primary-900 text-white shadow-md" : "bg-primary-50 text-primary-600 hover:bg-primary-100"}`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 w-full sm:w-auto">
          {/* 自定义状态筛选器 UI */}
          <div className="relative">
            <button 
              onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
              className="min-h-[44px] min-w-[120px] px-4 py-2.5 bg-primary-50 hover:bg-primary-100 border-none rounded-lg text-sm font-medium text-primary-900 transition-colors flex items-center justify-between"
            >
              {activeStatus === "全部" ? "全部状态" : activeStatus === "上架" ? "已上架" : "已下架"}
              <ChevronDown className="w-4 h-4 ml-2 text-primary-600" />
            </button>
            {isStatusDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsStatusDropdownOpen(false)} />
                <div className="absolute left-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-primary-100 py-1 z-20 overflow-hidden">
                  <button
                    onClick={() => {
                      setActiveStatus("全部");
                      setIsStatusDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-primary-50 transition-colors ${activeStatus === "全部" ? 'text-primary-900 bg-primary-50/50' : 'text-primary-600'}`}
                  >
                    全部状态
                  </button>
                  <button
                    onClick={() => {
                      setActiveStatus("上架");
                      setIsStatusDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-primary-50 transition-colors ${activeStatus === "上架" ? 'text-primary-900 bg-primary-50/50' : 'text-primary-600'}`}
                  >
                    已上架
                  </button>
                  <button
                    onClick={() => {
                      setActiveStatus("下架");
                      setIsStatusDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-primary-50 transition-colors ${activeStatus === "下架" ? 'text-primary-900 bg-primary-50/50' : 'text-primary-600'}`}
                  >
                    已下架
                  </button>
                </div>
              </>
            )}
          </div>

          {/* 搜索框 */}
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-600" />
            <input
              type="text"
              placeholder="搜索名称 / 品牌 / 型号..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full min-h-[44px] pl-9 pr-4 py-2.5 bg-primary-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary-900 focus:bg-white transition-all outline-none text-primary-900 placeholder:text-primary-600/60"
            />
          </div>
        </div>
      </div>

      {/* 数据表格 - 极简高级感的清爽表格 */}
      <div className="bg-white rounded-xl border border-primary-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-primary-50/50 border-b border-primary-100 text-primary-600 text-sm">
                <th className="py-4 px-6 font-medium whitespace-nowrap">产品信息</th>
                <th className="py-4 px-6 font-medium whitespace-nowrap">品牌</th>
                <th className="py-4 px-6 font-medium whitespace-nowrap">分类</th>
                <th className="py-4 px-6 font-medium whitespace-nowrap">型号</th>
                <th className="py-4 px-6 font-medium whitespace-nowrap">单价</th>
                <th className="py-4 px-6 font-medium whitespace-nowrap">库存数量</th>
                <th className="py-4 px-6 font-medium whitespace-nowrap">状态</th>
                <th className="py-4 px-6 font-medium text-center whitespace-nowrap w-24">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-100 text-sm">
              {paginatedProducts.map((product) => (
                <tr key={product.id} className="hover:bg-primary-50/30 transition-colors group">
                  <td className="py-4 px-6 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center mr-3 border border-primary-100 text-primary-600 group-hover:bg-white transition-colors">
                        {getCategoryIcon(product.category)}
                      </div>
                      <span className="font-medium text-primary-900">{product.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 whitespace-nowrap">
                    <span className="text-sm text-primary-900">{product.brand}</span>
                  </td>
                  <td className="py-4 px-6 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-primary-50 text-primary-700 border border-primary-100">
                      {product.category}
                    </span>
                  </td>
                  <td className="py-4 px-6 whitespace-nowrap">
                    <span className="text-sm font-mono text-primary-600">{product.sku}</span>
                  </td>
                  <td className="py-4 px-6 whitespace-nowrap">
                    <span className="text-sm font-mono font-medium text-primary-900">¥{product.price.toFixed(2)} / {product.unit}</span>
                  </td>
                  <td className="py-4 px-6 whitespace-nowrap">
                    <span className={`text-sm font-mono font-bold px-2 py-1 rounded-md ${
                      product.stock === 0 ? 'bg-rose-50 text-rose-600' :
                      product.stock < 20 ? 'bg-amber-50 text-amber-600' : 'bg-primary-50 text-primary-900'
                    }`}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="py-4 px-6 whitespace-nowrap">
                    {product.status === "active" ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        已上架
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-rose-50 text-rose-700 border border-rose-100">
                        <XCircle className="w-3.5 h-3.5 mr-1" />
                        已下架
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 whitespace-nowrap text-center">
                    <div className="relative inline-block text-left">
                      <div className="flex items-center justify-center">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdownId(openDropdownId === product.id ? null : product.id);
                          }}
                          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-primary-600 hover:text-primary-900 hover:bg-primary-50 rounded-lg transition-colors"
                        >
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                      </div>
                      
                      {openDropdownId === product.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setOpenDropdownId(null)} />
                          <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-primary-100 rounded-lg shadow-lg overflow-hidden z-20 animate-in fade-in slide-in-from-top-2 duration-150">
                            <div className="py-1">
                              <div 
                                onClick={() => {
                                  setOpenDropdownId(null);
                                  setStockProduct(product);
                                  setStockActionType('inbound');
                                  setIsStockModalOpen(true);
                                }}
                                className="px-4 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 cursor-pointer transition-colors text-left flex items-center"
                              >
                                <ArrowDownToLine className="w-4 h-4 mr-2" /> 入库操作
                              </div>
                              <div 
                                onClick={() => {
                                  setOpenDropdownId(null);
                                  setStockProduct(product);
                                  setStockActionType('outbound');
                                  setIsStockModalOpen(true);
                                }}
                                className="px-4 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-50 cursor-pointer transition-colors text-left flex items-center"
                              >
                                <ArrowUpFromLine className="w-4 h-4 mr-2" /> 出库操作
                              </div>
                              <div 
                                onClick={() => {
                                  setOpenDropdownId(null);
                                  setHistoryProduct(product);
                                  setIsHistoryModalOpen(true);
                                }}
                                className="px-4 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-50 cursor-pointer transition-colors text-left flex items-center"
                              >
                                <History className="w-4 h-4 mr-2" /> 库存明细
                              </div>
                              <div className="h-px bg-primary-100 my-1"></div>
                              <div 
                                onClick={() => {
                                  setOpenDropdownId(null);
                                  setEditingProduct(product);
                                  setIsEditModalOpen(true);
                                }}
                                className="px-4 py-2.5 text-sm font-medium text-primary-700 hover:bg-primary-50 cursor-pointer transition-colors text-left"
                              >
                                编辑详情
                              </div>
                              <div 
                                onClick={() => {
                                  setOpenDropdownId(null);
                                  setProductToConfirm({ id: product.id, action: product.status === "active" ? "下架" : "上架" });
                                }}
                                className="px-4 py-2.5 text-sm font-medium text-amber-600 hover:bg-amber-50 cursor-pointer transition-colors text-left"
                              >
                                {product.status === "active" ? "下架产品" : "重新上架"}
                              </div>
                              <div className="h-px bg-primary-100 my-1"></div>
                              <div 
                                onClick={() => {
                                  setOpenDropdownId(null);
                                  setProductToConfirm({ id: product.id, action: "删除" });
                                }}
                                className="px-4 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors text-left"
                              >
                                删除产品
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              
              {paginatedProducts.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-primary-600">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>没有找到符合条件的产品</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* 分页组件 */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-primary-100 bg-primary-50/30 flex items-center justify-between">
            <div className="text-sm text-primary-600">
              共 <span className="font-medium text-primary-900">{filteredProducts.length}</span> 条记录，当前第 <span className="font-medium text-primary-900">{currentPage}/{totalPages}</span> 页
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-md border border-primary-200 text-sm font-medium text-primary-700 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                上一页
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-md border border-primary-200 text-sm font-medium text-primary-700 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 出入库管理弹窗 */}
      {isStockModalOpen && stockProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-primary-100 bg-primary-50/50">
              <h2 className="text-xl font-bold text-primary-900 flex items-center">
                {stockActionType === 'inbound' ? <ArrowDownToLine className="w-5 h-5 mr-2 text-emerald-600" /> : <ArrowUpFromLine className="w-5 h-5 mr-2 text-amber-600" />}
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
                  <span>当前库存: <span className="font-mono font-bold text-primary-900">{stockProduct.stock}</span> {stockProduct.unit}</span>
                  <span>型号: {stockProduct.sku}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary-900 mb-1">
                  {stockActionType === 'inbound' ? '入库数量' : '出库数量'} *
                </label>
                <div className="relative">
                  <input 
                    type="number" 
                    min="1"
                    value={stockAmount} 
                    onChange={e => setStockAmount(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-primary-200 rounded-lg focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all outline-none font-mono text-lg" 
                    placeholder="请输入数量"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-primary-400 text-sm">
                    {stockProduct.unit}
                  </span>
                </div>
              </div>

              {stockActionType === 'outbound' && (
                <div>
                  <label className="block text-sm font-medium text-primary-900 mb-1">关联客户 (选填)</label>
                  <div className="relative">
                    <div 
                      onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                      className="w-full px-4 py-2.5 bg-white border border-primary-200 rounded-lg hover:border-primary-300 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all flex items-center justify-between cursor-pointer text-sm"
                    >
                      <span className={stockCustomer ? "text-primary-900 font-medium" : "text-primary-500"}>
                        {stockCustomer ? stockCustomer : "不关联具体客户"}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-primary-400 transition-transform ${isCustomerDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>
                    
                    {isCustomerDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsCustomerDropdownOpen(false)} />
                        <div className="absolute z-20 w-full mt-1 bg-white border border-primary-100 rounded-lg shadow-lg max-h-60 overflow-y-auto py-1 custom-scrollbar">
                          <div 
                            onClick={() => { setStockCustomer(''); setIsCustomerDropdownOpen(false); }}
                            className="px-4 py-2.5 text-sm text-primary-700 hover:bg-primary-50 cursor-pointer transition-colors"
                          >
                            不关联具体客户
                          </div>
                          {leadsData.filter(l => l.status === '已签单').map(lead => (
                            <div 
                              key={lead.id}
                              onClick={() => { setStockCustomer(lead.name); setIsCustomerDropdownOpen(false); }}
                              className="px-4 py-2.5 text-sm text-primary-900 hover:bg-primary-50 cursor-pointer transition-colors flex items-center justify-between group"
                            >
                              <span>{lead.name}</span>
                              <span className="text-primary-400 text-xs font-mono group-hover:text-primary-600 transition-colors">{lead.id}</span>
                            </div>
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
                  placeholder={stockActionType === 'inbound' ? '如：新采购批次、退货入库等' : '如：用于马女士家工地施工、破损报废等'}
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-primary-100 bg-primary-50/30 flex gap-3">
              <button 
                onClick={() => setIsStockModalOpen(false)}
                className="flex-1 px-4 py-2.5 border border-primary-200 text-primary-700 rounded-lg hover:bg-primary-50 transition-colors font-medium"
              >
                取消
              </button>
              <button 
                onClick={handleStockAction}
                disabled={!stockAmount || Number(stockAmount) <= 0 || (stockActionType === 'outbound' && Number(stockAmount) > stockProduct.stock)}
                className={`flex-1 px-4 py-2.5 text-white rounded-lg transition-colors shadow-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                  stockActionType === 'inbound' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                确认{stockActionType === 'inbound' ? '入库' : '出库'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 库存明细记录弹窗 */}
      {isHistoryModalOpen && historyProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 max-h-[80vh]">
            <div className="flex justify-between items-center p-6 border-b border-primary-100 bg-primary-50/50 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-primary-900 flex items-center">
                  <History className="w-5 h-5 mr-2 text-blue-600" /> 库存明细记录
                </h2>
                <p className="text-sm text-primary-600 mt-1">{historyProduct.name} (型号: {historyProduct.sku})</p>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-primary-400 hover:text-primary-600 transition-colors">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-0">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white border-b border-primary-100 z-10 shadow-sm">
                  <tr className="text-primary-600 text-xs uppercase tracking-wider">
                    <th className="py-3 px-6 font-medium">操作时间</th>
                    <th className="py-3 px-6 font-medium">类型</th>
                    <th className="py-3 px-6 font-medium">数量</th>
                    <th className="py-3 px-6 font-medium">操作人</th>
                    <th className="py-3 px-6 font-medium">备注</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary-50 text-sm">
                  {stockHistory.filter(h => h.productId === historyProduct.id).length > 0 ? (
                    stockHistory.filter(h => h.productId === historyProduct.id).map(record => (
                      <tr key={record.id} className="hover:bg-primary-50/30 transition-colors">
                        <td className="py-3 px-6 text-primary-600 whitespace-nowrap">{record.date}</td>
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
                    ))
                  ) : (
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
              <button 
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-6 py-2 border border-primary-200 text-primary-700 rounded-lg hover:bg-white transition-colors font-medium text-sm shadow-sm"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
      {/* 确认操作弹窗 */}
      {productToConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-primary-900 mb-2">
              确定要{productToConfirm.action}该产品吗？
            </h3>
            <p className="text-primary-600 text-sm mb-6">
              {productToConfirm.action === '删除' 
                ? "此操作不可恢复，删除后将无法找回该产品数据。"
                : `产品${productToConfirm.action}后，${productToConfirm.action === '下架' ? '将不会' : '将会重新'}出现在报价单的可用材料库中。`}
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setProductToConfirm(null)}
                className="flex-1 px-4 py-2.5 border border-primary-200 text-primary-700 rounded-lg hover:bg-primary-50 transition-colors font-medium text-sm"
              >
                取消
              </button>
              <button 
                onClick={executeProductAction}
                className={`flex-1 px-4 py-2.5 text-white rounded-lg transition-colors shadow-sm font-medium text-sm ${
                  productToConfirm.action === '删除' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-primary-900 hover:bg-primary-800'
                }`}
              >
                确定{productToConfirm.action}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新增/编辑产品弹窗 */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-primary-100 bg-primary-50/50">
              <h2 className="text-xl font-bold text-primary-900">
                {editingProduct?.id ? "编辑产品详情" : "新增产品"}
              </h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-primary-400 hover:text-primary-600 transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary-900 mb-1">产品名称 *</label>
                <input 
                  type="text" 
                  value={editingProduct?.name || ""} 
                  onChange={e => setEditingProduct({...editingProduct, name: e.target.value})}
                  className="w-full px-4 py-2 bg-primary-50 border border-transparent rounded-lg focus:border-primary-300 focus:bg-white focus:ring-2 focus:ring-primary-100 transition-all outline-none" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary-900 mb-1">品牌</label>
                  <input 
                    type="text" 
                    value={editingProduct?.brand || ""} 
                    onChange={e => setEditingProduct({...editingProduct, brand: e.target.value})}
                    className="w-full px-4 py-2 bg-primary-50 border border-transparent rounded-lg focus:border-primary-300 focus:bg-white focus:ring-2 focus:ring-primary-100 transition-all outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary-900 mb-1">所属分类 *</label>
                  {/* 自定义所属分类下拉菜单 UI */}
                  <div className="relative">
                    <button 
                      type="button"
                      onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                      className="w-full px-4 py-2.5 bg-primary-50 hover:bg-primary-100 border-none rounded-lg text-sm font-medium text-primary-900 transition-colors flex items-center justify-between"
                    >
                      {editingProduct?.category || "主材"}
                      <ChevronDown className="w-4 h-4 ml-2 text-primary-600" />
                    </button>
                    {isCategoryDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsCategoryDropdownOpen(false)} />
                        <div className="absolute left-0 top-full mt-1 w-full bg-white rounded-lg shadow-lg border border-primary-100 py-1 z-20 max-h-48 overflow-y-auto custom-scrollbar">
                          {categories.filter(c => c !== "全部").map(cat => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => {
                                setEditingProduct({...editingProduct, category: cat});
                                setIsCategoryDropdownOpen(false);
                              }}
                              className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-primary-50 transition-colors ${editingProduct?.category === cat ? 'text-primary-900 bg-primary-50/50' : 'text-primary-600'}`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary-900 mb-1">型号编码</label>
                  <input 
                    type="text" 
                    value={editingProduct?.sku || ""} 
                    onChange={e => setEditingProduct({...editingProduct, sku: e.target.value})}
                    className="w-full px-4 py-2 bg-primary-50 border border-transparent rounded-lg focus:border-primary-300 focus:bg-white focus:ring-2 focus:ring-primary-100 transition-all outline-none font-mono text-sm" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary-900 mb-1">计价单位 *</label>
                  <input 
                    type="text" 
                    value={editingProduct?.unit || ""} 
                    onChange={e => setEditingProduct({...editingProduct, unit: e.target.value})}
                    className="w-full px-4 py-2 bg-primary-50 border border-transparent rounded-lg focus:border-primary-300 focus:bg-white focus:ring-2 focus:ring-primary-100 transition-all outline-none" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary-900 mb-1">标准单价 (¥) *</label>
                  <input 
                    type="number" 
                    value={editingProduct?.price || ""} 
                    onChange={e => setEditingProduct({...editingProduct, price: Number(e.target.value)})}
                    className="w-full px-4 py-2 bg-primary-50 border border-transparent rounded-lg focus:border-primary-300 focus:bg-white focus:ring-2 focus:ring-primary-100 transition-all outline-none font-mono" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary-900 mb-1">当前库存</label>
                  <input 
                    type="number" 
                    value={editingProduct?.stock || ""} 
                    onChange={e => setEditingProduct({...editingProduct, stock: Number(e.target.value)})}
                    className="w-full px-4 py-2 bg-primary-50 border border-transparent rounded-lg focus:border-primary-300 focus:bg-white focus:ring-2 focus:ring-primary-100 transition-all outline-none font-mono" 
                  />
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-primary-100 bg-primary-50/30 flex gap-3">
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 px-4 py-2.5 border border-primary-200 text-primary-700 rounded-lg hover:bg-primary-50 transition-colors font-medium"
              >
                取消
              </button>
              <button 
                onClick={() => {
                  if (!editingProduct.name || !editingProduct.price) return;
                  
                  if (editingProduct.id) {
                    setProducts(products.map(p => p.id === editingProduct.id ? editingProduct : p));
                  } else {
                    setProducts([{...editingProduct, id: Date.now().toString(), status: 'active'}, ...products]);
                  }
                  setIsEditModalOpen(false);
                }}
                className="flex-1 px-4 py-2.5 bg-primary-900 text-white rounded-lg hover:bg-primary-800 transition-colors shadow-sm font-medium"
              >
                保存产品
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

