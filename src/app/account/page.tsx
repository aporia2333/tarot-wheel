"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { ReadingLayout } from "@/components/ReadingLayout";
import { PageNotice } from "@/components/PageNotice";

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

  if (!isSupabaseConfigured) return <ReadingLayout title="账户安全" scene="account" narrow><PageNotice title="本地体验模式无需账号" description="阅读记录保存在当前浏览器。" action={<Link href="/" className="btn-secondary">返回首页</Link>} /></ReadingLayout>;
  if (!user) return <ReadingLayout title="账户安全" scene="account" narrow><PageNotice title="正在验证账号…" loading /></ReadingLayout>;

  return <ReadingLayout title="账户安全" description={`当前账号：${user.email}`} scene="account" narrow>
      <form className="account-form" onSubmit={updatePassword}>
        <label>当前密码<input className="field" type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label>
        <label>新密码<input className="field" type="password" autoComplete="new-password" minLength={10} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
        <p className="field-help">建议使用密码管理器生成的独特密码，避免使用用户名、邮箱或常见词。</p>
        {message ? <p className="inline-message" role="status">{message}</p> : null}
        <button className="btn-primary w-full" type="submit" disabled={loading}>{loading ? "正在更新…" : "更新密码"}</button>
      </form>
      <Link href="/" className="text-link mt-4">返回首页</Link>
  </ReadingLayout>;
}
