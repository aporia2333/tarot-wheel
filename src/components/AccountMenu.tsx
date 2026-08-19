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
    void supabase.auth.getUser().then(({ data }: { data: { user: User | null } }) => setUser(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => setUser(session?.user ?? null));
    return () => listener.subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured) return <span className="text-sm text-mist/55">本地体验模式</span>;
  if (!user) return <Link href="/login" className="btn-secondary">登录</Link>;
  if (user.is_anonymous) return <div className="flex items-center gap-3"><span className="text-sm text-mist/70">访客模式</span><Link href="/login" className="btn-secondary">登录或注册</Link></div>;

  return <div className="flex items-center gap-3"><span className="hidden max-w-40 truncate text-sm text-mist/70 sm:block">{user.email}</span><Link href="/account" className="btn-secondary">账户安全</Link><button type="button" className="btn-secondary" onClick={() => void getSupabaseBrowserClient().auth.signOut()}>退出登录</button></div>;
}
