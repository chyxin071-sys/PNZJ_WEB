"use client";

import { useState, useEffect, useRef } from "react";
import { FileText, Image, Film, File, Paperclip, Upload, Loader2, ArrowRight, Download } from "lucide-react";
import Link from "next/link";

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

function getFileType(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext)) return 'image';
  if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) return 'video';
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) return 'doc';
  return 'file';
}

function FileIcon({ type }: { type: string }) {
  const cls = "w-4 h-4";
  switch (type) {
    case 'image': return <Image className={`${cls} text-blue-500`} />;
    case 'video': return <Film className={`${cls} text-purple-500`} />;
    case 'doc': return <FileText className={`${cls} text-rose-500`} />;
    default: return <File className={`${cls} text-primary-500`} />;
  }
}

export default function CustomerDocuments({ leadId, canUpload = false, uploaderName }: CustomerDocumentsProps) {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!leadId) return;
    fetch(`/api/leads/${leadId}/files`)
      .then(r => r.json())
      .then(data => {
        const sorted = (Array.isArray(data) ? data : []).sort((a: any, b: any) =>
          String(b.uploadTime || '').localeCompare(String(a.uploadTime || ''))
        );
        setFiles(sorted);
      })
      .catch(() => setFiles([]))
      .finally(() => setLoading(false));
  }, [leadId]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;
    setUploading(true);
    try {
      const uploaded: any[] = [];
      for (const file of Array.from(selected)) {
        const ext = file.name.split('.').pop() || 'bin';
        const cloudPath = `project_files/${leadId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', cloudPath);
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!res.ok) continue;
        const { fileID } = await res.json();
        uploaded.push({
          fileID,
          name: file.name,
          size: file.size,
          sizeStr: formatSize(file.size),
          type: getFileType(file.name),
          uploader: uploaderName || '未知',
          uploadTime: new Date().toISOString()
        });
      }
      if (uploaded.length > 0) {
        const newFiles = [...uploaded, ...files];
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

  const handleDownload = async (file: any, e: React.MouseEvent) => {
    e.stopPropagation();
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
          a.download = file.name; // 强制使用原文件名
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(objectUrl);
        } catch (fetchErr) {
          // 如果存在跨域拦截，回退到直接打开新窗口
          window.open(url, '_blank');
        }
      } else {
        throw new Error('下载链接无效');
      }
    } catch (err) {
      console.error(err);
      alert('下载失败，请稍后再试');
    }
  };

  const preview = files.slice(0, 4);

  return (
    <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-primary-900 flex items-center">
          <Paperclip className="w-4 h-4 mr-2 text-primary-600" />
          文件与资料
          {files.length > 0 && (
            <span className="ml-2 text-xs font-normal text-primary-400">{files.length} 份</span>
          )}
        </h3>
        <Link
          href={`/leads/${leadId}/files`}
          className="text-xs text-primary-500 hover:text-primary-900 flex items-center gap-0.5 transition-colors"
        >
          全部 <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-6 text-primary-400">
            <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
            <span className="text-xs">加载中...</span>
          </div>
        ) : preview.length === 0 ? (
          <div className="text-center py-6 bg-zinc-50 border border-zinc-100 border-dashed rounded-lg text-zinc-400 text-xs">
            暂无文件资料
          </div>
        ) : (
          <>
            {preview.map((file, idx) => (
              <div key={idx} className="flex items-center gap-3 p-2.5 bg-primary-50/30 border border-primary-100 rounded-lg group">
                <div className="w-7 h-7 bg-white rounded flex items-center justify-center shrink-0 border border-primary-100">
                  <FileIcon type={file.type || getFileType(file.name || '')} />
                </div>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={(e) => handleDownload(file, e)}>
                  <p className="text-xs font-medium text-primary-900 truncate hover:text-primary-600 transition-colors">{file.name}</p>
                  <p className="text-[10px] text-primary-400">
                    {file.sizeStr || formatSize(file.size)} · {String(file.uploadTime || '').substring(0, 10)}
                  </p>
                </div>
                <button
                  onClick={(e) => handleDownload(file, e)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-primary-400 hover:text-primary-600 hover:bg-primary-100 rounded transition-all"
                  title="下载/预览"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {files.length > 4 && (
              <Link
                href={`/leads/${leadId}/files`}
                className="block text-center text-xs text-primary-500 hover:text-primary-900 py-2 border border-dashed border-primary-200 rounded-lg hover:border-primary-400 transition-colors"
              >
                查看全部 {files.length} 份文件
              </Link>
            )}
          </>
        )}
      </div>

      {canUpload && (
        <div className="mt-4 pt-4 border-t border-primary-50">
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
            className="w-full flex items-center justify-center gap-2 py-2 border border-primary-200 text-primary-600 rounded-lg hover:bg-primary-50 hover:border-primary-400 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {uploading ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 上传中...</>
            ) : (
              <><Upload className="w-3.5 h-3.5" /> 上传资料</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
