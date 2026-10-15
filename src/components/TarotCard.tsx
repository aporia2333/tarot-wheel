"use client";

import { getCardImageSrc, getCardBackSrc } from "@/data/tarotCards";
import { CardArtwork } from "@/components/CardArtwork";
import { useCardSkin } from "@/components/CardSkinProvider";
import type { Orientation, TarotCard as TarotCardType } from "@/types";

interface TarotCardProps {
  card?: TarotCardType; orientation?: Orientation; faceDown?: boolean; compact?: boolean; onClick?: () => void; label?: string;
}
export function TarotCard({ card, orientation = "upright", faceDown = false, compact = false, onClick, label }: TarotCardProps) {
  const { skin } = useCardSkin();
  const className = `tarot-card ${compact ? "is-compact" : ""}`;
  const content = faceDown || !card
    ? <div className="tarot-back" style={{ backgroundImage: `url("${getCardBackSrc(card, skin)}"), url("${getCardBackSrc(card)}")`, backgroundSize: skin === "quqi" ? "contain" : "cover" }}>{label ? <span>{label}</span> : null}</div>
    : <CardArtwork src={getCardImageSrc(card, skin)} fallbackSrc={getCardImageSrc(card)} name={card.nameCn || card.nameEn} orientation={orientation} sizes={compact ? "96px" : "176px"} />;
  return onClick ? <button type="button" className={className} onClick={onClick} aria-label={label || card?.nameCn || "选择塔罗牌"}>{content}</button>
    : <div className={className} aria-hidden={faceDown || undefined}>{content}</div>;
}
