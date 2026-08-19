"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    void getSupabaseBrowserClient().auth.getUser().then(({ data }: { data: { user: User | null } }) => {
      if (!data.user || data.user.is_anonymous) {
        router.replace("/login?next=/account");
        return;
      }
      setUser(data.user);
    });
  }, [router]);

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || !user) return;
    if (newPassword.length < 10) {
      setMessage("新密码至少需要 10 个字符。");
      return;
    }
    setLoading(true);
    setMessage("");
    const { error } = await getSupabaseBrowserClient().auth.updateUser({
      password: newPassword,
      current_password: currentPassword,
    });
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setMessage("密码已更新。");
  }

  if (!user) return <main className="page-shell"><div className="content-wrap text-center text-mist/70">正在验证账号…</div></main>;

  return <main className="page-shell"><div className="content-wrap max-w-md">
    <Link href="/" className="text-sm text-mist/65 hover:text-mist">← 返回首页</Link>
    <section className="glass mt-6 rounded-lg p-6">
      <h1 className="text-3xl font-semibold text-white">账户安全</h1>
      <p className="mt-3 text-sm text-mist/70">当前账号：{user.email}</p>
      <form className="mt-6 space-y-5" onSubmit={updatePassword}>
        <label className="block text-sm text-mist/80">当前密码<input className="field mt-2" type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label>
        <label className="block text-sm text-mist/80">新密码<input className="field mt-2" type="password" autoComplete="new-password" minLength={10} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
        <p className="text-xs leading-5 text-mist/60">建议使用密码管理器生成的独特密码，避免使用用户名、邮箱或常见词。</p>
        {message ? <p className="rounded-lg bg-white/[0.08] p-3 text-sm text-mist">{message}</p> : null}
        <button className="btn-primary w-full" type="submit" disabled={loading}>{loading ? "正在更新…" : "更新密码"}</button>
      </form>
    </section>
  </div></main>;
}
