"use client";

import type { CSSProperties } from "react";
import { CardArtwork } from "@/components/CardArtwork";
import { getCardKnowledge, getCardImageSrc, getCardBackSrc } from "@/data/tarotCards";
import { useCardSkin } from "@/components/CardSkinProvider";
import type { CardSkinId } from "@/data/cardSkins";
import type { SelectedCard, TarotCard } from "@/types";

type LegacyTarotCard = Partial<TarotCard> & { src?: string; image?: string; imagePath?: string; imageSrc?: string };
type LegacySelectedCard = Partial<SelectedCard> & { card?: LegacyTarotCard; positionName?: string; positionLabel?: string };

export function getDisplayImageSrc(card?: LegacyTarotCard, skin: CardSkinId = "original"): string {
  if (card && skin === "quqi") {
    try { return getCardImageSrc(getCardKnowledge(card), skin); }
    catch { /* Unrecognized legacy cards retain their saved artwork. */ }
  }
  let path = card?.imageUrl || card?.img || card?.imageSrc || card?.imagePath || card?.image || card?.src;
  if (!path && card) { try { path = getCardKnowledge(card).imageUrl; } catch { /* Preserve incomplete old snapshots with a readable fallback. */ } }
  return !path ? "" : /^(\/|https?:\/\/)/.test(path) ? path : `/cards/${path}`;
}
export function ReadingCardsDisplay({ selectedCards, reveal = false }: { selectedCards: LegacySelectedCard[]; reveal?: boolean }) {
  const { skin } = useCardSkin();
  const cards = selectedCards ?? [];
  const columns = Math.max(1, Math.min(cards.length, 7));
  const style = { "--columns": columns, "--gallery-width": `${columns * 190 + (columns - 1) * 28}px` } as CSSProperties;
  return <section className={`reading-cards ${reveal ? "is-revealing" : ""}`} style={style} aria-label="本次抽到的牌">
    {cards.map((selected, index) => {
      const card = selected.card;
      const name = card?.nameCn || card?.name || card?.nameEn || "未知塔罗牌";
      const position = selected.position || selected.positionName || selected.positionLabel || `位置 ${index + 1}`;
      const orientation = selected.orientation === "reversed" ? "reversed" : "upright";
      const src = getDisplayImageSrc(card, skin);
      return <article key={`${card?.id || name}-${index}`} id={`reading-card-${index}`} className="reading-card">
        <p className="card-position">{position}</p>
        <div className="card-frame">{reveal ? <div className="card-reveal">
          <div className="card-reveal-front"><CardArtwork src={src} fallbackSrc={getDisplayImageSrc(card)} name={name} orientation={orientation} sizes="(max-width: 600px) 30vw, 190px" /></div>
          <div className="card-reveal-back table-card-back" style={{ backgroundImage: `url("${getCardBackSrc(undefined, skin)}"), url("${getCardBackSrc()}")` }} aria-hidden="true" />
        </div> : <CardArtwork src={src} fallbackSrc={getDisplayImageSrc(card)} name={name} orientation={orientation} sizes="(max-width: 600px) 30vw, 190px" />}</div>
        <h2>{name}</h2><p className={`orientation-label ${orientation === "reversed" ? "is-reversed" : ""}`}>{orientation === "reversed" ? "逆位" : "正位"}</p>
      </article>;
    })}
  </section>;
}
