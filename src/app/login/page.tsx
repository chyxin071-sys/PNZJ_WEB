"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [account, setAccount] = useState("");
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-primary-50 flex flex-col md:flex-row">
      {/* 左侧大图 / 品牌区域 */}
      <div className="hidden md:flex w-1/2 bg-primary-900 p-12 flex-col justify-between relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-white text-3xl font-light tracking-widest">
            品诺筑家
          </h1>
          <div className="w-12 h-px bg-primary-700 mt-6"></div>
        </div>
        
        <div className="relative z-10">
          <h2 className="text-primary-100 text-4xl font-light leading-snug">
            品诺有心，<br />
            <span className="text-white font-medium">筑家有道。</span>
          </h2>
          <p className="text-primary-100/70 mt-6 font-light tracking-wide text-sm">
            轻量化整装全链路管理系统 V1.0
          </p>
        </div>

        {/* 装饰性几何图形 */}
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-primary-800 rounded-full blur-3xl opacity-40"></div>
        <div className="absolute top-1/4 -right-32 w-64 h-64 bg-primary-800 rounded-full blur-3xl opacity-40"></div>
      </div>

      {/* 右侧登录表单 */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 md:p-24 bg-white">
        <div className="w-full max-w-md">
          <div className="md:hidden mb-12">
            <h1 className="text-3xl font-light tracking-widest text-zinc-900 mb-2">品诺筑家</h1>
            <p className="text-sm text-zinc-500 tracking-wide">品诺有心，筑家有道</p>
          </div>

          <h3 className="text-2xl font-light mb-8 text-zinc-900">Sign In</h3>

          <form onSubmit={handleLogin} className="space-y-8">
            <div className="space-y-1">
              <label className="text-xs text-zinc-500 uppercase tracking-widest font-medium">
                账号 / 手机号
              </label>
              <input
                type="text"
                placeholder="请输入您的账号"
                className="w-full border-b border-primary-100 py-3 bg-transparent text-zinc-900 focus:outline-none focus:border-primary-800 transition-colors placeholder:text-zinc-300 font-light"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-500 uppercase tracking-widest font-medium">
                密码
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full border-b border-primary-100 py-3 bg-transparent text-zinc-900 focus:outline-none focus:border-primary-800 transition-colors placeholder:text-zinc-300 font-light"
                required
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                className="group flex items-center justify-between w-full bg-primary-900 text-white px-6 py-4 hover:bg-primary-800 transition-all duration-300"
              >
                <span className="font-light tracking-widest text-sm">登录进入系统</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" strokeWidth={1.5} />
              </button>
            </div>
          </form>

          <div className="mt-16 text-center">
            <p className="text-xs text-zinc-400 font-light">
              遇到登录问题？请联系系统管理员
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
