"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { ensureGuestSession, guestErrorMessage, safeReturnPath } from "@/lib/supabase/guest";

export function GuestStartButton({ className = "btn-secondary", nextPath = "/question", label }: { className?: string; nextPath?: string; label?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const busy = useRef(false);
  const active = useRef(true);

  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);

  async function startAsGuest() {
    if (busy.current) return;
    if (!isSupabaseConfigured) {
      router.push(safeReturnPath(nextPath));
      return;
    }
    busy.current = true;
    setLoading(true);
    setMessage("");
    try {
      await ensureGuestSession(getSupabaseBrowserClient().auth);
      if (active.current) {
        router.push(safeReturnPath(nextPath));
        router.refresh();
      }
    } catch (error) {
      if (active.current) setMessage(guestErrorMessage(error));
    } finally {
      busy.current = false;
      if (active.current) setLoading(false);
    }
  }

  return (
    <div>
      <button type="button" className={className} onClick={() => void startAsGuest()} disabled={loading} aria-busy={loading || undefined} aria-label={label ? "跳过登录，作为访客体验" : undefined}>
        {loading ? "正在进入访客模式…" : label ?? "跳过登录，作为访客体验"}
      </button>
      {message ? <p className="inline-message mt-3 max-w-md" role="alert">{message}</p> : null}
    </div>
  );
}
