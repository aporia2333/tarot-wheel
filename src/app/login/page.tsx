"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { GuestStartButton } from "@/components/GuestStartButton";
import { ReadingLayout } from "@/components/ReadingLayout";
import { PageNotice } from "@/components/PageNotice";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { safeReturnPath } from "@/lib/supabase/guest";

export default function LoginPage() {
  return <Suspense fallback={<ReadingLayout scene="account" narrow><PageNotice title="正在加载登录页…" loading /></ReadingLayout>}><LoginForm /></Suspense>;
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
  const nextPath = safeReturnPath(possibleNext, "/");

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

  return <ReadingLayout title={mode === "login" ? "登录" : "创建账号"} description="保存你的阅读，在不同设备上回看。" scene="account" narrow>
      {!isSupabaseConfigured ? <PageNotice title="当前为本地体验模式" description="你可以直接作为访客开始抽牌，记录会保存在这台设备的浏览器中。" /> : <form className="account-form" onSubmit={submit}>
        <label>邮箱<input className="field" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>密码<input className="field" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {message ? <p className="inline-message" role="status">{message}</p> : null}
        <button className="btn-primary w-full" type="submit" disabled={loading}>{loading ? "处理中…" : mode === "login" ? "登录" : "注册"}</button>
      </form>}
      {isSupabaseConfigured ? <button type="button" className="text-link auth-toggle" onClick={() => { setMode((current) => current === "login" ? "signup" : "login"); setMessage(""); }}>{mode === "login" ? "没有账号？创建一个" : "已有账号？去登录"}</button> : null}
      <div className="auth-guest"><GuestStartButton className="btn-secondary w-full" nextPath={safeReturnPath(possibleNext)} /></div>
      <Link href="/" className="text-link mt-4">返回首页</Link>
  </ReadingLayout>;
}
