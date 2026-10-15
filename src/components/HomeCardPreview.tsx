"use client";

import { CardArtwork } from "@/components/CardArtwork";
import { useCardSkin } from "@/components/CardSkinProvider";
import { getCardImageSrc, tarotCardById } from "@/data/tarotCards";

const previewIds = ["major-the-moon", "major-the-high-priestess", "major-the-star"];

export function HomeCardPreview() {
  const { skin } = useCardSkin();
  return <div className="home-triptych">{previewIds.map((id) => {
    const card = tarotCardById.get(id)!;
    return <div className="home-card" key={id}>
      <CardArtwork src={getCardImageSrc(card, skin)} fallbackSrc={getCardImageSrc(card)} name={card.nameCn}
        sizes="(max-width: 600px) 25vw, 180px" priority />
    </div>;
  })}</div>;
}
