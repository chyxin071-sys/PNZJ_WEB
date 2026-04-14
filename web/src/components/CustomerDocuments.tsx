"use client";

import { useState, useEffect } from "react";
import { FileText, Paperclip, PlusCircle, Trash2, ChevronRight, Upload } from "lucide-react";

interface Document {
  id: string;
  name: string;
  size: string;
  category: "合同" | "图纸" | "其他";
  date: string;
}

interface CustomerDocumentsProps {
  customerName: string;
}

// 模拟初始全局文档数据
const initialDocs: Record<string, Document[]> = {
  "马女士": [
    { id: "d1", name: "原始户型图.pdf", size: "2.4 MB", category: "图纸", date: "2026-03-20" },
    { id: "d2", name: "施工合同.pdf", size: "5.1 MB", category: "合同", date: "2026-03-25" },
    { id: "d3", name: "客户需求调研表.docx", size: "156 KB", category: "其他", date: "2026-03-18" }
  ],
  "郭女士": [
    { id: "d4", name: "平面布置图.pdf", "size": "1.8 MB", category: "图纸", date: "2026-03-10" }
  ]
};

export default function CustomerDocuments({ customerName }: CustomerDocumentsProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    // 从 localStorage 加载，如果没有则使用初始数据
    const saved = localStorage.getItem("pnzj_customer_documents");
    let allDocs = initialDocs;
    if (saved) {
      allDocs = JSON.parse(saved);
    } else {
      localStorage.setItem("pnzj_customer_documents", JSON.stringify(initialDocs));
    }
    
    setDocuments(allDocs[customerName] || []);
  }, [customerName]);

  const saveDocuments = (newDocs: Document[]) => {
    setDocuments(newDocs);
    const saved = localStorage.getItem("pnzj_customer_documents");
    const allDocs = saved ? JSON.parse(saved) : {};
    allDocs[customerName] = newDocs;
    localStorage.setItem("pnzj_customer_documents", JSON.stringify(allDocs));
  };

  const handleUpload = (category: "合同" | "图纸" | "其他") => {
    setIsUploading(true);
    // 模拟上传延迟
    setTimeout(() => {
      const newDoc: Document = {
        id: `d-${Date.now()}`,
        name: `新上传${category}_${Math.floor(Math.random() * 1000)}.pdf`,
        size: `${(Math.random() * 5 + 1).toFixed(1)} MB`,
        category,
        date: new Date().toISOString().split('T')[0]
      };
      saveDocuments([newDoc, ...documents]);
      setIsUploading(false);
    }, 1000);
  };

  const handleDelete = (id: string) => {
    if (confirm("确定要删除这份资料吗？")) {
      saveDocuments(documents.filter(d => d.id !== id));
    }
  };

  const renderCategory = (category: "合同" | "图纸" | "其他") => {
    const categoryDocs = documents.filter(d => d.category === category);
    
    return (
      <div className="mb-4 last:mb-0">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold text-primary-500 bg-primary-50 px-2 py-1 rounded">{category}</h4>
          <button 
            onClick={() => handleUpload(category)}
            disabled={isUploading}
            className="text-xs text-primary-600 hover:text-primary-900 flex items-center transition-colors disabled:opacity-50"
          >
            <Upload className="w-3 h-3 mr-1" />
            上传{category}
          </button>
        </div>
        
        {categoryDocs.length > 0 ? (
          <div className="space-y-2">
            {categoryDocs.map(doc => (
              <div key={doc.id} className="flex items-center justify-between p-2.5 bg-white border border-primary-100 rounded-lg hover:border-primary-300 transition-colors shadow-sm group">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-8 h-8 bg-primary-50 rounded flex-shrink-0 flex items-center justify-center text-primary-600">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium text-primary-900 truncate" title={doc.name}>{doc.name}</p>
                    <p className="text-[10px] text-primary-500">{doc.size} • {doc.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleDelete(doc.id)} className="p-1 text-primary-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-primary-400 flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-3 bg-zinc-50 border border-zinc-100 border-dashed rounded-lg text-zinc-400 text-xs">
            暂无{category}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-primary-900 flex items-center">
          <Paperclip className="w-4 h-4 mr-2 text-primary-600" />
          文件与资料
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto pr-1 space-y-2">
        {renderCategory("合同")}
        {renderCategory("图纸")}
        {renderCategory("其他")}
      </div>
    </div>
  );
}
