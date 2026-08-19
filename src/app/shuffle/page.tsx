"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShuffleAnimation } from "@/components/ShuffleAnimation";
import { tarotCards } from "@/data/tarotCards";
import { shuffleDeck } from "@/lib/shuffle";
import { useReadingFlowStore } from "@/store/readingFlowStore";

export default function ShufflePage() {
  const router = useRouter();
  const { selectedSpread, shuffledDeck, setShuffledDeck } = useReadingFlowStore();
  const [shuffling, setShuffling] = useState(false);
  const [shuffleCount, setShuffleCount] = useState(shuffledDeck.length ? 1 : 0);

  function shuffleOnce() {
    if (shuffling) return;
    setShuffling(true);
    const deck = shuffleDeck(tarotCards);
    setTimeout(() => {
      setShuffledDeck(deck);
      setShuffleCount((count) => count + 1);
      setShuffling(false);
    }, 900);
  }

  if (!selectedSpread) {
    return (
      <main className="page-shell">
        <div className="content-wrap">
          <p className="text-mist">请先选择牌阵。</p>
          <button type="button" className="btn-primary mt-4" onClick={() => router.push("/spreads")}>
            返回牌阵
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="content-wrap text-center">
        <h1 className="text-3xl font-semibold text-white">洗牌</h1>
        <p className="mt-3 text-mist/72">
          本次将从 {tarotCards.length} 张牌中打乱牌序。你可以多洗几次，直到感觉合适。
        </p>
        <ShuffleAnimation active={shuffling} />
        <div className="mx-auto mt-2 max-w-md rounded-lg border border-white/12 bg-white/[0.06] p-4 text-sm text-mist/78">
          当前已洗牌 {shuffleCount} 次
        </div>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" className="btn-secondary" disabled={shuffling} onClick={shuffleOnce}>
            {shuffleCount ? "再洗一次" : "开始洗牌"}
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={shuffling || !shuffledDeck.length}
            onClick={() => router.push("/cut")}
          >
            确认牌序
          </button>
        </div>
      </div>
    </main>
  );
}
