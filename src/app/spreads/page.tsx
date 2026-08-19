"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pagination } from "@/components/Pagination";
import { SpreadCard } from "@/components/SpreadCard";
import { spreads, toTarotSpread, type SpreadDefinition } from "@/data/spreads";
import { useReadingFlowStore } from "@/store/readingFlowStore";

const PAGE_SIZE = 8;
const TOTAL_PAGES = Math.ceil(spreads.length / PAGE_SIZE);

export default function SpreadsPage() {
  const router = useRouter();
  const { selectedSpread, setSelectedSpread } = useReadingFlowStore();
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

  const pageSpreads = spreads.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE,
  );

  function selectSpread(definition: SpreadDefinition, count: number) {
    setCountBySpread((current) => ({ ...current, [definition.id]: count }));
    setSelectedSpread(toTarotSpread(definition, count));
  }

  return (
    <main className="spread-page">
      <div className="spread-ambient spread-ambient-left" aria-hidden="true" />
      <div className="spread-ambient spread-ambient-right" aria-hidden="true" />

      <div className="spread-content">
        <header className="spread-header">
          <div>
            <p className="spread-eyebrow"><span aria-hidden="true">✦</span> SELECT YOUR SPREAD</p>
            <h1>选择你的牌阵</h1>
            <p className="spread-subtitle">让直觉引领你，选择此刻最契合的解读方式</p>
          </div>
          <div className="spread-step" aria-label="流程第 2 步，共 4 步">
            <span>STEP</span>
            <strong>02</strong>
            <i>/ 04</i>
          </div>
        </header>

        <section
          key={currentPage}
          className="spread-grid"
          aria-label={`牌阵列表，第 ${currentPage + 1} 页`}
        >
          {pageSpreads.map((spread, index) => (
            <SpreadCard
              key={spread.id}
              spread={spread}
              index={currentPage * PAGE_SIZE + index + 1}
              selected={selectedSpread?.id === spread.id}
              selectedCount={countBySpread[spread.id]}
              onSelect={selectSpread}
            />
          ))}
        </section>

        <Pagination
          currentPage={currentPage}
          totalPages={TOTAL_PAGES}
          onChange={setCurrentPage}
        />
      </div>

      <footer className="spread-action-bar">
        <div className="spread-action-inner">
          <div className="current-selection" aria-live="polite">
            <span className={`selection-orb ${selectedSpread ? "is-active" : ""}`} aria-hidden="true" />
            <div>
              <span className="selection-label">当前选择</span>
              {selectedSpread ? (
                <p><strong>{selectedSpread.name}</strong><span>·</span>{selectedSpread.count} 张牌</p>
              ) : (
                <p className="selection-empty">请选择一个牌阵与抽牌数量</p>
              )}
            </div>
          </div>
          <button
            type="button"
            className="spread-start-button"
            disabled={!selectedSpread}
            onClick={() => router.push("/shuffle")}
          >
            <span>开始抽牌</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
          </button>
        </div>
      </footer>
    </main>
  );
}
