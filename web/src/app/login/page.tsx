"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function LoginPage() {
  const router = useRouter();
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showContact, setShowContact] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!account || !password) {
      setError("请输入账号和密码");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "登录失败，请检查账号密码");
      }

      // 登录成功，将用户信息暂存本地 (真实项目会使用 JWT 或 HttpOnly Cookie)
      localStorage.setItem("pnzj_user", JSON.stringify(data.user));
      localStorage.setItem("userInfo", JSON.stringify(data.user));
      localStorage.setItem("token", data.token);
      
      // 跳转到工作台
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
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
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 md:p-24 bg-white relative">
        <div className="w-full max-w-md mt-12 md:mt-0">
          <div className="md:hidden mb-12">
            <h1 className="text-3xl font-light tracking-widest text-zinc-900 mb-2">品诺筑家</h1>
            <p className="text-sm text-zinc-500 tracking-wide">品诺有心，筑家有道</p>
          </div>

          <h3 className="text-2xl font-light mb-8 text-zinc-900">
            登录系统
          </h3>

          <form onSubmit={handleLogin} className="space-y-8 animate-in fade-in duration-300">
            {error && (
              <div className="p-3 bg-rose-50 text-rose-600 text-sm text-center font-light rounded-lg">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs text-zinc-500 uppercase tracking-widest font-medium">
                账号 / 手机号
              </label>
              <input
                type="text"
                placeholder="请输入您的账号"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-b border-primary-100 py-3 bg-transparent text-zinc-900 focus:outline-none focus:border-primary-800 transition-colors placeholder:text-zinc-300 font-light"
                required
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="group flex items-center justify-between w-full bg-primary-900 text-white px-6 py-4 hover:bg-primary-800 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed rounded-lg shadow-sm"
              >
                {isLoading ? (
                  <span className="font-light tracking-widest text-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    登录中...
                  </span>
                ) : (
                  <>
                    <span className="font-light tracking-widest text-sm">登录进入系统</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" strokeWidth={1.5} />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-16 text-center">
            <button
              type="button"
              onClick={() => setShowContact(true)}
              className="text-xs text-zinc-400 font-light hover:text-zinc-600 transition-colors"
            >
              遇到登录问题？请联系系统管理员
            </button>
          </div>
        </div>
      </div>

      <Dialog open={showContact} onOpenChange={setShowContact}>
        <DialogContent className="sm:max-w-md bg-white border-zinc-100 rounded-xl p-8">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-medium text-center text-zinc-900">联系管理员</DialogTitle>
            <DialogDescription className="text-center text-zinc-500 mt-2">
              请添加下方微信以获取账号或重置密码
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-6">
            <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-900">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <div className="text-3xl font-light tracking-wider text-zinc-900 select-all mb-8">
              chyxinxin222
            </div>
            <button 
              onClick={() => setShowContact(false)}
              className="w-full py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-lg transition-colors font-medium text-sm"
            >
              我知道了
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
