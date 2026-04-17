"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Search, X } from "lucide-react";
import MainLayout from "../../../components/MainLayout";

function NewProjectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [form, setForm] = useState({
    leadId: searchParams.get('leadId') || '',
    customer: '',
    phone: '',
    address: '',
    area: '',
    sales: '',
    designer: '',
    manager: '',
    startDate: '',
  });

  const [leads, setLeads] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [showLeadPicker, setShowLeadPicker] = useState(false);
  const [leadSearch, setLeadSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // 如果从线索详情带了参数过来，直接填入
    const leadId = searchParams.get('leadId');
    if (leadId) {
      fetch(`/api/leads/${leadId}`)
        .then(r => r.json())
        .then(data => {
          setForm(f => ({
            ...f,
            leadId: data._id,
            customer: data.name || '',
            phone: data.phone || '',
            address: data.address || '',
            area: data.area || '',
            sales: data.sales || '',
            designer: data.designer || '',
          }));
        })
        .catch(console.error);
    }

    // 拉取已签单线索列表（供手动选择）
    fetch('/api/leads')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setLeads(data.filter((l: any) => l.status === '已签单').map((l: any) => ({ ...l, id: l._id })));
        }
      })
      .catch(console.error);

    // 拉取项目经理列表
    fetch('/api/employees')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setManagers(data.filter((e: any) => e.role === 'manager' && e.status !== 'inactive'));
        }
      })
      .catch(console.error);
  }, []);

  const selectLead = (lead: any) => {
    setForm(f => ({
      ...f,
      leadId: lead._id || lead.id,
      customer: lead.name || '',
      phone: lead.phone || '',
      address: lead.address || '',
      area: lead.area || '',
      sales: lead.sales || '',
      designer: lead.designer || '',
    }));
    setShowLeadPicker(false);
    setLeadSearch('');
  };

  const handleSave = async () => {
    if (!form.customer) return alert('请选择关联客户');
    if (!form.manager) return alert('请选择项目经理');
    if (!form.startDate) return alert('请选择开工日期');

    setSaving(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: form.leadId,
          customer: form.customer,
          phone: form.phone,
          address: form.address,
          area: form.area,
          sales: form.sales,
          designer: form.designer,
          manager: form.manager,
          startDate: form.startDate,
        })
      });
      if (res.ok) {
        const data = await res.json();
        const newId = data.id || data._id;
        router.push(newId ? `/projects/${newId}` : '/projects');
      } else {
        alert('创建失败，请重试');
      }
    } catch (e) {
      alert('创建出错');
    } finally {
      setSaving(false);
    }
  };

  const filteredLeads = leads.filter(l =>
    (l.name || '').includes(leadSearch) || (l.phone || '').includes(leadSearch)
  );

  return (
    <MainLayout>
      <div className="p-8 max-w-[700px] mx-auto space-y-6 pb-32">
        <div>
          <button onClick={() => router.back()} className="flex items-center text-sm font-medium text-primary-600 hover:text-primary-900 mb-4 transition-colors">
            <ChevronLeft className="w-4 h-4 mr-1" />
            返回
          </button>
          <h1 className="text-3xl font-bold tracking-tight text-primary-900">新建工地</h1>
          <p className="text-primary-600 mt-2">选择关联客户后自动填入基础信息，系统将生成标准 8 节点施工排期</p>
        </div>

        <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-6 space-y-5">
          {/* 关联客户 */}
          <div>
            <label className="block text-sm font-medium text-primary-900 mb-1.5">关联客户 <span className="text-rose-500">*</span></label>
            {form.customer ? (
              <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div>
                  <p className="text-sm font-bold text-primary-900">{form.customer}</p>
                  <p className="text-xs text-primary-500 font-mono mt-0.5">{form.phone} · {form.address || '暂无地址'}</p>
                </div>
                <button onClick={() => setForm(f => ({ ...f, leadId: '', customer: '', phone: '', address: '', area: '', sales: '', designer: '' }))}
                  className="p-1 text-primary-400 hover:text-primary-700">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button onClick={() => setShowLeadPicker(true)}
                className="w-full p-3 border border-dashed border-primary-300 rounded-lg text-sm text-primary-500 hover:border-primary-500 hover:text-primary-700 transition-colors text-left">
                点击选择已签单客户...
              </button>
            )}
          </div>

          {/* 自动填入的只读信息 */}
          {form.customer && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-primary-50/50 rounded-lg">
              <div><p className="text-xs text-primary-400 mb-1">负责销售</p><p className="text-sm font-medium text-primary-900">{form.sales || '—'}</p></div>
              <div><p className="text-xs text-primary-400 mb-1">主案设计</p><p className="text-sm font-medium text-primary-900">{form.designer || '—'}</p></div>
              <div><p className="text-xs text-primary-400 mb-1">房屋面积</p><p className="text-sm font-medium text-primary-900">{form.area ? `${form.area} m²` : '—'}</p></div>
              <div><p className="text-xs text-primary-400 mb-1">项目地址</p><p className="text-sm font-medium text-primary-900 truncate">{form.address || '—'}</p></div>
            </div>
          )}

          {/* 项目经理 */}
          <div>
            <label className="block text-sm font-medium text-primary-900 mb-1.5">项目经理 <span className="text-rose-500">*</span></label>
            <select
              value={form.manager}
              onChange={e => setForm(f => ({ ...f, manager: e.target.value }))}
              className="w-full px-4 py-2.5 bg-primary-50 border border-transparent rounded-lg text-sm text-primary-900 focus:outline-none focus:border-primary-300 focus:bg-white transition-all"
            >
              <option value="">请选择项目经理</option>
              {managers.map(m => (
                <option key={m._id} value={m.name}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* 开工日期 */}
          <div>
            <label className="block text-sm font-medium text-primary-900 mb-1.5">开工日期 <span className="text-rose-500">*</span></label>
            <input
              type="date"
              value={form.startDate}
              onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
              className="w-full px-4 py-2.5 bg-primary-50 border border-transparent rounded-lg text-sm text-primary-900 focus:outline-none focus:border-primary-300 focus:bg-white transition-all"
            />
            <p className="text-xs text-primary-400 mt-1.5">系统将根据开工日期自动生成 8 大节点的标准排期，可在工地详情页调整</p>
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="fixed bottom-0 left-0 md:left-64 right-0 bg-white border-t border-primary-100 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-30">
          <div className="max-w-[700px] mx-auto flex justify-end gap-4">
            <button onClick={() => router.back()} className="px-6 py-2.5 border border-primary-200 text-primary-700 rounded-lg hover:bg-primary-50 transition-colors font-medium">
              取消
            </button>
            <button onClick={handleSave} disabled={saving}
              className="px-8 py-2.5 bg-primary-900 text-white rounded-lg hover:bg-primary-800 transition-colors shadow-sm font-medium disabled:opacity-50">
              {saving ? '创建中...' : '创建工地'}
            </button>
          </div>
        </div>
      </div>

      {/* 选择客户弹窗 */}
      {showLeadPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col h-[500px] animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-5 border-b border-primary-100 shrink-0">
              <h2 className="text-lg font-bold text-primary-900">选择已签单客户</h2>
              <button onClick={() => { setShowLeadPicker(false); setLeadSearch(''); }} className="text-primary-400 hover:text-primary-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 border-b border-primary-100 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
                <input type="text" placeholder="搜索客户姓名 / 电话..." value={leadSearch}
                  onChange={e => setLeadSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-primary-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-900 outline-none" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredLeads.map(lead => (
                <div key={lead.id} onClick={() => selectLead(lead)}
                  className="flex items-center justify-between p-4 border border-primary-100 rounded-xl hover:bg-primary-50 hover:border-primary-300 cursor-pointer transition-all">
                  <div>
                    <p className="text-sm font-bold text-primary-900">{lead.name}</p>
                    <p className="text-xs text-primary-500 font-mono mt-0.5">{lead.phone}</p>
                    {lead.address && <p className="text-xs text-primary-400 mt-0.5">{lead.address}</p>}
                  </div>
                  <span className="text-xs text-primary-400">选择 →</span>
                </div>
              ))}
              {filteredLeads.length === 0 && (
                <div className="py-12 text-center text-primary-400 text-sm">没有找到已签单客户</div>
              )}
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

export default function NewProjectPage() {
  return (
    <Suspense fallback={<MainLayout><div className="p-8 text-center text-primary-500">加载中...</div></MainLayout>}>
      <NewProjectContent />
    </Suspense>
  );
}
