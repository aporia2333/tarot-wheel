"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useReadingFlowStore } from "@/store/readingFlowStore";
import { PageNotice } from "@/components/PageNotice";
import { ReadingLayout } from "@/components/ReadingLayout";

export function RequireCloudAuth({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(!isSupabaseConfigured);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    const supabase = getSupabaseBrowserClient();
    const { data: listener } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (event === "SIGNED_OUT" && !session) {
        setReady(false);
        useReadingFlowStore.getState().resetFlow();
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      }
    });
    void supabase.auth.getUser().then(({ data }: { data: { user: User | null } }) => {
      if (!active) return;
      if (!data.user) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }
      setReady(true);
    }).catch(() => { if (active) setMessage("登录状态验证失败，请刷新页面重试。"); });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [pathname, router]);

  if (!ready) {
    return <ReadingLayout narrow><PageNotice title={message || "正在验证登录状态…"} error={Boolean(message)} loading={!message} /></ReadingLayout>;
  }
  return <>{children}</>;
}
