"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PreparationScene } from "@/components/PreparationScene";
import { useDealerCharacter } from "@/components/DealerCharacterProvider";
import { TarotTable } from "@/components/TarotTable";
import { getCardBackSrc, getCardImageSrc, tarotCards } from "@/data/tarotCards";
import { applyPreparationOperation, createMagicPreparationOperation, CUT_ACTIONS, type PreparationAction, type PreparationOperation } from "@/lib/preparation";
import { seededRandomInt } from "@/lib/random";
import { RitualDebugger } from "@/components/preparation/RitualDebugger";
import { useCardSkin } from "@/components/CardSkinProvider";
import { createDeckOrientations, resolveDrawOrientation } from "@/lib/draw";
import { shuffleDeck } from "@/lib/shuffle";
import type { DrawDirection, DrawnCard, TarotCard } from "@/types";
import "../shuffle/preparation.css";
import "./preview.css";

type View = "motion" | "home" | "draw" | "result";
const exampleCards = [tarotCards[0], tarotCards[9], tarotCards[17]];
const previewPositions = ["当下", "需要留意", "下一步"];

export default function DesignPreview() {
  const router = useRouter();
  const params = useSearchParams();
  const requested = params.get("view");
  const view: View = requested === "home" || requested === "draw" || requested === "result" ? requested : "motion";
  const setView = (next: View) => router.replace(`/design-preview?view=${next}`, { scroll: false });
  const { character } = useDealerCharacter();
  const [operation, setOperation] = useState<PreparationOperation | null>(null);
  const [played, setPlayed] = useState(false);
  const [motionDeck, setMotionDeck] = useState(() => tarotCards.map(card => card.id));
  const [motionOrientations, setMotionOrientations] = useState(() => createDeckOrientations(tarotCards));
  const [holding, setHolding] = useState(false), [motionRound, setMotionRound] = useState(1);
  const [inspection, setInspection] = useState<number | null>(null);
  const debugging = process.env.NODE_ENV === "development" && params.get("debug") === "1";
  const [prepared] = useState(() => ({ deck: shuffleDeck(tarotCards), orientations: createDeckOrientations(tarotCards) }));
  const [chosen, setChosen] = useState<DrawnCard[]>([]);
  const chosenRef = useRef<DrawnCard[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const { skin } = useCardSkin();
  const back = getCardBackSrc(undefined, skin);
  const revealedCards = chosen.length === previewPositions.length ? chosen
    : exampleCards.map(card => ({ card, orientation: "upright" as const }));

  function selectCard(card: TarotCard, direction: DrawDirection) {
    const selected = chosenRef.current;
    if (isDrawing || selected.length >= previewPositions.length || selected.some(value => value.card.id === card.id)) return false;
    const baseOrientation = prepared.orientations[card.id];
    const next = [...selected, { card, baseOrientation, drawDirection: direction,
      orientation: resolveDrawOrientation(baseOrientation, direction), position: previewPositions[selected.length] }];
    chosenRef.current = next;
    setChosen(next);
    return true;
  }

  function clearSelection() {
    if (isDrawing) return;
    chosenRef.current = [];
    setChosen([]);
  }
  function playMotion(stage: "shuffle" | "cut") {
    setPlayed(false); setInspection(null); setMotionRound(stage === "shuffle" && holding ? 2 : 1);
    setOperation(createMagicPreparationOperation(motionDeck, stage, stage === "shuffle" ? "packets" : "triple"));
  }
  function finishMotion(id: string) {
    if (operation?.id !== id) return;
    const result = applyPreparationOperation(operation, motionOrientations);
    setMotionDeck(result.ids); setMotionOrientations(result.orientations); setHolding(operation.stage === "shuffle"); setOperation(null); setPlayed(true);
  }
  function loadReplay(seed: number, action: PreparationAction) {
    const ids = tarotCards.map(card => card.id), stage = CUT_ACTIONS.includes(action as never) ? "cut" : "shuffle";
    setMotionDeck(ids); setMotionOrientations(Object.fromEntries(ids.map((id, index) => [id, index % 2 ? "reversed" : "upright"])));
    setMotionRound(1); setHolding(stage === "cut"); setInspection(0);
    setOperation(createMagicPreparationOperation(ids, stage, action, seededRandomInt(seed), `seed-${seed}-${action}`));
  }
  return <main id="main-content" tabIndex={-1} className={`xingyue-preview preview-${view}`}>
    {view === "motion" ? <div className="preparation-shell preview-motion-room">
      <section className="preparation-room" aria-label={`${character.name}洗牌样例`}>
        <PreparationScene character={character} state={operation ? operation.stage : played && !holding ? "finish" : "talk"} operation={operation}
          holding={!operation && holding} deckIds={motionDeck} orientations={motionOrientations} round={motionRound} total={motionRound}
          inspectionProgress={debugging ? inspection : null} onComplete={finishMotion} />
        <div className={`dealer-dialogue ${operation ? "dialogue-playing" : ""}`}>
          <span className="dealer-name">{character.name}</span>
          <p className="reader-line">{operation ? "水晶会替我们记住牌的节奏。" : holding ? "牌已悬浮。接下来，让水晶为它确定新的起点。" : played ? "牌已经安静地落回桌上。" : "让水晶的微光，唤起牌的回应。"}</p>
          <div className="preparation-choices preview-play">
            <button type="button" className="ritual-choice" disabled={Boolean(operation)}
              onClick={() => playMotion("shuffle")}>
              {operation?.stage === "shuffle" ? "正在洗牌…" : "播放洗牌"}
            </button>
            <button type="button" className="ritual-choice" disabled={Boolean(operation) || !holding}
              onClick={() => playMotion("cut")}>
              {operation?.stage === "cut" ? "正在切牌…" : "播放切牌"}
            </button>
          </div>
        </div>
        {debugging ? <RitualDebugger operation={operation} progress={inspection} onLoad={loadReplay} onSeek={setInspection} onPlay={() => setInspection(null)} /> : null}
      </section>
    </div> : <div className="vision-room">
      {view === "home" ? <section className="vision-home">
        <div className="vision-home-copy"><h1>星月之间</h1><p className="vision-intro">为此刻的心事，<br />留一段安静的阅读。</p>
          <p className="vision-home-detail">月光落在窗边，牌已在桌上。<br />从一个问题开始，慢慢看见自己的答案。</p>
          <div className="vision-home-actions"><button type="button" className="vision-primary" onClick={() => setView("draw")}>开始阅读</button><button type="button" className="vision-text" onClick={() => setView("result")}>回看阅读记录</button></div>
        </div>
        <div className="vision-home-table" aria-hidden="true"><img className="vision-table-art" src="/scenes/preparation/table-v1.png" alt="" />
          <div className="vision-home-deck">{[0,1,2].map(i => <img key={i} src={back} alt="" style={{ transform: `translate(${i * 2}px, ${i * -3}px)` }} />)}</div>
        </div>
        <p className="vision-home-foot">把心事放在这里，把选择留给自己。</p>
      </section> : view === "draw" ? <section className="vision-draw">
        <TarotTable title="让直觉停留在一张牌上" deck={prepared.deck} selectedCards={chosen} positions={previewPositions}
          placementStorageKey="tarot_preview_placement_v1" fanDepthScale={.35} onSelect={selectCard} onBusyChange={setIsDrawing}
          onRedraw={clearSelection} onReveal={() => { if (!isDrawing && chosen.length === previewPositions.length) setView("result"); }}
          isConfirming={false} disabled={chosen.length >= previewPositions.length} />
      </section> : <section className="vision-result">
        <div className="vision-result-heading"><div><span>三张牌 · 当下的选择</span><h1>让答案慢慢展开</h1></div><button type="button" className="vision-text" onClick={() => { clearSelection(); setView("draw"); }}>开始新的阅读</button></div>
        <div className="vision-result-content"><div className="vision-revealed-cards">{revealedCards.map(({card, orientation}, index) => <figure key={card.id}>
          <span>{previewPositions[index]}</span><img src={getCardImageSrc(card, skin)} alt={`${card.nameCn}，${orientation === "reversed" ? "逆位" : "正位"}`}
            style={{ transform: orientation === "reversed" ? "rotate(180deg)" : undefined }} /><figcaption>{card.nameCn}<span>{orientation === "reversed" ? "逆位" : "正位"}</span></figcaption>
        </figure>)}</div>
          <article className="vision-reading"><p className="vision-question">我该如何看待目前的职业选择？</p><h2>在启程之前，先听见自己</h2>
            <p>新的可能性已经出现，而你仍需要一段安静的时间，辨认真正想走的方向。可以带着好奇开始，也给自己的判断留出余地。</p>
            <p>先梳理让你犹豫的原因，再把理想中的改变拆成一个可以尝试的小步骤。清晰的感受与实际的经验，会逐渐帮助你作出选择。</p>
            <details><summary>查看每张牌的参考含义</summary><p>这里将保留牌位、正逆位与原有参考含义，供你结合自己的处境阅读。</p></details>
            <label htmlFor="preview-followup">继续谈谈你的想法</label><textarea id="preview-followup" rows={2} placeholder="还有哪一部分让你犹豫？" />
            <div className="vision-reading-footer"><span>解读文字为界面示例。</span><button type="button" className="vision-secondary" onClick={() => document.getElementById("preview-followup")?.focus()}>继续提问</button></div>
          </article></div>
      </section>}
    </div>}
  </main>;
}
