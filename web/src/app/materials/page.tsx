"use client";

import { useState, useEffect } from "react";
import { Search, Plus, Package, CheckCircle2, XCircle, Grid, Zap, Layers, Home, Monitor, UserCheck, LayoutTemplate, ChevronDown, MoreHorizontal } from "lucide-react";

const categories = ["全部", "主材", "辅材", "软装", "家电", "人工", "定制", "套餐"];

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

  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [activeStatus, setActiveStatus] = useState<string>("全部");

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/materials');
      if (res.ok) {
        const data = await res.json();
        setProducts(data.map((item: any) => ({
          ...item,
          id: item._id
        })));
      }
    } catch (e) {
      console.error('Failed to fetch materials', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isEditModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isEditModalOpen]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "主材": return <Grid className="w-5 h-5" />;
      case "辅材": return <Layers className="w-5 h-5" />;
      case "软装": return <Home className="w-5 h-5" />;
      case "家电": return <Monitor className="w-5 h-5" />;
      case "人工": return <UserCheck className="w-5 h-5" />;
      case "定制": return <LayoutTemplate className="w-5 h-5" />;
      case "套餐": return <LayoutTemplate className="w-5 h-5" />;
      default: return <Package className="w-5 h-5" />;
    }
  };

  const executeProductAction = async () => {
    if (!productToConfirm) return;
    const { id, action } = productToConfirm;

    if (action === '删除') {
      try {
        const res = await fetch(`/api/materials/${id}`, { method: 'DELETE' });
        if (res.ok) {
          setProducts(products.filter(p => p.id !== id));
        } else {
          alert('删除失败，请重试');
        }
      } catch (e) {
        alert('删除失败，请重试');
      }
    } else {
      const newStatus = action === '下架' ? 'inactive' : 'active';
      try {
        const res = await fetch(`/api/materials/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });
        if (res.ok) {
          setProducts(products.map(p => p.id === id ? { ...p, status: newStatus } : p));
        } else {
          alert('操作失败，请重试');
        }
      } catch (e) {
        alert('操作失败，请重试');
      }
    }
    setProductToConfirm(null);
  };

  // Hydration mismatch fix
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="p-8 text-primary-600">加载中...</div>;
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
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-primary-900">材料大厅</h1>
          <p className="text-primary-600 mt-2">公司标准化物料与套餐产品目录，出入库管理请前往<a href="/inventory" className="text-primary-900 font-medium underline ml-1">库存管理</a></p>
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

        <div className="flex items-center gap-2 w-full sm:w-auto relative">
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
              className="w-full min-h-[44px] pl-9 pr-10 py-2.5 bg-primary-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary-900 focus:bg-white transition-all outline-none text-primary-900 placeholder:text-primary-600/60"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-400 hover:text-primary-600 transition-colors"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
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
              <div>
                <label className="block text-sm font-medium text-primary-900 mb-1">标准单价 (¥) *</label>
                <input
                  type="number"
                  value={editingProduct?.price || ""}
                  onChange={e => setEditingProduct({...editingProduct, price: Number(e.target.value)})}
                  className="w-full px-4 py-2 bg-primary-50 border border-transparent rounded-lg focus:border-primary-300 focus:bg-white focus:ring-2 focus:ring-primary-100 transition-all outline-none font-mono"
                />
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
                onClick={async () => {
                  if (!editingProduct.name || !editingProduct.price) {
                    alert("请填写产品名称和单价");
                    return;
                  }
                  
                  try {
                    if (editingProduct.id) {
                      const res = await fetch(`/api/materials/${editingProduct.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(editingProduct)
                      });
                      if (res.ok) {
                        setProducts(products.map(p => p.id === editingProduct.id ? editingProduct : p));
                      }
                    } else {
                      const newMaterial = { ...editingProduct, status: 'active' };
                      const res = await fetch('/api/materials', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newMaterial)
                      });
                      if (res.ok) {
                        fetchMaterials();
                      }
                    }
                    setIsEditModalOpen(false);
                  } catch (e) {
                    console.error(e);
                    alert("保存失败");
                  }
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

