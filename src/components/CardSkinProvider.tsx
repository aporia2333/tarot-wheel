"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { CARD_SKIN_STORAGE_KEY, normalizeCardSkin, type CardSkinId } from "@/data/cardSkins";

const CardSkinContext = createContext<{ skin: CardSkinId; setSkin: (skin: CardSkinId) => void } | null>(null);

export function CardSkinProvider({ children }: { children: React.ReactNode }) {
  const [skin, setCurrentSkin] = useState<CardSkinId>("original");

  useEffect(() => {
    try { setCurrentSkin(normalizeCardSkin(window.localStorage.getItem(CARD_SKIN_STORAGE_KEY))); }
    catch { /* Switching still works when browser storage is unavailable. */ }
    const synchronize = (event: StorageEvent) => {
      if (event.key === CARD_SKIN_STORAGE_KEY || event.key === null) {
        setCurrentSkin(normalizeCardSkin(event.newValue));
      }
    };
    window.addEventListener("storage", synchronize);
    return () => window.removeEventListener("storage", synchronize);
  }, []);

  const setSkin = useCallback((value: CardSkinId) => {
    const next = normalizeCardSkin(value);
    setCurrentSkin(next);
    try { window.localStorage.setItem(CARD_SKIN_STORAGE_KEY, next); }
    catch { /* Preserve the current choice in memory. */ }
  }, []);
  const value = useMemo(() => ({ skin, setSkin }), [skin, setSkin]);
  return <CardSkinContext.Provider value={value}>{children}</CardSkinContext.Provider>;
}

export function useCardSkin() {
  const context = useContext(CardSkinContext);
  if (!context) throw new Error("CardSkinProvider is required to display card skins.");
  return context;
}
