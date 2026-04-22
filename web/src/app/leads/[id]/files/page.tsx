"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Upload, Trash2, FileText, Image, Film, File, Loader2, FolderOpen, Download, ExternalLink } from "lucide-react";
import MainLayout from "../../../../components/MainLayout";

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

  useEffect(() => {
    const userData = localStorage.getItem("pnzj_user") || localStorage.getItem("userInfo");
    if (userData) {
      try { setCurrentUser(JSON.parse(userData)); } catch (e) {}
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [leadRes, filesRes] = await Promise.all([
        fetch(`/api/leads/${leadId}`),
        fetch(`/api/leads/${leadId}/files`)
      ]);
      if (leadRes.ok) setLead(await leadRes.json());
      if (filesRes.ok) {
        const data = await filesRes.json();
        const sorted = (Array.isArray(data) ? data : []).sort((a: any, b: any) => {
          const ta = a.uploadTime || a.createdAt || '';
          const tb = b.uploadTime || b.createdAt || '';
          return String(tb).localeCompare(String(ta));
        });
        setFiles(sorted);
      }
    } catch (e) {
      console.error('获取文件失败', e);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => { fetchData(); }, [fetchData]);

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
    setUploading(true);

    try {
      const uploadedFiles: any[] = [];

      for (const file of Array.from(selected)) {
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
          uploadTime: new Date().toISOString()
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
      }
    } catch (e) {
      console.error('上传失败', e);
    } finally {
      setUploading(false);
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
        window.open(data[0].download_url, '_blank');
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
            <div className="divide-y divide-primary-50">
              {files.map((file, idx) => (
                <div key={idx} className="flex items-center gap-4 p-4 hover:bg-primary-50/30 transition-colors group relative">
                  <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                    <FileIcon type={file.type || getFileType(file.name || '')} />
                  </div>

                  <div className="flex-1 min-w-0 cursor-pointer group-hover:text-primary-600 transition-colors" onClick={() => handleDownload(file)}>
                    <p className="text-sm font-medium text-primary-900 truncate group-hover:text-primary-600 transition-colors">{file.name}</p>
                    <p className="text-xs text-primary-400 mt-0.5">
                      {file.sizeStr || formatSize(file.size)} · {file.uploader || '未知'} · {formatTime(file.uploadTime || file.createdAt)}
                    </p>
                  </div>

                  <div className="shrink-0 relative flex items-center gap-2">
                    <button
                      onClick={() => handleDownload(file)}
                      className="p-2 text-primary-300 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="下载 / 预览"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    {canUpload() && (
                      <div className="relative">
                        <button
                          onClick={() => setDeleteConfirmIdx(idx)}
                          className="p-2 text-primary-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {deleteConfirmIdx === idx && (
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
                                onClick={() => handleDelete(idx)}
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
      </div>
    </MainLayout>
  );
}
