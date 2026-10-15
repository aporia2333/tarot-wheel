"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { TarotCard as TarotCardType } from "@/types";
import { getCardBackSrc } from "@/data/tarotCards";
import { useCardSkin } from "@/components/CardSkinProvider";

interface TarotWheelProps {
  deck: TarotCardType[]; selectedIds: string[]; onSelect: (card: TarotCardType) => void; disabled: boolean;
}

export function TarotWheel({ deck, selectedIds, onSelect, disabled }: TarotWheelProps) {
  const { skin } = useCardSkin();
  const backStyle = { backgroundImage: `url("${getCardBackSrc(undefined, skin)}"), url("${getCardBackSrc()}")`, backgroundSize: skin === "quqi" ? "contain" : "cover" };
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 899px)");
    const update = () => setExpanded(query.matches);
    update(); query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return <div>
    <div className="deck-toolbar"><span>{deck.length} 张牌，选择你停留的那一张。</span>
      <div className="view-switch" role="group" aria-label="牌组显示方式">
        <button type="button" aria-pressed={!expanded} onClick={() => setExpanded(false)}>圆轮</button>
        <button type="button" aria-pressed={expanded} onClick={() => setExpanded(true)}>展开牌组</button>
      </div>
    </div>
    <div className={`wheel-deck ${expanded ? "is-expanded" : ""}`} role="group" aria-label="待抽取的牌组">
      {deck.map((card, index) => {
        const ring = index % 3;
        const itemIndex = Math.floor(index / 3);
        const itemsInRing = Math.ceil((deck.length - ring) / 3);
        const angle = (itemIndex / itemsInRing) * Math.PI * 2 - Math.PI / 2 + ring * 0.08;
        const radius = ring === 0 ? 23 : ring === 1 ? 34 : 45;
        const left = 50 + Math.cos(angle) * radius;
        const top = 50 + Math.sin(angle) * radius;
        const selected = selectedIds.includes(card.id);
        const style = { "--card-x": `${left}%`, "--card-y": `${top}%`, "--card-angle": `${angle * 180 / Math.PI + 90}deg`,
          "--card-x-value": left, "--card-y-value": top } as CSSProperties;
        return <div key={card.id} className="wheel-card" style={style}>
          <button type="button" aria-label={`${selected ? "已选择" : "选择"}第 ${index + 1} 张牌`} aria-pressed={selected}
            disabled={disabled || selected} onClick={() => onSelect(card)} style={selected ? undefined : backStyle} className={`tarot-back ${selected ? "is-selected" : ""}`}>
            {selected ? <span>已选</span> : null}
          </button>
        </div>;
      })}
      <div className="wheel-center" aria-hidden="true"><strong>静心选牌</strong><span>{deck.length} 张牌</span></div>
    </div>
  </div>;
}
