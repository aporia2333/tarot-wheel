"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function RequireCloudAuth({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(!isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    void getSupabaseBrowserClient().auth.getUser().then(({ data }: { data: { user: User | null } }) => {
      if (!active) return;
      if (!data.user) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }
      setReady(true);
    });
    return () => { active = false; };
  }, [pathname, router]);

  if (!ready) {
    return <main className="page-shell"><div className="content-wrap text-center text-mist/70">正在验证登录状态…</div></main>;
  }
  return <>{children}</>;
}
