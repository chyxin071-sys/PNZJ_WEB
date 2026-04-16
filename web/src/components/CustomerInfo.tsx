import React from 'react';

interface CustomerInfoProps {
  name: string;
  phone?: string;
  customerNo?: string;
  className?: string;
}

export default function CustomerInfo({ name, phone, customerNo, className = '' }: CustomerInfoProps) {
  // 格式化手机号: 3-4-4
  const formatPhone = (p?: string) => {
    if (!p) return '暂无电话';
    const clean = p.replace(/\D/g, '');
    if (clean.length === 11) {
      // 强制使用普通的半角空格
      return `${clean.slice(0, 3)} ${clean.slice(3, 7)} ${clean.slice(7)}`;
    }
    return p;
  };

  return (
    <div className={`flex flex-col ${className}`}>
      {/* 第一行：姓名 + ID 标签 */}
      <div className="flex items-center flex-wrap gap-2 mb-1 pointer-events-none">
        <span className="font-bold text-primary-900 text-[15px]">{name}</span>
        
        {customerNo && (
          <span 
            className="px-2 py-[3px] rounded text-[11px] font-mono font-medium"
            style={{ backgroundColor: '#F5F7FA', color: '#999999', border: 'none' }}
          >
            <span className="text-[10px] mr-0.5 opacity-80">NO.</span>{customerNo}
          </span>
        )}
      </div>
      
      {/* 第二行：手机号 3-4-4 格式化 */}
      <div 
        className="text-[13px] font-semibold text-primary-600 pointer-events-none"
        style={{ letterSpacing: 'normal' }}
      >
        {formatPhone(phone)}
      </div>
    </div>
  );
}