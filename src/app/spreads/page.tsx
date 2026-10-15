"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookChapter, SpreadBook } from "@/components/SpreadBook";
import { PreparationScene } from "@/components/PreparationScene";
import { useDealerCharacter } from "@/components/DealerCharacterProvider";
import { ReadingLayout } from "@/components/ReadingLayout";
import { SpreadCard } from "@/components/SpreadCard";
import { spreads, toTarotSpread, type SpreadDefinition } from "@/data/spreads";
import { useReadingFlowStore } from "@/store/readingFlowStore";
import { CustomSpreadEditor } from "@/components/CustomSpreadEditor";
import { clearCustomDraft, loadCustomDraft } from "@/lib/customSpreadStorage";
import type { TarotSpread } from "@/types";

const PAGE_SIZE = 8;
const TOTAL_PAGES = Math.ceil(spreads.length / PAGE_SIZE);

export default function SpreadsPage() {
  const router = useRouter();
  const { character } = useDealerCharacter();
  const [remark, setRemark] = useState(0);
  const { selectedSpread, setSelectedSpread } = useReadingFlowStore();
  const [editorOpen, setEditorOpen] = useState(false);
  useEffect(() => { if (loadCustomDraft()) setEditorOpen(true); }, []);
  const [currentPage, setCurrentPage] = useState(() => {
    const selectedIndex = spreads.findIndex((spread) => spread.id === selectedSpread?.id);
    return selectedIndex >= PAGE_SIZE ? 1 : 0;
  });
  const [countBySpread, setCountBySpread] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      spreads.map((spread) => [
        spread.id,
        selectedSpread?.id === spread.id ? selectedSpread.count : spread.recommendedCount,
      ]),
    ),
  );

  function selectSpread(definition: SpreadDefinition, count: number) {
    if (definition.id === "custom") { setEditorOpen(true); return; }
    clearCustomDraft(); setEditorOpen(false);
    setCountBySpread((current) => ({ ...current, [definition.id]: count }));
    setSelectedSpread(toTarotSpread(definition, count));
  }
  function useCustomSpread(spread: TarotSpread) {
    setSelectedSpread(spread); setCountBySpread((current) => ({ ...current, custom: spread.count }));
    setCurrentPage(Math.floor(spreads.findIndex((item) => item.id === "custom") / PAGE_SIZE));
    clearCustomDraft(); setEditorOpen(false);
    requestAnimationFrame(() => document.getElementById("start-reading")?.focus());
  }

  const lines = ["翻翻这本书，选一个牌阵。", "每个牌位，都是看待问题的一扇窗。", "可以翻到下一页，再慢慢挑。"];
  return <ReadingLayout immersive>
    <h1 className="ritual-sr-only">选择你的牌阵</h1>
    <section className="spread-book-room">
      <PreparationScene character={character} state={remark ? "talk" : "idle"} operation={null} onComplete={() => {}}
        onDealerClick={() => setRemark((value) => (value + 1) % lines.length)} />
      <div className="book-dialogue"><p className="dealer-name">{character.name}</p><p aria-live="polite" aria-atomic="true">{lines[remark]}</p></div>
      <SpreadBook currentPage={currentPage} totalPages={TOTAL_PAGES} onChange={setCurrentPage} editing={editorOpen}
        selectionLabel={selectedSpread ? `${selectedSpread.name} · ${selectedSpread.count} 张` : "选一个想展开的方向"}
        header={<header className="book-topline">
          <BookChapter />
          <button id="custom-spread-open" type="button" className="text-link book-inscribe"
            aria-expanded={editorOpen} aria-controls="custom-spread-area" onClick={() => setEditorOpen(true)}>自定义牌阵</button>
        </header>}
        renderLeaf={(page, side, facsimile = false) => spreads.slice(page * PAGE_SIZE + side * 4, page * PAGE_SIZE + side * 4 + 4).map(spread =>
          <SpreadCard key={spread.id} spread={spread} compact facsimile={facsimile} selected={selectedSpread?.id === spread.id}
            selectedCount={countBySpread[spread.id]} onSelect={selectSpread}
            customName={spread.id === "custom" && selectedSpread?.id === "custom" ? selectedSpread.name : undefined} />)}
        footer={<footer className={`book-action ${selectedSpread && !editorOpen ? "is-ready" : ""}`}>
          <p aria-live="polite">{editorOpen ? "写下自己的牌位" : selectedSpread ? `${selectedSpread.name} · ${selectedSpread.count} 张` : "选一个想展开的方向"}</p>
          <button id="start-reading" type="button" className="btn-primary" disabled={!selectedSpread || editorOpen} onClick={() => router.push("/shuffle")}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z" /><circle cx="12" cy="12" r="2" /></svg>开始抽牌
          </button>
        </footer>}>
        <div id="custom-spread-area">{editorOpen ? <CustomSpreadEditor initialSpread={selectedSpread}
          onUse={useCustomSpread} onCancel={() => { clearCustomDraft(); setEditorOpen(false); requestAnimationFrame(() => document.getElementById("custom-spread-open")?.focus()); }} /> : null}</div>
      </SpreadBook>
    </section>
  </ReadingLayout>;
}
