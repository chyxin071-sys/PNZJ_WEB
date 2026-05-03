"use client";

import { useState, useEffect } from "react";
import { X, FolderPlus } from "lucide-react";

interface FolderSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (folder: string, visibility: 'internal' | 'public') => void;
  folders: string[];
  defaultFolder?: string;
  defaultVisibility?: 'internal' | 'public';
  leadId: string;
}

export default function FolderSelectModal({
  isOpen,
  onClose,
  onConfirm,
  folders,
  defaultFolder,
  defaultVisibility = 'internal',
  leadId
}: FolderSelectModalProps) {
  const [selectedFolderIndex, setSelectedFolderIndex] = useState<number>(0);
  const [visibility, setVisibility] = useState<'internal' | 'public'>(defaultVisibility);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // 重置状态
      const defaultIdx = defaultFolder ? folders.indexOf(defaultFolder) : 0;
      setSelectedFolderIndex(defaultIdx >= 0 ? defaultIdx : 0);
      setVisibility(defaultVisibility);
      setIsCreatingNew(false);
      setNewFolderName('');
    }
  }, [isOpen, folders, defaultFolder, defaultVisibility]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setSaving(true);
    try {
      let targetFolder = '';

      if (isCreatingNew) {
        // 新建文件夹
        const trimmed = newFolderName.trim();
        if (!trimmed) {
          alert('请输入文件夹名称');
          setSaving(false);
          return;
        }
        if (folders.includes(trimmed)) {
          alert('文件夹已存在');
          setSaving(false);
          return;
        }

        // 更新数据库中的 fileFolders
        const newFolders = [...folders, trimmed];
        await fetch(`/api/leads/${leadId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileFolders: newFolders })
        });

        targetFolder = trimmed;
      } else {
        targetFolder = folders[selectedFolderIndex] || folders[0];
      }

      onConfirm(targetFolder, visibility);
      setSaving(false);
    } catch (e) {
      console.error('保存文件夹失败', e);
      alert('保存失败');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col opacity-100">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-primary-100">
          <h3 className="text-lg font-semibold text-primary-900">选择文件夹</h3>
          <button
            onClick={onClose}
            className="text-primary-400 hover:text-primary-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 文件夹选择 */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-primary-700">文件夹</label>
            <div className="space-y-2">
              {folders.map((folder, idx) => (
                <label
                  key={idx}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedFolderIndex === idx && !isCreatingNew
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-primary-100 hover:border-primary-300 hover:bg-primary-50/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="folder"
                    checked={selectedFolderIndex === idx && !isCreatingNew}
                    onChange={() => {
                      setSelectedFolderIndex(idx);
                      setIsCreatingNew(false);
                    }}
                    className="w-4 h-4 text-primary-600"
                  />
                  <span className="text-sm text-primary-900">{folder}</span>
                </label>
              ))}

              {/* 新建文件夹选项 */}
              <label
                className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  isCreatingNew
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-primary-100 hover:border-primary-300 hover:bg-primary-50/50'
                }`}
              >
                <input
                  type="radio"
                  name="folder"
                  checked={isCreatingNew}
                  onChange={() => setIsCreatingNew(true)}
                  className="w-4 h-4 text-primary-600"
                />
                <FolderPlus className="w-4 h-4 text-primary-600" />
                <span className="text-sm text-primary-900">新建文件夹...</span>
              </label>

              {isCreatingNew && (
                <div className="ml-7 mt-2">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="输入文件夹名称"
                    className="w-full px-3 py-2 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    autoFocus
                  />
                </div>
              )}
            </div>
          </div>

          {/* 可见性选择 */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-primary-700">可见性</label>
            <div className="flex gap-4">
              <label
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  visibility === 'internal'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-primary-100 hover:border-primary-300 hover:bg-primary-50/50'
                }`}
              >
                <input
                  type="radio"
                  name="visibility"
                  checked={visibility === 'internal'}
                  onChange={() => setVisibility('internal')}
                  className="w-4 h-4 text-primary-600"
                />
                <span className="text-sm text-primary-900">内部</span>
              </label>
              <label
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  visibility === 'public'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-primary-100 hover:border-primary-300 hover:bg-primary-50/50'
                }`}
              >
                <input
                  type="radio"
                  name="visibility"
                  checked={visibility === 'public'}
                  onChange={() => setVisibility('public')}
                  className="w-4 h-4 text-primary-600"
                />
                <span className="text-sm text-primary-900">公开</span>
              </label>
            </div>
            <p className="text-xs text-primary-500">
              公开文件可通过分享链接被客户查看，内部文件仅员工可见
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-primary-100">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-2.5 border border-primary-200 text-primary-700 rounded-lg hover:bg-primary-50 transition-colors disabled:opacity-50 font-medium"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="flex-1 px-4 py-2.5 bg-primary-900 text-white rounded-lg hover:bg-primary-800 transition-colors disabled:opacity-50 font-bold opacity-100"
          >
            {saving ? '保存中...' : '确认'}
          </button>
        </div>
      </div>
    </div>
  );
}
