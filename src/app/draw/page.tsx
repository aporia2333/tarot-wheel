"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RequireCloudAuth } from "@/components/RequireCloudAuth";
import { ReadingLayout } from "@/components/ReadingLayout";
import { PageNotice } from "@/components/PageNotice";
import { TarotTable } from "@/components/TarotTable";
import { tarotCards } from "@/data/tarotCards";
import { HistoryServiceError, saveReading } from "@/lib/readings/client";
import { prepareReadingReveal } from "@/lib/readingReveal";
import { useReadingFlowStore } from "@/store/readingFlowStore";
import type { DrawDirection, TarotCard } from "@/types";

export default function DrawPage() {
  const router = useRouter();
  const completingRef = useRef(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const { question, contextInfo, selectedSpread, shuffledDeck, selectedCards, preparation, setSelectedCards, addSelectedCard, getReadingIdentity } = useReadingFlowStore();
  useEffect(() => {
    if (selectedSpread && preparation.phase !== "ready") router.replace("/shuffle");
  }, [selectedSpread, preparation.phase, router]);
  const deck = shuffledDeck.length ? shuffledDeck : tarotCards;
  const remaining = selectedSpread ? selectedSpread.count - selectedCards.length : 0;

  function selectCard(card: TarotCard, direction: DrawDirection) {
    if (!selectedSpread || completingRef.current || selectedCards.some((selected) => selected.card.id === card.id) || selectedCards.length >= selectedSpread.count) return false;
    const added = addSelectedCard(card, direction); setSaveError(""); setNeedsVerification(false);
    return added;
  }
  function redrawSelection() {
    if (completingRef.current || isDrawing || !selectedCards.length) return;
    setSelectedCards([]); setSaveError(""); setNeedsVerification(false);
  }
  async function confirmSelection() {
    if (!selectedSpread || completingRef.current || isDrawing || selectedCards.length !== selectedSpread.count) return;
    completingRef.current = true; setIsConfirming(true); setSaveError(""); setNeedsVerification(false);
    try {
      const { readingId, createdAt } = getReadingIdentity();
      await saveReading({ readingId, question, contextInfo, spread: selectedSpread, selectedCards, createdAt, aiStatus: "not_started" });
      prepareReadingReveal(readingId);
      router.push(`/result/${readingId}`);
    } catch (error) {
      completingRef.current = false; setIsConfirming(false);
      const verification = error instanceof HistoryServiceError && error.code === "verification";
      setNeedsVerification(verification);
      setSaveError(verification ? "网站需要验证当前浏览器。完成验证后，返回这里再次翻牌；已选牌会保留。"
        : error instanceof Error ? error.message : "保存历史记录失败，请重试。");
    }
  }

  return <RequireCloudAuth><ReadingLayout step={4} scene="draw">
    {!selectedSpread ? <PageNotice title="请先选择牌阵。" action={<button type="button" className="btn-primary" onClick={() => router.push("/spreads")}>返回牌阵</button>} />
      : preparation.phase !== "ready" ? <PageNotice title="请先完成洗牌与切牌。" /> : <div className="draw-layout">
        <TarotTable title="让直觉停留在一张牌上" fanDepthScale={.35} deck={deck} selectedCards={selectedCards} positions={selectedSpread.positions} onSelect={selectCard} onBusyChange={setIsDrawing}
          onRedraw={redrawSelection} onReveal={() => void confirmSelection()} saveError={saveError} isConfirming={isConfirming}
          saveErrorAction={needsVerification ? <a href="/" target="_blank" rel="noopener" className="text-link">完成网站验证（新窗口）</a> : undefined}
          disabled={!shuffledDeck.length || remaining === 0 || isConfirming} />
      </div>}
  </ReadingLayout></RequireCloudAuth>;
}
