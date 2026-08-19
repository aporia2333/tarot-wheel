"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function GuestStartButton({ className = "btn-secondary" }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function startAsGuest() {
    if (!isSupabaseConfigured) {
      router.push("/question");
      return;
    }
    if (loading) return;
    setLoading(true);
    setMessage("");
    const { error } = await getSupabaseBrowserClient().auth.signInAnonymously();
    setLoading(false);
    if (error) {
      setMessage("访客模式尚未启用。请在 Supabase 的 Authentication 设置中开启 Allow anonymous sign-ins。");
      return;
    }
    router.push("/question");
  }

  return (
    <div>
      <button type="button" className={className} onClick={() => void startAsGuest()} disabled={loading}>
        {loading ? "正在进入访客模式…" : "跳过登录，作为访客体验"}
      </button>
      {message ? <p className="mt-3 max-w-md text-sm text-mist/72">{message}</p> : null}
    </div>
  );
}
