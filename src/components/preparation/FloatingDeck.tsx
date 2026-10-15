"use client";
import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from "react";
import type { sampleRitualMotion } from "@/lib/ritualMotion";

type Frame = ReturnType<typeof sampleRitualMotion>;
export interface FloatingDeckHandle { seek: (frame: Frame) => void }
/** One mounted visual per cardId. No representative cards or second visual permutation. */
export const FloatingDeck = forwardRef<FloatingDeckHandle, { frame: Frame; back: string; compact: boolean; orientations?: Record<string, string> }>(function FloatingDeck({ frame, back, compact, orientations = {} }, ref) {
  const root = useRef<SVGGElement>(null), cards = useRef(new Map<string, SVGGElement>()), lastOrder = useRef("");
  useLayoutEffect(() => { lastOrder.current = ""; });
  const transform = (card: Frame["cards"][number]) => `translate(${card.x.toFixed(3)} ${card.y.toFixed(3)}) rotate(${card.rotation.toFixed(3)}) scale(1 ${card.pitch.toFixed(3)})`;
  useImperativeHandle(ref, () => ({ seek(next) {
    next.cards.forEach(card => cards.current.get(card.cardId)?.setAttribute("transform", transform(card)));
    const sorted = [...next.cards].sort((a, b) => a.z - b.z || a.cardId.localeCompare(b.cardId));
    const order = sorted.map(card => card.cardId).join("|");
    if (order !== lastOrder.current) {
      sorted.forEach(card => { const node = cards.current.get(card.cardId); if (node) root.current?.append(node); });
      lastOrder.current = order;
    }
  } }));
  return <g ref={root} className="floating-cards" data-visual-card-count={frame.cards.length}>
    {[...frame.cards].sort((a, b) => a.z - b.z).map(card => <g key={card.cardId} ref={node => { if (node) cards.current.set(card.cardId, node); else cards.current.delete(card.cardId); }}
      data-card-id={card.cardId} data-source-packet={card.packetIndex} transform={transform(card)}>
      <rect x={-31} y={-50} width={62} height={102} rx={2} fill="#d8cdae" stroke="#a7946d" strokeWidth={compact ? .6 : .8} />
      <image href={back} x={-30} y={-49} width={60} height={100} preserveAspectRatio="none" transform={orientations[card.cardId] === "reversed" ? "rotate(180)" : undefined} />
    </g>)}
  </g>;
});
