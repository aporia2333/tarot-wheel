"use client";

import Image from "next/image";
import { useCardSkin } from "@/components/CardSkinProvider";
import { getCardBackSrc } from "@/data/tarotCards";

export function HomeTable() {
  const { skin } = useCardSkin();
  return <div className="home-room-table" aria-hidden="true">
    <Image src="/scenes/preparation/table-v1.png" alt="" fill sizes="(max-width: 767px) 150vw, 75vw" priority />
    <div className="home-room-deck">{[0, 1, 2].map(layer => <span key={layer} className="table-card-back"
      style={{ backgroundImage: `url("${getCardBackSrc(undefined, skin)}"), url("${getCardBackSrc()}")`,
        transform: `translate(${layer * 2}px, ${layer * -3}px)` }} />)}</div>
  </div>;
}
