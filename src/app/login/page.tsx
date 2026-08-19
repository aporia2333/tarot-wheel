"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { GuestStartButton } from "@/components/GuestStartButton";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function LoginPage() {
  return <Suspense fallback={<main className="page-shell"><div className="content-wrap text-center text-mist/70">正在加载登录页…</div></main>}><LoginForm /></Suspense>;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const possibleNext = searchParams.get("next");
  const nextPath = possibleNext?.startsWith("/") ? possibleNext : "/";

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    void getSupabaseBrowserClient().auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      if (data.session && !data.session.user.is_anonymous) router.replace(nextPath);
    });
  }, [nextPath, router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isSupabaseConfigured || loading) return;
    setLoading(true);
    setMessage("");
    const supabase = getSupabaseBrowserClient();
    const result = mode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/login?next=${encodeURIComponent(nextPath)}` } });
    setLoading(false);
    if (result.error) {
      if (result.error.message.toLowerCase().includes("email not confirmed")) return setMessage("邮箱尚未完成验证。请先点击最新确认邮件中的链接；如刚发送过多封邮件，请等待限流恢复后再重试。");
      if (result.error.message.toLowerCase().includes("rate limit")) return setMessage("确认邮件发送次数已达上限。Supabase 内置邮件服务每个项目每小时最多 2 封，请等待约一小时后再试。");
      return setMessage(result.error.message);
    }
    if (mode === "signup" && !result.data.session) return setMessage("注册成功，请前往邮箱验证后再登录。");
    router.replace(nextPath);
  }

  return <main className="page-shell"><div className="content-wrap max-w-md">
    <Link href="/" className="text-sm text-mist/65 hover:text-mist">← 返回首页</Link>
    <section className="glass mt-6 rounded-lg p-6">
      <h1 className="text-3xl font-semibold text-white">{mode === "login" ? "登录" : "创建账号"}</h1>
      {!isSupabaseConfigured ? <p className="mt-4 text-sm leading-6 text-mist/75">尚未配置云端服务。请先配置 Supabase。</p> : <form className="mt-6 space-y-5" onSubmit={submit}>
        <label className="block text-sm text-mist/80">邮箱<input className="field mt-2" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label className="block text-sm text-mist/80">密码<input className="field mt-2" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {message ? <p className="rounded-lg bg-white/[0.08] p-3 text-sm text-mist">{message}</p> : null}
        <button className="btn-primary w-full" type="submit" disabled={loading}>{loading ? "处理中…" : mode === "login" ? "登录" : "注册"}</button>
      </form>}
      <button type="button" className="mt-5 text-sm text-ember hover:text-white" onClick={() => { setMode((current) => current === "login" ? "signup" : "login"); setMessage(""); }}>{mode === "login" ? "没有账号？创建一个" : "已有账号？去登录"}</button>
      <div className="mt-5 border-t border-white/10 pt-5"><GuestStartButton className="btn-secondary w-full" /></div>
    </section>
  </div></main>;
}
