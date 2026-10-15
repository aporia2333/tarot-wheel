"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEALER_STORAGE_KEY, getDealerCharacter, type DealerManifest } from "@/data/dealerCharacters";

const DealerContext = createContext<{
  character: DealerManifest; setCharacter: (character: DealerManifest) => void;
  busy: boolean; setBusy: (busy: boolean) => void;
} | null>(null);

export function DealerCharacterProvider({ children }: { children: React.ReactNode }) {
  const [character, setCurrent] = useState(() => getDealerCharacter(null));
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    try { setCurrent(getDealerCharacter(localStorage.getItem(DEALER_STORAGE_KEY))); }
    catch { /* Selection still works when storage is unavailable. */ }
  }, []);
  const setCharacter = useCallback((value: DealerManifest) => {
    if (busy) return;
    const next = getDealerCharacter(value.id);
    setCurrent(next);
    try { localStorage.setItem(DEALER_STORAGE_KEY, next.id); }
    catch { /* Keep the selection in memory. */ }
  }, [busy]);
  const value = useMemo(() => ({ character, setCharacter, busy, setBusy }), [character, setCharacter, busy]);
  return <DealerContext.Provider value={value}>{children}</DealerContext.Provider>;
}

export function useDealerCharacter() {
  const value = useContext(DealerContext);
  if (!value) throw new Error("DealerCharacterProvider is required.");
  return value;
}
