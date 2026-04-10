"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import MainLayout from "../../../../src/components/MainLayout";
import { 
  ArrowLeft, Clock, Calendar, MapPin, Phone, User, Building, HardHat, CheckCircle2, 
  Camera, PlayCircle, AlertCircle, FileText, ChevronRight, AlertTriangle, Save, Edit3,
  ChevronDown, ChevronUp, FileVideo, PlusCircle, Paperclip, Circle, Info, Briefcase, Trash2
} from "lucide-react";
import projectsData from "../../../../mock_data/projects.json";
import CustomerDocuments from "../../../../src/components/CustomerDocuments";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [project, setProject] = useState<any>(null);
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [editStartDate, setEditStartDate] = useState("");
  const [expandedNodes, setExpandedNodes] = useState<string[]>([]); // 记录展开的大节点ID
  const [isEditingRemarks, setIsEditingRemarks] = useState(false);
  const [remarksText, setRemarksText] = useState("• 客户强调主卧必须保留原有的飘窗结构，不得拆除。\n• 入户门暂不更换，施工期间需做好门体保护。\n• 强弱电交叉处必须严格执行锡箔纸包裹工艺，客户会重点检查。");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDocsExpandedOnMobile, setIsDocsExpandedOnMobile] = useState(false);

  const nodesList = ["开工", "水电", "木工", "瓦工", "墙面", "定制", "软装", "交付"];

  useEffect(() => {
    if (id) {
      const found = projectsData.find(p => p.id === id);
      if (found) {
        setProject({ ...found });
        setEditStartDate(found.startDate);
        // 默认展开正在进行中的大节点
        if (found.detailedNodes) {
          const activeNode = found.detailedNodes.find((n: any) => n.status === "进行中");
          if (activeNode) {
            setExpandedNodes([activeNode.id]);
          } else {
            // 如果没有进行中的，默认展开第一个
            setExpandedNodes([found.detailedNodes[0]?.id]);
          }
        }
      }
    }
  }, [id]);

  const toggleNode = (nodeId: string) => {
    if (expandedNodes.includes(nodeId)) {
      setExpandedNodes(expandedNodes.filter(id => id !== nodeId));
    } else {
      setExpandedNodes([...expandedNodes, nodeId]);
    }
  };

  if (!project) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full min-h-[500px]">
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-900 rounded-full animate-spin"></div>
            <p className="mt-4 text-primary-600">加载中...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // 动态计算耗时
  const calculateDaysElapsed = (startDateStr: string) => {
    if (!startDateStr) return 0;
    const start = new Date(startDateStr);
    const now = new Date();
    start.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diffTime = Math.abs(now.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleSaveDate = () => {
    if (!editStartDate) return;
    
    // 自动排期逻辑：根据开工时间，往后推算三个月作为预计完工时间
    const start = new Date(editStartDate);
    const end = new Date(start);
    end.setMonth(start.getMonth() + 3);
    const endDateStr = end.toISOString().split('T')[0];

    // 更新本地状态，实际中应当发请求给后端
    setProject({
      ...project,
      startDate: editStartDate,
      endDate: endDateStr
    });
    setIsEditingDate(false);
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case "正常": return "text-emerald-600 bg-emerald-50 border-emerald-100";
      case "预警": return "text-amber-600 bg-amber-50 border-amber-100";
      case "严重延期": return "text-rose-600 bg-rose-50 border-rose-100";
      default: return "text-zinc-600 bg-zinc-50 border-zinc-100";
    }
  };

  return (
    <MainLayout>
      <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6 pb-20">
        {/* 返回按钮 & 顶部标题 */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="p-2 bg-white border border-primary-100 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-primary-900">{project.customer} 的施工现场</h1>
                <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${getHealthColor(project.health)}`}>
                  {project.health}
                </span>
                <span className="px-2.5 py-1 bg-primary-100 text-primary-700 rounded-md text-xs font-medium">
                  {project.status}
                </span>
              </div>
              <p className="text-sm text-primary-600 mt-1 font-mono">项目编号: {project.id}</p>
            </div>
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setDeleteConfirmId(project.id)}
              className="flex items-center justify-center px-4 py-2 bg-white border border-rose-200 text-rose-500 rounded-lg hover:bg-rose-50 hover:border-rose-300 transition-colors shadow-sm font-medium text-sm"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              删除此工地
            </button>
            {deleteConfirmId === project.id && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-rose-100 rounded-xl shadow-xl p-5 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2 bg-rose-100 text-rose-600 rounded-full shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-primary-900 mb-1">确定要删除此工地记录吗？</h4>
                    <p className="text-xs text-primary-500 leading-relaxed">删除后相关的打卡节点数据也将无法恢复，请谨慎操作。</p>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button 
                    onClick={() => setDeleteConfirmId(null)} 
                    className="px-4 py-2 border border-primary-200 text-primary-600 rounded-lg text-xs font-medium hover:bg-primary-50 transition-colors"
                  >
                    取消
                  </button>
                  <button 
                    onClick={() => {
                      setDeleteConfirmId(null);
                      router.push('/projects');
                    }} 
                    className="px-4 py-2 bg-rose-500 text-white rounded-lg text-xs font-medium hover:bg-rose-600 transition-colors shadow-sm shadow-rose-200"
                  >
                    确认删除
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* 上方：项目排期与概况 */}
          <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-primary-900 mb-6 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-primary-600" />
              项目排期与概况
            </h2>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {/* 第一组：时间排期 */}
              <div className="space-y-6">
                <div>
                  <p className="text-xs text-primary-400 mb-1.5 flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1" /> 开工时间
                  </p>
                  {isEditingDate ? (
                    <div className="flex items-center gap-2">
                      <input 
                        type="date" 
                        value={editStartDate}
                        onChange={(e) => setEditStartDate(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-primary-200 rounded-lg text-sm focus:border-primary-900 outline-none"
                      />
                      <button onClick={handleSaveDate} className="p-1.5 bg-primary-900 text-white rounded-md hover:bg-primary-800">
                        <Save className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-primary-900 font-mono">{project.startDate}</p>
                      <button onClick={() => setIsEditingDate(true)} className="p-1 text-primary-400 hover:text-primary-900 transition-colors">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs text-primary-400 mb-1.5 flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1" /> {project.status === '已交付' ? '完工时间' : '预计完工时间'}
                  </p>
                  <p className="text-sm font-bold text-primary-900 font-mono">{project.endDate || "未定"}</p>
                </div>
                <div>
                  <p className="text-xs text-primary-400 mb-1.5 flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1" /> 已耗时
                  </p>
                  <p className="text-sm font-bold text-primary-900 font-mono">
                    {calculateDaysElapsed(project.startDate)} <span className="text-xs font-normal text-primary-500 ml-0.5">天</span>
                  </p>
                </div>
              </div>

              {/* 第二组：房屋信息 */}
              <div className="space-y-6">
                <div>
                  <p className="text-xs text-primary-400 mb-1.5 flex items-center">
                    <Building className="w-3.5 h-3.5 mr-1" /> 房屋信息
                  </p>
                  <p className="text-sm font-bold text-primary-900">120㎡ / 旧改 / 半包</p>
                </div>
                <div>
                  <p className="text-xs text-primary-400 mb-1.5 flex items-center">
                    <MapPin className="w-3.5 h-3.5 mr-1" /> 项目地址
                  </p>
                  <p className="text-sm font-bold text-primary-900 leading-relaxed pr-4">{project.address || "地址未录入"}</p>
                </div>
              </div>

              {/* 第三组：工长信息 */}
              <div className="space-y-6">
                <div>
                  <p className="text-xs text-primary-400 mb-1.5 flex items-center">
                    <HardHat className="w-3.5 h-3.5 mr-1" /> 负责工长
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold shrink-0">
                      {project.manager.charAt(0)}
                    </div>
                    <p className="text-sm font-bold text-primary-900">{project.manager}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-primary-400 mb-1.5 flex items-center">
                    <Phone className="w-3.5 h-3.5 mr-1" /> 工长联系方式
                  </p>
                  <p className="text-sm font-bold text-primary-900 font-mono">138-0000-0000</p>
                </div>
              </div>

              {/* 第四组：销售设计信息 */}
              <div className="space-y-6">
                <div>
                  <p className="text-xs text-primary-400 mb-1.5 flex items-center">
                    <User className="w-3.5 h-3.5 mr-1" /> 销售
                  </p>
                  <p className="text-sm font-bold text-primary-900">{project.sales || "暂无"}</p>
                </div>
                <div>
                  <p className="text-xs text-primary-400 mb-1.5 flex items-center">
                    <Briefcase className="w-3.5 h-3.5 mr-1" /> 设计
                  </p>
                  <p className="text-sm font-bold text-primary-900">{project.designer || "暂无"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 下方分栏：利用 flex flex-col 实现移动端排序，lg:flex-row 实现桌面端分列 */}
          <div className="flex flex-col lg:flex-row gap-6">
            
            {/* 左侧（桌面端占2/3）：项目施工动态（移动端排在最后面） */}
            <div className="lg:w-2/3 order-3 lg:order-1 space-y-6">
              <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-primary-900 flex items-center">
                    <CheckCircle2 className="w-5 h-5 mr-2 text-primary-600" />
                    项目施工动态
                  </h2>
                </div>

                {project.detailedNodes ? (
                  <div className="space-y-4">
                    {project.detailedNodes.map((node: any, index: number) => {
                      const isExpanded = expandedNodes.includes(node.id);
                      const isCompleted = node.status === "已完成";
                      const isCurrent = node.status === "进行中";

                      return (
                        <div key={node.id} className="border border-primary-100 rounded-xl overflow-hidden transition-all duration-200">
                          {/* 大节点 Header (可点击折叠) */}
                          <div 
                            onClick={() => toggleNode(node.id)}
                            className={`flex items-center justify-between p-4 cursor-pointer hover:bg-primary-50 transition-colors ${isExpanded ? 'bg-primary-50/50 border-b border-primary-100' : ''}`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isCompleted ? 'bg-emerald-500 text-white' : isCurrent ? 'bg-amber-500 text-white ring-4 ring-amber-100' : 'bg-zinc-100 border-2 border-zinc-300 text-zinc-400'}`}>
                                {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : isCurrent ? <PlayCircle className="w-5 h-5" /> : <span className="text-sm font-bold">{index + 1}</span>}
                              </div>
                              <div>
                                <h3 className={`font-bold ${isCurrent ? 'text-primary-900' : isCompleted ? 'text-primary-800' : 'text-primary-600'}`}>{node.name}</h3>
                                <p className="text-xs text-primary-500 mt-0.5">
                                  <span className="block sm:inline">计划: {node.plannedStart || '-'} 至 {node.plannedEnd || '-'}</span>
                                  {node.actualStart && <span className="block mt-1 sm:inline sm:mt-0 sm:ml-2 text-emerald-600">实际开工: {node.actualStart}</span>}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`text-xs font-medium px-2 py-1 rounded-md whitespace-nowrap ${isCompleted ? 'bg-emerald-100 text-emerald-700' : isCurrent ? 'bg-amber-100 text-amber-700' : 'bg-zinc-100 text-zinc-500'}`}>
                                {node.status}
                              </span>
                              {isExpanded ? <ChevronUp className="w-5 h-5 text-primary-400 flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-primary-400 flex-shrink-0" />}
                            </div>
                          </div>

                          {/* 大节点 Content (子节点及汇报) */}
                          {isExpanded && (
                            <div className="p-4 sm:p-6 bg-white">
                              <div className="space-y-8 relative before:absolute before:inset-0 before:left-[11px] before:h-full before:w-[2px] before:bg-zinc-200">
                                {node.subNodes.map((subNode: any, subIndex: number) => {
                                  const subCompleted = subNode.status === "已完成";
                                  const subCurrent = subNode.status === "进行中";

                                  return (
                                    <div key={subNode.id} className="relative pl-10">
                                      {/* 子节点时间轴圆点 */}
                                      <div className={`absolute left-[12px] top-1 w-6 h-6 -translate-x-1/2 rounded-full border-4 border-white flex items-center justify-center z-10 ${subCompleted ? 'bg-emerald-500' : subCurrent ? 'bg-amber-500' : 'bg-zinc-300'}`}>
                                        <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                                      </div>

                                      <div className="mb-3 flex items-center justify-between">
                                        <h4 className="font-bold text-primary-900 text-sm flex items-center gap-2">
                                          {subNode.name}
                                          {subCurrent && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">进行中</span>}
                                          {subCompleted && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">已完成</span>}
                                        </h4>
                                        {/* 预留打卡上传按钮 */}
                                        <button className="text-xs flex items-center text-primary-600 hover:text-primary-900 bg-primary-50 hover:bg-primary-100 px-2 py-1.5 rounded-lg transition-colors">
                                          <PlusCircle className="w-3.5 h-3.5 mr-1" />
                                          添加汇报
                                        </button>
                                      </div>

                                      {/* 汇报卡片列表 */}
                                      {subNode.reports && subNode.reports.length > 0 ? (
                                        <div className="space-y-3">
                                          {subNode.reports.map((report: any, rIndex: number) => (
                                            <div key={rIndex} className="bg-primary-50/50 rounded-lg border border-primary-100 p-4">
                                              <div className="flex justify-between items-start mb-2">
                                                <span className="inline-flex items-center text-xs font-bold text-primary-700 bg-primary-100 px-2 py-0.5 rounded">
                                                  {report.type}
                                                </span>
                                                <span className="text-xs text-primary-400 font-mono">{report.date}</span>
                                              </div>
                                              <p className="text-sm text-primary-800 mb-3 leading-relaxed">
                                                {report.content}
                                              </p>
                                              
                                              {/* 附件展示 (图片/视频) */}
                                              {(report.images?.length > 0 || report.videos?.length > 0) && (
                                                <div className="flex flex-wrap gap-2 mb-3">
                                                  {report.images?.map((img: string, i: number) => (
                                                    <div key={`img-${i}`} className="w-16 h-16 bg-primary-200 rounded-md flex items-center justify-center text-primary-400 overflow-hidden relative group cursor-pointer">
                                                      <Camera className="w-5 h-5" />
                                                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <span className="text-white text-[10px]">查看</span>
                                                      </div>
                                                    </div>
                                                  ))}
                                                  {report.videos?.map((vid: string, i: number) => (
                                                    <div key={`vid-${i}`} className="w-16 h-16 bg-primary-800 rounded-md flex items-center justify-center text-white overflow-hidden relative cursor-pointer">
                                                      <FileVideo className="w-6 h-6" />
                                                    </div>
                                                  ))}
                                                </div>
                                              )}

                                              <div className="flex items-center text-xs text-primary-500 pt-2 border-t border-primary-100/50">
                                                <User className="w-3 h-3 mr-1" /> 汇报人: {report.reporter}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="bg-zinc-50 border border-zinc-100 border-dashed rounded-lg p-4 text-center text-zinc-400 text-sm">
                                          暂无汇报记录
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center text-primary-400 border border-dashed border-primary-200 rounded-xl">
                    <p>详细节点数据加载中...</p>
                  </div>
                )}
              </div>
            </div>

            {/* 右侧（桌面端占1/3，移动端在施工节点上方）：重要信息备注与图纸 */}
            <div className="lg:w-1/3 flex flex-col gap-6 order-1 lg:order-2">
              
              {/* 重要信息备注（移动端排在最上面） */}
              <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-6 order-1">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-primary-900 flex items-center">
                    <Info className="w-4 h-4 mr-2 text-primary-600" />
                    重要信息备注
                  </h3>
                  {!isEditingRemarks ? (
                    <button 
                      onClick={() => setIsEditingRemarks(true)}
                      className="text-primary-600 hover:text-primary-900 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setIsEditingRemarks(false)}
                        className="text-xs text-primary-500 hover:text-primary-700 transition-colors"
                      >
                        取消
                      </button>
                      <button 
                        onClick={() => setIsEditingRemarks(false)}
                        className="text-xs px-2.5 py-1 bg-primary-900 text-white rounded hover:bg-primary-800 transition-colors"
                      >
                        保存
                      </button>
                    </div>
                  )}
                </div>
                
                {isEditingRemarks ? (
                  <textarea
                    value={remarksText}
                    onChange={(e) => setRemarksText(e.target.value)}
                    className="w-full h-32 p-3 text-sm text-primary-900 bg-amber-50/30 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400/50 resize-none transition-all"
                    placeholder="输入重要信息备注..."
                  />
                ) : (
                  <div className="text-sm text-primary-700 bg-amber-50/50 p-4 rounded-lg border border-amber-100/50 leading-relaxed max-h-[300px] overflow-y-auto whitespace-pre-wrap">
                    {remarksText || <span className="text-primary-400 italic">暂无备注信息</span>}
                  </div>
                )}
              </div>

              {/* 全局同步：客户文件与资料（移动端排在中间，默认折叠） */}
              <div className="order-2 lg:order-2 mt-auto lg:mt-0 bg-white rounded-xl border border-primary-100 shadow-sm overflow-hidden flex flex-col lg:h-[500px]">
                {/* 移动端可点击头部折叠 */}
                <div 
                  className="flex items-center justify-between p-4 lg:hidden cursor-pointer bg-primary-50/50"
                  onClick={() => setIsDocsExpandedOnMobile(!isDocsExpandedOnMobile)}
                >
                  <h3 className="text-sm font-bold text-primary-900 flex items-center">
                    <Paperclip className="w-4 h-4 mr-2 text-primary-600" />
                    文件与资料
                  </h3>
                  {isDocsExpandedOnMobile ? (
                    <ChevronUp className="w-5 h-5 text-primary-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-primary-400" />
                  )}
                </div>
                
                <div className={`${isDocsExpandedOnMobile ? 'block' : 'hidden'} lg:block flex-1 overflow-hidden h-[400px] lg:h-full`}>
                  <CustomerDocuments customerName={project.customer} />
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
