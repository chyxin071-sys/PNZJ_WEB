"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { FileText, Image, Film, File, Upload, Loader2, FolderOpen, Download, ChevronDown, ChevronRight, Eye, EyeOff, FolderInput, Edit3, X, Trash2 } from "lucide-react";
import FolderSelectModal from "./FolderSelectModal";

interface CustomerDocumentsProps {
  leadId: string;
  canUpload?: boolean;
  uploaderName?: string;
}

function formatSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getFileType(name: string): 'image' | 'video' | 'doc' | 'file' {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext)) return 'image';
  if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) return 'video';
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) return 'doc';
  return 'file';
}

function FileIcon({ type }: { type: string }) {
  const cls = "w-5 h-5";
  switch (type) {
    case 'image': return <Image className={`${cls} text-blue-500`} />;
    case 'video': return <Film className={`${cls} text-purple-500`} />;
    case 'doc': return <FileText className={`${cls} text-rose-500`} />;
    default: return <File className={`${cls} text-primary-500`} />;
  }
}

export default function CustomerDocuments({ leadId, canUpload = false, uploaderName }: CustomerDocumentsProps) {
  console.log("CustomerDocuments NEW FULL VERSION rendered");
  const [lead, setLead] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteConfirmIdx, setDeleteConfirmIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 文件夹相关状态
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<globalThis.File[]>([]);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());

  // 移动文件相关状态
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveFileIndex, setMoveFileIndex] = useState<number | null>(null);

  // 重命名文件夹相关状态
  const [showRenameFolderModal, setShowRenameFolderModal] = useState(false);
  const [renamingFolder, setRenamingFolder] = useState<string>('');
  const [newFolderNameInput, setNewFolderNameInput] = useState('');

  const fetchData = useCallback(async () => {
    // 隐藏加载状态，实现静默刷新
    try {
      const [leadRes, filesRes] = await Promise.all([
        fetch(`/api/leads/${leadId}`),
        fetch(`/api/leads/${leadId}/files`)
      ]);
      if (leadRes.ok) {
        const leadData = await leadRes.json();
        setLead((prev: any) => JSON.stringify(prev) === JSON.stringify(leadData) ? prev : leadData);
      }
      if (filesRes.ok) {
        const data = await filesRes.json();
        const sorted = (Array.isArray(data) ? data : []).sort((a: any, b: any) => {
          const ta = a.uploadTime || a.createdAt || '';
          const tb = b.uploadTime || b.createdAt || '';
          return String(tb).localeCompare(String(ta));
        });
        setFiles((prev: any) => JSON.stringify(prev) === JSON.stringify(sorted) ? prev : sorted);
      }
    } catch (e) {
      console.error('获取文件失败', e);
    } finally {
      // 仅在初次加载时设置 loading 为 false，后续静默刷新不影响 loading 状态
      setLoading(false);
    }
  }, [leadId]);

  // 组件挂载时拉取一次数据
  useEffect(() => { fetchData(); }, [fetchData]);

  // 轮询：每隔 5 秒自动静默刷新一次数据
  useEffect(() => {
    const timer = setInterval(() => {
      fetchData();
    }, 5000);
    return () => clearInterval(timer);
  }, [fetchData]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;

    // 保存待上传文件，弹出文件夹选择模态框
    setPendingFiles(Array.from(selected));
    setShowFolderModal(true);
  };

  const handleFolderConfirm = async (folder: string, visibility: 'internal' | 'public') => {
    setShowFolderModal(false);
    setUploading(true);

    try {
      const uploadedFiles: any[] = [];

      for (const file of pendingFiles) {
        const ext = file.name.split('.').pop() || 'bin';
        const cloudPath = `project_files/${leadId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', cloudPath);

        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!res.ok) continue;
        const { fileID } = await res.json();

        uploadedFiles.push({
          fileID,
          name: file.name,
          size: file.size,
          sizeStr: formatSize(file.size),
          type: getFileType(file.name),
          uploader: uploaderName || '未知',
          uploadTime: new Date().toISOString(),
          folderName: folder,
          isVisible: visibility === 'public'
        });
      }

      if (uploadedFiles.length > 0) {
        const newFiles = [...uploadedFiles, ...files];
        await fetch(`/api/leads/${leadId}/files`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: newFiles })
        });
        setFiles(newFiles);
        // 重新获取 lead 数据（可能更新了 fileFolders）
        const leadRes = await fetch(`/api/leads/${leadId}`);
        if (leadRes.ok) setLead(await leadRes.json());
      }
    } catch (e) {
      console.error('上传失败', e);
      alert('❌ 上传失败，请重试');
    } finally {
      setUploading(false);
      setPendingFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (file: any) => {
    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds: [file.fileID] })
      });
      if (!res.ok) throw new Error('无法获取下载链接');
      const data = await res.json();
      if (data && data[0] && data[0].download_url) {
        const url = data[0].download_url;
        try {
          const fileRes = await fetch(url);
          const blob = await fileRes.blob();
          const objectUrl = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = objectUrl;
          a.download = file.name; // 强制保留用户上传的原始后缀名和文件名
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(objectUrl);
        } catch (fetchErr) {
          window.open(url, '_blank');
        }
      } else {
        throw new Error('下载链接无效');
      }
    } catch (err) {
      console.error(err);
      alert('下载/预览失败，请稍后再试');
    }
  };

  const handleDelete = async (idx: number) => {
    const newFiles = files.filter((_, i) => i !== idx);
    try {
      await fetch(`/api/leads/${leadId}/files`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: newFiles })
      });
      setFiles(newFiles);
    } catch (e) {
      console.error('删除失败', e);
    }
    setDeleteConfirmIdx(null);
  };

  const formatTime = (t: string) => {
    if (!t) return '';
    return String(t).substring(0, 10);
  };

  const groupedFiles = () => {
    const folders = lead?.fileFolders || ['默认文件夹'];
    const groups: { [key: string]: any[] } = {};

    folders.forEach((f: string) => { groups[f] = []; });
    files.forEach((file) => {
      const folder = file.folderName || file.folder || '默认文件夹';
      if (!groups[folder]) groups[folder] = [];
      groups[folder].push(file);
    });

    Object.keys(groups).forEach((folder) => {
      groups[folder].sort((a, b) => {
        const ta = a.uploadTime || a.createdAt || '';
        const tb = b.uploadTime || b.createdAt || '';
        return String(tb).localeCompare(String(ta));
      });
    });

    return groups;
  };

  const toggleFolder = (folder: string) => {
    const newCollapsed = new Set(collapsedFolders);
    if (newCollapsed.has(folder)) {
      newCollapsed.delete(folder);
    } else {
      newCollapsed.add(folder);
    }
    setCollapsedFolders(newCollapsed);
  };

  const toggleFileVisibility = async (fileIndex: number) => {
    const file = files[fileIndex];
    const newIsVisible = !file.isVisible;
    const newFiles = [...files];
    newFiles[fileIndex] = { ...file, isVisible: newIsVisible };

    try {
      await fetch(`/api/leads/${leadId}/files`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: newFiles })
      });
      setFiles(newFiles);
    } catch (e) {
      console.error('切换可见性失败', e);
    }
  };

  const handleMoveFile = async (targetFolder: string) => {
    if (moveFileIndex === null) return;
    const newFiles = [...files];
    newFiles[moveFileIndex] = { ...newFiles[moveFileIndex], folderName: targetFolder, folder: targetFolder };

    try {
      await fetch(`/api/leads/${leadId}/files`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: newFiles })
      });
      setFiles(newFiles);
      setShowMoveModal(false);
      setMoveFileIndex(null);
    } catch (e) {
      console.error('移动文件失败', e);
    }
  };

  const handleRenameFolder = async () => {
    const trimmed = newFolderNameInput.trim();
    if (!trimmed) { alert('请输入文件夹名称'); return; }
    const folders = lead?.fileFolders || ['默认文件夹'];
    if (folders.includes(trimmed) && trimmed !== renamingFolder) { alert('文件夹名称已存在'); return; }
    if (trimmed === renamingFolder) { setShowRenameFolderModal(false); return; }

    try {
      const newFolders = folders.map((f: string) => f === renamingFolder ? trimmed : f);
      await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileFolders: newFolders })
      });

      const newFiles = files.map(f => (f.folderName === renamingFolder || f.folder === renamingFolder) ? { ...f, folderName: trimmed, folder: trimmed } : f);
      await fetch(`/api/leads/${leadId}/files`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: newFiles })
      });

      await fetchData();
      setShowRenameFolderModal(false);
      setRenamingFolder('');
      setNewFolderNameInput('');
    } catch (e) {
      console.error('重命名文件夹失败', e);
      alert('重命名失败');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h3 className="text-base font-bold text-primary-900 flex items-center">
          项目资料
          {files.length > 0 && <span className="ml-2 text-xs font-normal text-primary-400">({files.length} 份)</span>}
        </h3>
        {canUpload && (
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-900 text-white rounded-lg hover:bg-primary-800 transition-colors text-xs font-bold shadow-sm disabled:opacity-60"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              上传资料
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-2 pb-10">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-primary-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            <span className="text-sm">加载中...</span>
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-primary-400 bg-primary-50/30 rounded-xl border border-primary-100 border-dashed">
            <FolderOpen className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm">暂无项目资料</p>
            {canUpload && <p className="text-xs mt-1 text-primary-400">点击右上角按钮上传资料</p>}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-primary-100 shadow-sm overflow-hidden">
            {Object.entries(groupedFiles()).map(([folder, folderFiles]) => {
              const isCollapsed = collapsedFolders.has(folder);
              const fileCount = folderFiles.length;

              return (
                <div key={folder} className="border-b border-primary-50 last:border-b-0">
                  {/* 文件夹标题 */}
                  <div className="flex items-center gap-3 p-3 hover:bg-primary-50/50 transition-colors group">
                    <button
                      onClick={() => toggleFolder(folder)}
                      className="flex items-center gap-3 flex-1 text-left"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="w-4 h-4 text-primary-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-primary-400 shrink-0" />
                      )}
                      <FolderOpen className="w-5 h-5 text-primary-500 shrink-0" />
                      <span className="text-sm font-medium text-primary-900 flex-1">{folder}</span>
                      <span className="text-xs text-primary-400 shrink-0">({fileCount})</span>
                    </button>

                    {/* 文件夹管理按钮 */}
                    {canUpload && folder !== '默认文件夹' && (
                      <button
                        onClick={() => {
                          setRenamingFolder(folder);
                          setNewFolderNameInput(folder);
                          setShowRenameFolderModal(true);
                        }}
                        className="p-1.5 text-primary-400 hover:text-primary-600 hover:bg-primary-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="重命名文件夹"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* 文件列表 */}
                  {!isCollapsed && fileCount > 0 && (
                    <div className="bg-primary-50/30">
                      {folderFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 pl-11 hover:bg-primary-50/80 transition-colors group relative border-t border-primary-50/50">
                          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm border border-primary-100">
                            <FileIcon type={file.type || getFileType(file.name || '')} />
                          </div>

                          <div className="flex-1 min-w-0 cursor-pointer group-hover:text-primary-600 transition-colors" onClick={() => handleDownload(file)}>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-primary-900 truncate group-hover:text-primary-600 transition-colors">{file.name}</p>
                              {file.isVisible !== false ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-50 text-green-600 text-[10px] rounded-sm shrink-0">
                                  <Eye className="w-3 h-3" />公开
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-primary-50 text-primary-600 text-[10px] rounded-sm shrink-0">
                                  <EyeOff className="w-3 h-3" />内部
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-primary-400 mt-0.5">
                              {file.sizeStr || formatSize(file.size)} · {file.uploader || '未知'} · {formatTime(file.uploadTime || file.createdAt)}
                            </p>
                          </div>

                          <div className="shrink-0 relative flex items-center gap-1">
                            {canUpload && (
                              <>
                                <button
                                  onClick={() => toggleFileVisibility(files.indexOf(file))}
                                  className={`p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100 ${
                                    file.isVisible !== false
                                      ? 'text-green-500 hover:text-green-600 hover:bg-green-50'
                                      : 'text-primary-400 hover:text-primary-600 hover:bg-primary-50'
                                  }`}
                                  title={file.isVisible !== false ? '设为内部' : '设为公开'}
                                >
                                  {file.isVisible !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  onClick={() => {
                                    setMoveFileIndex(files.indexOf(file));
                                    setShowMoveModal(true);
                                  }}
                                  className="p-1.5 text-primary-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                  title="移动"
                                >
                                  <FolderInput className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}

                            <button
                              onClick={() => handleDownload(file)}
                              className="p-1.5 text-primary-400 hover:text-primary-600 hover:bg-white rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                              title="下载/预览"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            {canUpload && (
                              <div className="relative">
                                <button
                                  onClick={() => setDeleteConfirmIdx(files.indexOf(file))}
                                  className="p-1.5 text-primary-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                  title="删除"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                {deleteConfirmIdx === files.indexOf(file) && (
                                  <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-primary-100 rounded-xl shadow-xl p-2 z-20">
                                    <p className="text-[11px] font-medium text-primary-900 mb-2 text-center">删除这份文件？</p>
                                    <div className="flex gap-1.5">
                                      <button onClick={() => setDeleteConfirmIdx(null)} className="flex-1 px-2 py-1 border border-primary-200 text-primary-600 rounded text-[10px] hover:bg-primary-50">取消</button>
                                      <button onClick={() => handleDelete(files.indexOf(file))} className="flex-1 px-2 py-1 bg-rose-500 text-white rounded text-[10px] hover:bg-rose-600">删除</button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <FolderSelectModal
        isOpen={showFolderModal}
        onClose={() => { setShowFolderModal(false); setPendingFiles([]); if (fileInputRef.current) fileInputRef.current.value = ''; }}
        onConfirm={handleFolderConfirm}
        folders={lead?.fileFolders || ['默认文件夹']}
        defaultFolder="默认文件夹"
        defaultVisibility="internal"
        leadId={leadId}
      />

      {showMoveModal && moveFileIndex !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm opacity-100">
            <div className="flex items-center justify-between p-4 border-b border-primary-100">
              <h3 className="text-base font-bold text-primary-900">移动文件</h3>
              <button onClick={() => { setShowMoveModal(false); setMoveFileIndex(null); }} className="text-primary-400 hover:text-primary-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-2 max-h-60 overflow-y-auto">
              {(lead?.fileFolders || ['默认文件夹']).map((folder: string) => {
                const currentFolderName = files[moveFileIndex]?.folderName || files[moveFileIndex]?.folder || '默认文件夹';
                return (
                <button
                  key={folder}
                  onClick={() => handleMoveFile(folder)}
                  disabled={currentFolderName === folder}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all text-sm ${
                    currentFolderName === folder
                      ? 'border-primary-200 bg-primary-50 text-primary-400 cursor-not-allowed'
                      : 'border-primary-100 hover:border-primary-300 hover:bg-primary-50 text-primary-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4" />
                    <span>{folder}</span>
                    {currentFolderName === folder && <span className="ml-auto text-xs text-primary-400">(当前位置)</span>}
                  </div>
                </button>
              )})}
            </div>
          </div>
        </div>
      )}

      {showRenameFolderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm opacity-100">
            <div className="flex items-center justify-between p-4 border-b border-primary-100">
              <h3 className="text-base font-bold text-primary-900">重命名文件夹</h3>
              <button onClick={() => { setShowRenameFolderModal(false); setRenamingFolder(''); setNewFolderNameInput(''); }} className="text-primary-400 hover:text-primary-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-primary-700 mb-1">原名称</label>
                <div className="px-3 py-2 bg-primary-50 text-primary-400 rounded-lg text-sm">{renamingFolder}</div>
              </div>
              <div>
                <label className="block text-xs font-medium text-primary-700 mb-1">新名称 <span className="text-rose-500">*</span></label>
                <input type="text" value={newFolderNameInput} onChange={(e) => setNewFolderNameInput(e.target.value)} className="w-full px-3 py-2 border border-primary-200 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm" autoFocus />
              </div>
            </div>
            <div className="flex gap-2 p-4 border-t border-primary-100">
              <button onClick={() => { setShowRenameFolderModal(false); setRenamingFolder(''); setNewFolderNameInput(''); }} className="flex-1 px-3 py-2 border border-primary-200 text-primary-700 rounded-lg hover:bg-primary-50 text-sm font-medium">取消</button>
              <button onClick={handleRenameFolder} className="flex-1 px-3 py-2 bg-primary-900 text-white rounded-lg hover:bg-primary-800 text-sm font-bold">确认修改</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}