"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Upload, Trash2, FileText, Image, Film, File, Loader2, FolderOpen, Download, ExternalLink, ChevronDown, ChevronRight, Eye, EyeOff, FolderInput, Edit3, X } from "lucide-react";
import MainLayout from "../../../../components/MainLayout";
import FolderSelectModal from "../../../../components/FolderSelectModal";

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

export default function LeadFilesPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.id as string;

  const [lead, setLead] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteConfirmIdx, setDeleteConfirmIdx] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 文件夹相关状态
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());

  // 移动文件相关状态
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveFileIndex, setMoveFileIndex] = useState<number | null>(null);

  // 重命名文件夹相关状态
  const [showRenameFolderModal, setShowRenameFolderModal] = useState(false);
  const [renamingFolder, setRenamingFolder] = useState<string>('');
  const [newFolderNameInput, setNewFolderNameInput] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem("pnzj_user") || localStorage.getItem("userInfo");
    if (userData) {
      try { setCurrentUser(JSON.parse(userData)); } catch (e) {}
    }
  }, []);

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

  const canUpload = () => {
    if (!currentUser || !lead) return false;
    if (currentUser.role === 'admin') return true;
    return (
      lead.creatorName === currentUser.name ||
      lead.sales === currentUser.name ||
      lead.designer === currentUser.name ||
      lead.signer === currentUser.name
    );
  };

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
          uploader: currentUser?.name || '未知',
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
          // CORS 拦截等异常时回退
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

  // 按文件夹分组文件
  const groupedFiles = () => {
    const folders = lead?.fileFolders || ['默认文件夹'];
    const groups: { [key: string]: any[] } = {};

    // 初始化所有文件夹
    folders.forEach((f: string) => {
      groups[f] = [];
    });

    // 分配文件到对应文件夹
    files.forEach((file) => {
      const folder = file.folderName || file.folder || '默认文件夹';
      if (!groups[folder]) {
        groups[folder] = [];
      }
      groups[folder].push(file);
    });

    // 按时间倒序排序每个文件夹内的文件
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

  // 切换文件可见性
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

  // 移动文件到其他文件夹
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

  // 重命名文件夹
  const handleRenameFolder = async () => {
    const trimmed = newFolderNameInput.trim();
    if (!trimmed) {
      alert('请输入文件夹名称');
      return;
    }

    const folders = lead?.fileFolders || ['默认文件夹'];
    if (folders.includes(trimmed) && trimmed !== renamingFolder) {
      alert('文件夹名称已存在');
      return;
    }

    if (trimmed === renamingFolder) {
      setShowRenameFolderModal(false);
      return;
    }

    try {
      // 更新文件夹列表
      const newFolders = folders.map((f: string) => f === renamingFolder ? trimmed : f);
      await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileFolders: newFolders })
      });

      // 更新所有文件的文件夹引用
      const newFiles = files.map(f => (f.folderName === renamingFolder || f.folder === renamingFolder) ? { ...f, folderName: trimmed, folder: trimmed } : f);
      await fetch(`/api/leads/${leadId}/files`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: newFiles })
      });

      // 重新获取数据
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
    <MainLayout>
      <div className="p-6 md:p-8 max-w-[900px] mx-auto">
        {/* 顶部 */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-primary-50 rounded-lg text-primary-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-primary-900 truncate">
              {lead ? `${lead.name} 的项目资料` : '项目资料'}
            </h1>
            {lead?.address && (
              <p className="text-sm text-primary-500 mt-0.5 truncate">{lead.address}</p>
            )}
          </div>
          <span className="text-sm text-primary-400 shrink-0">共 {files.length} 份</span>
        </div>

        {/* 文件列表 */}
        <div className="bg-white rounded-xl border border-primary-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-primary-400">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              <span className="text-sm">加载中...</span>
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-primary-400">
              <FolderOpen className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-sm">暂无项目资料</p>
              {canUpload() && (
                <p className="text-xs mt-1 text-primary-300">点击下方按钮上传资料</p>
              )}
            </div>
          ) : (
            <div>
              {Object.entries(groupedFiles()).map(([folder, folderFiles]) => {
                const isCollapsed = collapsedFolders.has(folder);
                const fileCount = folderFiles.length;

                return (
                  <div key={folder} className="border-b border-primary-50 last:border-b-0">
                    {/* 文件夹标题 */}
                    <div className="flex items-center gap-3 p-4 hover:bg-primary-50/50 transition-colors">
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
                      {canUpload() && folder !== '默认文件夹' && (
                        <button
                          onClick={() => {
                            setRenamingFolder(folder);
                            setNewFolderNameInput(folder);
                            setShowRenameFolderModal(true);
                          }}
                          className="p-2 text-primary-400 hover:text-primary-600 hover:bg-primary-100 rounded-lg transition-colors"
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
                          <div key={idx} className="flex items-center gap-4 p-4 pl-12 hover:bg-primary-50/50 transition-colors group relative border-t border-primary-50/50">
                            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm">
                              <FileIcon type={file.type || getFileType(file.name || '')} />
                            </div>

                            <div className="flex-1 min-w-0 cursor-pointer group-hover:text-primary-600 transition-colors" onClick={() => handleDownload(file)}>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-primary-900 truncate group-hover:text-primary-600 transition-colors">{file.name}</p>
                                {file.isVisible !== false ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-600 text-xs rounded-full shrink-0">
                                    <Eye className="w-3 h-3" />
                                    公开
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-50 text-primary-600 text-xs rounded-full shrink-0">
                                    <EyeOff className="w-3 h-3" />
                                    内部
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-primary-400 mt-0.5">
                                {file.sizeStr || formatSize(file.size)} · {file.uploader || '未知'} · {formatTime(file.uploadTime || file.createdAt)}
                              </p>
                            </div>

                            <div className="shrink-0 relative flex items-center gap-2">
                              {canUpload() && (
                                <>
                                  {/* 切换可见性 */}
                                  <button
                                    onClick={() => toggleFileVisibility(files.indexOf(file))}
                                    className={`p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100 ${
                                      file.isVisible !== false
                                        ? 'text-green-500 hover:text-green-600 hover:bg-green-50'
                                        : 'text-primary-400 hover:text-primary-600 hover:bg-primary-50'
                                    }`}
                                    title={file.isVisible !== false ? '设为内部' : '设为公开'}
                                  >
                                    {file.isVisible !== false ? (
                                      <Eye className="w-4 h-4" />
                                    ) : (
                                      <EyeOff className="w-4 h-4" />
                                    )}
                                  </button>

                                  {/* 移动文件 */}
                                  <button
                                    onClick={() => {
                                      setMoveFileIndex(files.indexOf(file));
                                      setShowMoveModal(true);
                                    }}
                                    className="p-2 text-primary-300 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                    title="移动到其他文件夹"
                                  >
                                    <FolderInput className="w-4 h-4" />
                                  </button>
                                </>
                              )}

                              <button
                                onClick={() => handleDownload(file)}
                                className="p-2 text-primary-300 hover:text-primary-600 hover:bg-white rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                title="下载 / 预览"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              {canUpload() && (
                                <div className="relative">
                                  <button
                                    onClick={() => setDeleteConfirmIdx(files.indexOf(file))}
                                    className="p-2 text-primary-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                    title="删除"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                  {deleteConfirmIdx === files.indexOf(file) && (
                                    <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-primary-100 rounded-xl shadow-xl p-3 z-20 animate-in fade-in zoom-in-95 duration-150">
                                      <p className="text-xs font-medium text-primary-900 mb-2">确定删除这份文件吗？</p>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => setDeleteConfirmIdx(null)}
                                          className="flex-1 px-2 py-1.5 border border-primary-200 text-primary-600 rounded-lg text-xs font-medium hover:bg-primary-50"
                                        >
                                          取消
                                        </button>
                                        <button
                                          onClick={() => handleDelete(files.indexOf(file))}
                                          className="flex-1 px-2 py-1.5 bg-rose-500 text-white rounded-lg text-xs font-medium hover:bg-rose-600"
                                        >
                                          删除
                                        </button>
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

        {/* 上传按钮 */}
        {canUpload() && (
          <div className="mt-4">
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
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary-900 text-white rounded-xl hover:bg-primary-800 transition-colors font-medium shadow-sm disabled:opacity-60"
            >
              {uploading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> 上传中...</>
              ) : (
                <><Upload className="w-4 h-4" /> 上传资料</>
              )}
            </button>
          </div>
        )}

        {/* 文件夹选择模态框 */}
        <FolderSelectModal
          isOpen={showFolderModal}
          onClose={() => {
            setShowFolderModal(false);
            setPendingFiles([]);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
          onConfirm={handleFolderConfirm}
          folders={lead?.fileFolders || ['默认文件夹']}
          defaultFolder="默认文件夹"
          defaultVisibility="internal"
          leadId={leadId}
        />

        {/* 移动文件模态框 */}
        {showMoveModal && moveFileIndex !== null && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md opacity-100">
              <div className="flex items-center justify-between p-6 border-b border-primary-100">
                <h3 className="text-lg font-semibold text-primary-900">移动文件</h3>
                <button
                  onClick={() => {
                    setShowMoveModal(false);
                    setMoveFileIndex(null);
                  }}
                  className="text-primary-400 hover:text-primary-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm text-primary-600">
                  将文件移动到：
                </p>
                <div className="space-y-2">
                  {(lead?.fileFolders || ['默认文件夹']).map((folder: string) => {
                    const currentFolderName = files[moveFileIndex]?.folderName || files[moveFileIndex]?.folder || '默认文件夹';
                    return (
                    <button
                      key={folder}
                      onClick={() => handleMoveFile(folder)}
                      disabled={currentFolderName === folder}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                        currentFolderName === folder
                          ? 'border-primary-200 bg-primary-50 text-primary-400 cursor-not-allowed'
                          : 'border-primary-100 hover:border-primary-300 hover:bg-primary-50 text-primary-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-4 h-4" />
                        <span className="text-sm">{folder}</span>
                        {currentFolderName === folder && (
                          <span className="ml-auto text-xs text-primary-400">(当前位置)</span>
                        )}
                      </div>
                    </button>
                  )})}
                </div>
              </div>

              <div className="flex gap-3 p-6 border-t border-primary-100">
                <button
                  onClick={() => {
                    setShowMoveModal(false);
                    setMoveFileIndex(null);
                  }}
                  className="flex-1 px-4 py-2.5 border border-primary-200 text-primary-700 rounded-lg hover:bg-primary-50 transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 重命名文件夹模态框 */}
        {showRenameFolderModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md opacity-100">
              <div className="flex items-center justify-between p-6 border-b border-primary-100">
                <h3 className="text-lg font-semibold text-primary-900">重命名文件夹</h3>
                <button
                  onClick={() => {
                    setShowRenameFolderModal(false);
                    setRenamingFolder('');
                    setNewFolderNameInput('');
                  }}
                  className="text-primary-400 hover:text-primary-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-2">
                    原文件夹名称
                  </label>
                  <div className="px-3 py-2 bg-primary-50 text-primary-400 rounded-lg text-sm">
                    {renamingFolder}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-2">
                    新文件夹名称 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newFolderNameInput}
                    onChange={(e) => setNewFolderNameInput(e.target.value)}
                    placeholder="输入新文件夹名称"
                    className="w-full px-3 py-2 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex gap-3 p-6 border-t border-primary-100">
                <button
                  onClick={() => {
                    setShowRenameFolderModal(false);
                    setRenamingFolder('');
                    setNewFolderNameInput('');
                  }}
                  className="flex-1 px-4 py-2.5 border border-primary-200 text-primary-700 rounded-lg hover:bg-primary-50 transition-colors font-medium"
                >
                  取消
                </button>
                <button
                  onClick={handleRenameFolder}
                  className="flex-1 px-4 py-2.5 bg-primary-900 text-white rounded-lg hover:bg-primary-800 transition-colors font-bold opacity-100"
                >
                  确认修改
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
