"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useReadingFlowStore } from "@/store/readingFlowStore";

export function ReadingFlowHydration({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const pathname = usePathname();
  const needsSnapshot = ["/question", "/spreads", "/shuffle", "/cut", "/draw"].includes(pathname);
  useEffect(() => {
    let active = true;
    Promise.resolve(useReadingFlowStore.persist.rehydrate()).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);
  return ready || !needsSnapshot ? children : <main id="main-content" className="page-shell"><div className="content-wrap" role="status">正在恢复抽牌进度…</div></main>;
}
