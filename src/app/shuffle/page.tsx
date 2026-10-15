"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ReadingLayout } from "@/components/ReadingLayout";
import { PageNotice } from "@/components/PageNotice";
import { PreparationScene } from "@/components/PreparationScene";
import { useDealerCharacter } from "@/components/DealerCharacterProvider";
import type { DealerState } from "@/data/dealerCharacters";
import { PREPARATION_CONFIG, randomPreparationCount, validPreparationCount } from "@/lib/preparation";
import { useReadingFlowStore } from "@/store/readingFlowStore";
import "./preparation.css";

const dialogue: Record<string, { shuffle: string; cut: string; deciding: string }> = {
  "star-moon": { shuffle: "在翻开答案之前，我们先让牌回应你的心意。", cut: "牌已经渐渐安静下来了。我们再为它做最后一次整理。", deciding: "让我感受一下，这一次的节奏。" },
  scholar: { shuffle: "把问题留在心里。我们先将牌仔细整理一遍。", cut: "洗牌已经完成。接下来，重新确定牌的起点。", deciding: "稍等，我来决定合适的次数。" },
  quqi: { shuffle: "让心里的问题慢慢清晰。我陪你把牌准备好。", cut: "牌已经安静下来了。再整理一次，就可以开始。", deciding: "这一步交给我，我们慢慢来。" },
  "star-cap": { shuffle: "先停留片刻，让牌与此刻的心意相遇。", cut: "现在，给牌组一个新的起点。", deciding: "让我留意一下，牌传来的节奏。" },
};
export default function PreparationPage() {
  const router = useRouter();
  const { selectedSpread, preparation, shuffledDeck, baseOrientationByCardId, shuffleCount, cutCount, startPreparationStage, commitPreparationOperation } = useReadingFlowStore();
  const deckIds = useMemo(() => shuffledDeck.map(card => card.id), [shuffledDeck]);
  const { character } = useDealerCharacter();
  const [view, setView] = useState<"invite" | "count" | "deciding">("invite");
  const [count, setCount] = useState("1");
  const [error, setError] = useState("");
  const decidingRef = useRef(false);
  useEffect(() => { setCount("1"); setError(""); setView("invite"); decidingRef.current = false; }, [preparation.phase]);
  useEffect(() => {
    if (preparation.phase !== "ready") return;
    const timer = setTimeout(() => router.replace("/draw"), 800);
    return () => clearTimeout(timer);
  }, [preparation.phase, router]);
  // Product rule: one automatic cut. Keep the floating pose while the reader introduces it.
  useEffect(() => {
    if (!selectedSpread || preparation.phase !== "choose-cut") return;
    const timer = setTimeout(() => startPreparationStage("cut", 1, "tarotReader"), 550);
    return () => clearTimeout(timer);
  }, [selectedSpread, preparation.phase, startPreparationStage]);
  const choosing = preparation.phase === "choose-shuffle";
  const stage = preparation.phase === "choose-shuffle" || preparation.phase === "shuffling" ? "shuffle" : "cut";
  const verb = stage === "shuffle" ? "洗牌" : "切牌";
  const target = stage === "shuffle" ? preparation.shuffleTarget : preparation.cutTarget;
  const completed = stage === "shuffle" ? shuffleCount : cutCount;
  const dealerState: DealerState = preparation.phase === "ready" ? "finish" : choosing ? view === "deciding" ? "idle" : "talk" : stage;
  const voice = dialogue[character.id] ?? dialogue["star-moon"];
  const line = voice.shuffle;
  // Only this local thought cue precedes starting the persisted operation. Cleanup cancels it.
  useEffect(() => {
    if (view !== "deciding" || !choosing) return;
    const requested = randomPreparationCount(stage);
    const timer = setTimeout(() => startPreparationStage(stage, requested, "tarotReader"), 600);
    return () => clearTimeout(timer);
  }, [view, choosing, stage, startPreparationStage]);
  function begin() {
    if (!choosing || decidingRef.current) return;
    const requested = /^\d+$/.test(count.trim()) ? Number(count) : NaN;
    if (!validPreparationCount(requested)) { setError(`请输入 ${PREPARATION_CONFIG.manual.min}–${PREPARATION_CONFIG.manual.max} 之间的整数。`); return; }
    decidingRef.current = true;
    if (!startPreparationStage(stage, requested, "manual")) { decidingRef.current = false; setError("请重新确认本轮次数。"); }
  }
  function stepCount(delta: number) {
    const number = Number(count);
    setCount(String(Math.max(PREPARATION_CONFIG.manual.min, Math.min(PREPARATION_CONFIG.manual.max, (Number.isInteger(number) ? number : 1) + delta))));
    setError("");
  }
  return <ReadingLayout step={3} immersive>
    {!selectedSpread ? <PageNotice title="请先选择牌阵。" action={<button type="button" className="btn-primary" onClick={() => router.push("/spreads")}>返回牌阵</button>} />
      : <section className="preparation-room" aria-label="洗牌与切牌" aria-busy={!choosing && preparation.phase !== "ready"}>
        <PreparationScene character={character} state={dealerState} operation={preparation.pending} onComplete={commitPreparationOperation}
          holding={preparation.phase === "choose-cut"} deckIds={deckIds} orientations={baseOrientationByCardId}
          round={completed + 1} total={target} deciding={view === "deciding" && choosing} />
        <div className={`dealer-dialogue ${choosing ? view === "deciding" ? "dialogue-deciding" : "" : "dialogue-playing"}`} aria-live="polite">
          <span className="dealer-name">{character.name}</span>
          {choosing ? <>
            <h1 className="preparation-stage-title">先洗几次牌？</h1>
            <p className="reader-line">{view === "deciding" ? voice.deciding : line}</p>
            {view === "invite" ? <>
              <p className="reader-prompt">{verb}次数，由你决定，还是交给我？</p>
              <div className="preparation-choices">
                <button type="button" className="ritual-choice" onClick={() => setView("count")}>我来决定</button>
                <button type="button" className="ritual-choice" onClick={() => { if (!decidingRef.current) { decidingRef.current = true; setView("deciding"); } }}>交给你</button>
              </div>
            </> : view === "count" ? <form noValidate onSubmit={(event) => { event.preventDefault(); begin(); }} className="preparation-count-form">
              <label htmlFor="preparation-count" className="preparation-stage-title">自己指定{verb}次数</label>
              <div className="preparation-count-control">
                <button type="button" aria-label={`减少${verb}次数`} disabled={Number(count) <= PREPARATION_CONFIG.manual.min} onClick={() => stepCount(-1)}>−</button>
                <input id="preparation-count" aria-describedby="preparation-range" type="number" inputMode="numeric" min={PREPARATION_CONFIG.manual.min} max={PREPARATION_CONFIG.manual.max} step={1}
                  value={count} onChange={(event) => { setCount(event.target.value); setError(""); }} />
                <span>次</span>
                <button type="button" aria-label={`增加${verb}次数`} disabled={Number(count) >= PREPARATION_CONFIG.manual.max} onClick={() => stepCount(1)}>＋</button>
              </div>
              <small id="preparation-range">{PREPARATION_CONFIG.manual.min}–{PREPARATION_CONFIG.manual.max} 次</small>
              <div className="count-actions"><button type="submit" className="ritual-choice">开始{verb}</button>
                <button type="button" className="ritual-back" onClick={() => { setView("invite"); setError(""); }}>重新选择</button></div>
            </form> : <p className="reader-prompt">正在感受牌的节奏…</p>}
            {error ? <p className="inline-message" role="alert">{error}</p> : null}
          </> : <div className="preparation-running" role="status">
            <h1>{preparation.phase === "ready" ? "牌准备好了。" : stage === "cut" ? "水晶正在为你切牌" : `${verb} ${Math.min(completed + 1, target)} / ${target} 次`}</h1>
            <p>{preparation.phase === "ready" ? "接下来，请凭直觉抽取你的答案。" : preparation.phase === "choose-cut" ? "牌已回应水晶。接下来，交给我。" : stage === "cut" ? voice.cut : "把问题留在心里，让牌慢慢回应。"}</p>
          </div>}
        </div>
      </section>}
  </ReadingLayout>;
}
