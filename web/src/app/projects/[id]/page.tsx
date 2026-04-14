"use client";

import { useParams, useRouter } from "next/navigation";
import MainLayout from "../../../components/MainLayout";
import { ArrowLeft, Hammer } from "lucide-react";
import { useState, useEffect } from "react";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [project, setProject] = useState<any>({ id, customer: "加载中...", address: "加载中...", status: "施工中" });

  useEffect(() => {
    if (id) {
      fetchProject();
    }
  }, [id]);

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data);
      }
    } catch (e) {
      console.error('Failed to fetch project', e);
    }
  };

  return (
    <MainLayout>
      <div className="p-8 max-w-[1200px] mx-auto">
        <button 
          onClick={() => router.back()}
          className="flex items-center text-sm font-medium text-primary-500 hover:text-primary-900 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          返回
        </button>

        {project ? (
          <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-8 flex flex-col items-center justify-center text-center h-[500px]">
            <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mb-4">
              <Hammer className="w-8 h-8 text-primary-400" />
            </div>
            <h1 className="text-2xl font-bold text-primary-900 mb-2">{project.customer} - {project.address}</h1>
            <p className="text-primary-500 mb-6">当前工地状态：{project.status}</p>
            <div className="bg-amber-50 text-amber-700 px-4 py-2 rounded-lg text-sm border border-amber-200">
              工地详情与施工节点管理模块正在紧锣密鼓地开发中...
            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-primary-500">
            找不到对应的工地数据
          </div>
        )}
      </div>
    </MainLayout>
  );
}