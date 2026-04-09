"use client";

import { Hammer, Search, Filter, Camera, MapPin, Calendar, Clock } from "lucide-react";
import MainLayout from "../../components/MainLayout";
import projectsData from "../../../mock_data/projects.json";

export default function ProjectsPage() {
  return (
    <MainLayout>
      <div className="p-4 md:p-8 h-full flex flex-col">
        {/* 顶部区域 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 shrink-0">
          <div>
            <h2 className="text-2xl font-light text-zinc-900 tracking-wider">施工节点管理</h2>
            <p className="text-sm text-zinc-500 mt-1 font-light">全链路 11 节点透明化追踪</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-8 shrink-0">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text" 
              placeholder="搜索工地、工长、业主..." 
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-primary-100 rounded-lg text-sm focus:outline-none focus:border-primary-700 transition-all placeholder:text-zinc-400"
            />
          </div>
          <button className="flex items-center justify-center bg-white border border-primary-100 hover:bg-primary-50 text-zinc-700 px-4 py-2.5 rounded-lg text-sm transition-colors whitespace-nowrap">
            <Filter className="w-4 h-4 mr-2" />
            筛选工地状态
          </button>
        </div>

        {/* 施工项目列表 */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 pb-8">
          {projectsData.map((project) => (
            <div key={project.id} className="bg-white rounded-2xl border border-primary-50 shadow-sm overflow-hidden flex flex-col">
              {/* 卡片头部信息 */}
              <div className="p-6 border-b border-primary-50/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-full blur-3xl -mr-10 -mt-10 opacity-60 pointer-events-none"></div>
                
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div>
                    <h3 className="text-xl font-medium text-zinc-900">{project.customerName}的家</h3>
                    <div className="flex items-center text-sm text-zinc-500 mt-2">
                      <MapPin className="w-4 h-4 mr-1 text-primary-700/50" />
                      {project.address}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-3 py-1 bg-primary-900 text-white text-xs font-medium rounded-full mb-2 shadow-sm">
                      当前: {project.status}
                    </span>
                    <p className="text-xs text-zinc-500 flex items-center justify-end">
                      <Hammer className="w-3 h-3 mr-1" /> 工长: {project.manager}
                    </p>
                  </div>
                </div>

                {/* 整体进度条 */}
                <div className="relative z-10 mt-6">
                  <div className="flex justify-between text-xs font-medium mb-2">
                    <span className="text-primary-800">总进度: {project.progress}/{project.totalNodes}</span>
                    <span className="text-zinc-400">预计完工: {project.expectedEndDate}</span>
                  </div>
                  <div className="w-full bg-primary-50 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-primary-700 h-2 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${(project.progress / project.totalNodes) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* 11节点时间轴展示区 */}
              <div className="p-6 bg-zinc-50/30 flex-1 relative">
                <p className="text-xs font-medium text-zinc-400 mb-6 uppercase tracking-widest flex items-center">
                  <Clock className="w-3 h-3 mr-1" /> 施工节点打卡流水
                </p>
                
                <div className="relative pl-4 space-y-6 before:absolute before:inset-0 before:ml-[23px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-primary-100">
                  {project.nodes.slice(0, 5).map((node, index) => ( // 仅展示前5个节点示意
                    <div key={node.id} className="relative flex items-start gap-4 group">
                      <div className={`absolute left-0 w-2 h-2 rounded-full border-2 bg-white mt-1.5 
                        ${node.status === 'completed' ? 'border-primary-700 bg-primary-700' : 
                          node.status === 'in_progress' ? 'border-amber-500 bg-amber-500 ring-4 ring-amber-500/20' : 
                          'border-primary-200'}`} 
                      />
                      
                      <div className="ml-6 flex-1 bg-white p-4 rounded-xl border border-primary-50 shadow-sm group-hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`text-sm font-medium ${node.status === 'pending' ? 'text-zinc-400' : 'text-zinc-900'}`}>
                              {index + 1}. {node.name}
                            </p>
                            <p className="text-xs text-zinc-400 mt-1">{node.date}</p>
                          </div>
                          
                          {/* 状态操作区 */}
                          {node.status === 'completed' && (
                            <span className="text-xs font-medium text-primary-700 bg-primary-50 px-2 py-1 rounded flex items-center">
                              <Camera className="w-3 h-3 mr-1" /> 已打卡
                            </span>
                          )}
                          {node.status === 'in_progress' && (
                            <button className="text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 px-3 py-1.5 rounded-lg flex items-center shadow-sm transition-colors">
                              <Camera className="w-3 h-3 mr-1" /> 去打卡
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {project.nodes.length > 5 && (
                    <div className="relative flex items-center justify-center pt-2 pb-4">
                      <button className="text-xs text-primary-700 font-medium hover:text-primary-900 bg-white px-4 py-1.5 rounded-full border border-primary-100 shadow-sm z-10 transition-colors">
                        展开其余 {project.nodes.length - 5} 个节点 ↓
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}