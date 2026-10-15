"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { AccountMenu } from "@/components/AccountMenu";
import { CardSkinSelector } from "@/components/CardSkinSelector";
import { ReaderSwitcher } from "@/components/preparation/ReaderSwitcher";
import { useDealerCharacter } from "@/components/DealerCharacterProvider";
import { useReadingFlowStore } from "@/store/readingFlowStore";
import "./site-header.css";

export function SiteHeader() {
  const pathname = usePathname();
  const header = useRef<HTMLElement>(null);
  const { character, setCharacter, busy } = useDealerCharacter();
  const phase = useReadingFlowStore(state => state.preparation.phase);
  const locked = busy || (pathname === "/shuffle" && ["shuffling", "cutting", "ready"].includes(phase));
  useEffect(() => {
    const close = () => header.current?.querySelectorAll<HTMLDetailsElement>("details[open]").forEach(menu => { menu.open = false; });
    const outside = (event: PointerEvent) => { if (!header.current?.contains(event.target as Node)) close(); };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const open = header.current?.querySelector<HTMLDetailsElement>("details[open]");
      if (open) { open.open = false; open.querySelector<HTMLElement>("summary")?.focus(); }
    };
    close();
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [pathname]);
  return <>
    <a className="skip-link" href="#main-content">跳至主要内容</a>
    <header ref={header} className="site-header" onClick={event => {
      if ((event.target as HTMLElement).closest("a,.reader-switch-button")) {
        header.current?.querySelectorAll<HTMLDetailsElement>("details[open]").forEach(menu => { menu.open = false; });
      }
    }}>
      <Link href="/" className="site-brand" aria-label="星月之间首页">
        <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M22 5A12 12 0 1 0 24 26A11 11 0 0 1 22 5Z" /><path d="M23 9l1.2 3.8L28 14l-3.8 1.2L23 19l-1.2-3.8L18 14l3.8-1.2Z" /></svg><span>星月之间</span>
      </Link>
      <nav className="site-nav" aria-label="主导航">
        <details className="header-menu" name="site-menu"><summary>牌面选择<span className="header-chevron" aria-hidden="true" /></summary>
          <div className="header-menu-content"><CardSkinSelector /></div>
        </details>
        <ReaderSwitcher character={character} disabled={locked} onSelect={setCharacter} />
        <details className="header-menu" name="site-menu"><summary>账号<span className="header-chevron" aria-hidden="true" /></summary>
          <div className="header-menu-content header-account"><AccountMenu /></div>
        </details>
        <Link href="/history" aria-current={pathname === "/history" ? "page" : undefined}>历史记录</Link>
      </nav>
    </header>
  </>;
}
