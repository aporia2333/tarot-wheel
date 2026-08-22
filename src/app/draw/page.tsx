"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RequireCloudAuth } from "@/components/RequireCloudAuth";
import { TarotWheel } from "@/components/TarotWheel";
import { tarotCards } from "@/data/tarotCards";
import { createReadingId } from "@/lib/ids";
import { saveReading } from "@/lib/readings/client";
import { shuffleDeck } from "@/lib/shuffle";
import { useReadingFlowStore } from "@/store/readingFlowStore";
import type { Orientation, TarotCard } from "@/types";

export default function DrawPage() {
  const router = useRouter();
  const completingRef = useRef(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [saveError, setSaveError] = useState("");
  const {
    question,
    contextInfo,
    selectedSpread,
    shuffledDeck,
    selectedCards,
    setShuffledDeck,
    setSelectedCards,
    addSelectedCard,
  } = useReadingFlowStore();

  useEffect(() => {
    if (!shuffledDeck.length) setShuffledDeck(shuffleDeck(tarotCards));
  }, [setShuffledDeck, shuffledDeck.length]);

  const deck = shuffledDeck.length ? shuffledDeck : tarotCards;
  const cardsRemaining = selectedSpread ? selectedSpread.count - selectedCards.length : 0;

  function selectCard(card: TarotCard) {
    if (
      !selectedSpread ||
      completingRef.current ||
      selectedCards.some((selected) => selected.card.id === card.id) ||
      selectedCards.length >= selectedSpread.count
    ) {
      return;
    }

    addSelectedCard({
      card,
      orientation: (Math.random() > 0.5 ? "upright" : "reversed") as Orientation,
      position: selectedSpread.positions[selectedCards.length],
    });
    setSaveError("");
  }

  function undoLastSelection() {
    if (completingRef.current || !selectedCards.length) return;
    setSelectedCards(selectedCards.slice(0, -1));
    setSaveError("");
  }

  async function confirmSelection() {
    if (!selectedSpread || completingRef.current || selectedCards.length !== selectedSpread.count) return;

    completingRef.current = true;
    setIsConfirming(true);
    setSaveError("");
    const readingId = createReadingId();

    try {
      await saveReading({
        readingId,
        question,
        contextInfo,
        spread: selectedSpread,
        selectedCards,
        createdAt: new Date().toISOString(),
        aiStatus: "not_started",
      });
      setTimeout(() => router.push(`/result/${readingId}`), 450);
    } catch (error) {
      completingRef.current = false;
      setIsConfirming(false);
      setSaveError(error instanceof Error ? error.message : "保存历史记录失败，请重试。");
    }
  }

  const content = !selectedSpread ? (
    <main className="page-shell">
      <div className="content-wrap">
        <p className="text-mist">请先选择牌阵。</p>
        <button type="button" className="btn-primary mt-4" onClick={() => router.push("/spreads")}>
          返回牌阵
        </button>
      </div>
    </main>
  ) : (
    <main className="page-shell">
      <div className="content-wrap">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-white">圆轮抽牌</h1>
            <p className="mt-2 text-mist/72" role="status" aria-live="polite">
              已选择 {selectedCards.length} / {selectedSpread.count}
            </p>
          </div>
          <p className="text-sm text-ember">{selectedSpread.name}</p>
        </div>

        <TarotWheel
          deck={deck}
          selectedIds={selectedCards.map((selected) => selected.card.id)}
          onSelect={selectCard}
          disabled={selectedCards.length >= selectedSpread.count || isConfirming}
        />

        <section
          className="mx-auto mt-2 flex w-full max-w-[760px] flex-col gap-4 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between"
          aria-label="选牌操作"
        >
          <div className="text-sm text-mist/62">
            {cardsRemaining === 0 ? <p>牌已选好，请确认后查看本次解读。</p> : <p>还需选择 {cardsRemaining} 张牌。</p>}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" className="btn-secondary" disabled={!selectedCards.length || isConfirming} onClick={undoLastSelection}>
              撤回上一张
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={cardsRemaining !== 0 || isConfirming}
              onClick={() => void confirmSelection()}
            >
              {isConfirming ? "正在确认…" : "确认所选牌"}
            </button>
          </div>
        </section>

        {saveError ? <p className="mt-4 rounded-lg bg-white/[0.08] p-3 text-sm text-mist">{saveError}</p> : null}
      </div>
    </main>
  );

  return <RequireCloudAuth>{content}</RequireCloudAuth>;
}
