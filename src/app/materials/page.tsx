"use client";

import { useState } from "react";
import { Search, Plus, Package, Filter, MoreHorizontal, CheckCircle2, XCircle } from "lucide-react";

// 模拟数据 - 材料大厅
const mockProducts = [
  { id: "1", name: "马可波罗 亚金石 800x800", brand: "马可波罗", category: "主材", sku: "MK-001", unit: "平方米", price: 128.00, stock: 500, status: "active" },
  { id: "2", name: "立邦 净味抗甲醛5合1", brand: "立邦", category: "辅材", sku: "NP-002", unit: "桶", price: 450.00, stock: 120, status: "active" },
  { id: "3", name: "顾家 意式极简真皮沙发", brand: "顾家", category: "软装", sku: "GJ-S01", unit: "套", price: 8999.00, stock: 15, status: "active" },
  { id: "4", name: "美的 1.5匹新风空调", brand: "美的", category: "家电", sku: "MD-AC15", unit: "台", price: 3299.00, stock: 40, status: "active" },
  { id: "5", name: "标准拆除工人人工费", brand: "-", category: "人工", sku: "LB-001", unit: "平方米", price: 45.00, stock: 999, status: "active" },
  { id: "6", name: "39800 极简装整装套餐", brand: "品诺筑家", category: "套餐", sku: "PKG-398", unit: "套", price: 39800.00, stock: 999, status: "active" },
  { id: "7", name: "东鹏 玉岛白 600x1200", brand: "东鹏", category: "主材", sku: "DP-005", unit: "平方米", price: 158.00, stock: 0, status: "inactive" },
];

const categories = ["全部", "主材", "辅材", "软装", "家电", "人工", "套餐"];

import MainLayout from "../../components/MainLayout";

export default function MaterialsPage() {
  const [activeCategory, setActiveCategory] = useState("全部");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProducts = mockProducts.filter(p => {
    const matchCategory = activeCategory === "全部" || p.category === activeCategory;
    const matchSearch = p.name.includes(searchQuery) || p.brand.includes(searchQuery) || p.sku.includes(searchQuery);
    return matchCategory && matchSearch;
  });

  return (
    <MainLayout>
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      {/* 顶部标题区 */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary-900">材料大厅</h1>
          <p className="text-primary-600 mt-2">公司标准化物料与套餐库，供报价时快速引用</p>
        </div>
        <button className="flex items-center justify-center min-h-[44px] px-4 py-2.5 bg-primary-900 text-white rounded-lg hover:bg-primary-800 transition-colors shadow-sm font-medium w-full sm:w-auto">
          <Plus className="w-5 h-5 mr-2" />
          新增产品
        </button>
      </div>

      {/* 筛选与搜索 - 融合风格：留白背景 + 精致边框 */}
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

        {/* 搜索框 */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-600" />
          <input
            type="text"
            placeholder="搜索名称 / 品牌 / SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-h-[44px] pl-9 pr-4 py-2.5 bg-primary-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary-900 focus:bg-white transition-all outline-none text-primary-900 placeholder:text-primary-600/60"
          />
        </div>
      </div>

      {/* 数据表格 - 极简高级感的清爽表格 */}
      <div className="bg-white rounded-xl border border-primary-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-primary-50/50 border-b border-primary-100 text-primary-600 text-sm">
                <th className="py-4 px-6 font-medium">产品信息</th>
                <th className="py-4 px-6 font-medium">品牌</th>
                <th className="py-4 px-6 font-medium">分类</th>
                <th className="py-4 px-6 font-medium">SKU</th>
                <th className="py-4 px-6 font-medium">单价</th>
                <th className="py-4 px-6 font-medium">单位</th>
                <th className="py-4 px-6 font-medium">状态</th>
                <th className="py-4 px-6 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-100 text-sm">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-primary-50/30 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center mr-3 border border-primary-100 text-primary-600 group-hover:bg-white transition-colors">
                        <Package className="w-5 h-5" />
                      </div>
                      <span className="font-medium text-primary-900">{product.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-primary-700">{product.brand}</td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-primary-50 text-primary-700 border border-primary-100">
                      {product.category}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-primary-600 font-mono text-xs">{product.sku}</td>
                  <td className="py-4 px-6 font-medium text-primary-900">¥{product.price.toFixed(2)}</td>
                  <td className="py-4 px-6 text-primary-600">{product.unit}</td>
                  <td className="py-4 px-6">
                    {product.status === "active" ? (
                      <span className="inline-flex items-center text-emerald-600">
                        <CheckCircle2 className="w-4 h-4 mr-1.5" />
                        已上架
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-rose-500">
                        <XCircle className="w-4 h-4 mr-1.5" />
                        已下架
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-primary-600 hover:text-primary-900 hover:bg-primary-50 rounded-lg transition-colors ml-auto">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
              
              {filteredProducts.length === 0 && (
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
      </div>
    </div>
    </MainLayout>
  );
}

