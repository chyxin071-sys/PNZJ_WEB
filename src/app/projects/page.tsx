"use client";

import { useState } from "react";
import { Search, Filter, AlertCircle, CheckCircle2, Clock, Camera, ChevronRight, HardHat, AlertTriangle, PlayCircle } from "lucide-react";
import MainLayout from "../../components/MainLayout";
import projectsData from "../../../mock_data/projects.json";

export default function ProjectsPage() {
  const [activeStatus, setActiveStatus] = useState("全部");

  const nodesList = ["开工", "水电", "木工", "瓦工", "墙面", "定制", "软装", "交付"];

  const getHealthColor = (health: string) => {
    switch (health) {
      case "正常": return "text-emerald-600 bg-emerald-50 border-emerald-100";
      case "预警": return "text-amber-600 bg-amber-50 border-amber-100";
      case "严重延期": return "text-rose-600 bg-rose-50 border-rose-100";
      default: return "text-zinc-600 bg-zinc-50 border-zinc-100";
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case "正常": return <CheckCircle2 className="w-4 h-4 mr-1.5" />;
      case "预警": return <Clock className="w-4 h-4 mr-1.5" />;
      case "严重延期": return <AlertTriangle className="w-4 h-4 mr-1.5" />;
      default: return null;
    }
  };

  const statuses = ["全部", "未开工", "施工中", "已竣工", "已停工"];

  // Sort by health status to put "严重延期" and "预警" on top
  const sortedProjects = [...projectsData].sort((a, b) => {
    const priority = { "严重延期": 3, "预警": 2, "正常": 1 };
    return (priority[b.health as keyof typeof priority] || 0) - (priority[a.health as keyof typeof priority] || 0);
  });

  const filteredProjects = sortedProjects.filter(p => activeStatus === "全部" || p.status === activeStatus);

  return (
    <MainLayout>
      <div className="p-8 max-w-[1600px] mx-auto space-y-8">
        {/* 顶部标题区 */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary-900">施工管理</h1>
            <p className="text-primary-600 mt-2">8个标准施工节点管控，异常工地自动置顶预警</p>
          </div>
          <div className="flex space-x-3 w-full sm:w-auto">
            <button className="flex flex-1 sm:flex-none items-center justify-center min-h-[44px] px-4 py-2.5 bg-white border border-primary-100 text-primary-900 rounded-lg hover:bg-primary-50 transition-colors shadow-sm font-medium">
              <HardHat className="w-5 h-5 mr-2" />
              工长排班
            </button>
          </div>
        </div>

        {/* 筛选与搜索 */}
        <div className="bg-white p-5 rounded-xl border border-primary-100 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex space-x-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 hide-scrollbar">
            {statuses.map((status) => (
              <button
                key={status}
                onClick={() => setActiveStatus(status)}
                className={`min-h-[44px] px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeStatus === status ? "bg-primary-900 text-white shadow-md" : "bg-primary-50 text-primary-600 hover:bg-primary-100"}`}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-600" />
            <input
              type="text"
              placeholder="搜索客户 / 工长..."
              className="w-full min-h-[44px] pl-9 pr-4 py-2.5 bg-primary-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary-900 focus:bg-white transition-all outline-none text-primary-900 placeholder:text-primary-600/60"
            />
          </div>
        </div>

        {/* 项目卡片列表 */}
        <div className="space-y-4">
          {filteredProjects.map((project) => (
            <div 
              key={project.id} 
              className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-colors hover:border-primary-900/30 ${project.health === "严重延期" ? "border-rose-300" : "border-primary-100"}`}
            >
              {/* 卡片头部信息 */}
              <div className="p-5 border-b border-primary-50 flex flex-wrap gap-4 items-center justify-between bg-primary-50/20">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${project.health === "严重延期" ? "bg-rose-100 text-rose-700" : "bg-primary-900 text-white"}`}>
                      {project.customer.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-primary-900 text-lg">{project.customer}</h3>
                        {project.rating === 'A' && (
                          <span className="px-2 py-0.5 bg-primary-900 text-white text-[10px] font-bold rounded uppercase tracking-wider">VIP</span>
                        )}
                        <span className="text-sm font-mono text-primary-600 ml-2">{project.id}</span>
                      </div>
                      <p className="text-sm text-primary-600 mt-0.5">负责工长: <span className="font-medium text-primary-900">{project.manager}</span></p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs text-primary-600 mb-1">开工时间 / 耗时</p>
                    <p className="text-sm font-medium text-primary-900">{project.startDate} · <span className="font-mono">{project.daysElapsed}天</span></p>
                  </div>
                  <div className="h-8 w-px bg-primary-100 hidden sm:block"></div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium border ${getHealthColor(project.health)}`}>
                      {getHealthIcon(project.health)}
                      {project.health}
                    </span>
                    <button className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border border-primary-100 text-primary-600 hover:bg-primary-50 hover:text-primary-900 transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* 8节点进度条展示 */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-primary-900">当前阶段: {project.nodeName}</h4>
                  <span className="text-sm font-mono text-primary-600">{project.currentNode} / 8</span>
                </div>
                
                <div className="relative px-6">
                  {/* 背景连接线 */}
                  <div className="absolute top-1/2 left-6 right-6 h-1 bg-primary-100 -translate-y-1/2 rounded-full"></div>
                  
                  {/* 进度连接线 */}
                  <div 
                    className="absolute top-1/2 left-6 h-1 bg-primary-900 -translate-y-1/2 rounded-full transition-all duration-500"
                    style={{ width: `calc((100% - 48px) * ${Math.max(0, (project.currentNode - 1) / (nodesList.length - 1))})` }}
                  ></div>

                  {/* 节点点阵 */}
                  <div className="relative flex justify-between">
                    {nodesList.map((node, index) => {
                      const isCompleted = index + 1 < project.currentNode;
                      const isCurrent = index + 1 === project.currentNode;
                      const isPending = index + 1 > project.currentNode;

                      return (
                        <div key={index} className="flex flex-col items-center group">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center z-10 transition-colors ${isCompleted ? 'bg-primary-900 text-white' : isCurrent ? 'bg-amber-500 text-white ring-4 ring-amber-100' : 'bg-primary-100 text-primary-400'}`}>
                            {isCompleted && <CheckCircle2 className="w-3.5 h-3.5" />}
                            {isCurrent && <PlayCircle className="w-3.5 h-3.5" />}
                          </div>
                          
                          {/* 节点名称悬浮提示 */}
                          <div className={`absolute mt-8 text-xs whitespace-nowrap transition-all ${isCurrent ? 'font-bold text-primary-900' : 'text-primary-400'}`}>
                            {node}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 快捷操作区 - 保证一致的留白与高度 */}
                <div className="mt-12 flex justify-end gap-3 min-h-[44px]">
                  {project.status === "已竣工" ? (
                    <div className="flex items-center justify-center px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-bold w-full sm:w-auto border border-emerald-100">
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      项目已交付
                    </div>
                  ) : (
                    <button className="flex items-center justify-center px-4 py-2 bg-primary-50 text-primary-900 rounded-lg hover:bg-primary-100 transition-colors text-sm font-medium w-full sm:w-auto">
                      <Camera className="w-4 h-4 mr-2" />
                      现场验收打卡
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filteredProjects.length === 0 && (
            <div className="py-20 text-center text-primary-600 bg-white rounded-xl border border-primary-100 shadow-sm">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>暂无符合条件的施工项目</p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
