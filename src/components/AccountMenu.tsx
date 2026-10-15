"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function AccountMenu() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = getSupabaseBrowserClient();
    void supabase.auth.getUser().then(({ data }: { data: { user: User | null } }) => setUser(data.user)).catch(() => setUser(null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => setUser(session?.user ?? null));
    return () => listener.subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured) return <div><span className="account-mode">本地体验模式</span><Link href="/account" className="header-account-help">账号说明</Link></div>;
  if (!user) return <Link href="/login" className="btn-secondary">登录</Link>;
  if (user.is_anonymous) return <div className="flex items-center gap-3"><span className="account-mode">访客模式</span><Link href="/login" className="btn-secondary">登录或注册</Link></div>;

  return <div className="flex items-center gap-3"><span className="account-mode hidden max-w-40 truncate sm:block">{user.email}</span><Link href="/account" className="btn-secondary">账户安全</Link><button type="button" className="btn-secondary" onClick={() => void getSupabaseBrowserClient().auth.signOut()}>退出登录</button></div>;
}
