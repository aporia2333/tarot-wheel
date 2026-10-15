"use client";

import { cardSkins, normalizeCardSkin } from "@/data/cardSkins";
import { useCardSkin } from "@/components/CardSkinProvider";

export function CardSkinSelector() {
  const { skin, setSkin } = useCardSkin();
  return <label className="card-skin-selector">
    <span>牌面皮肤</span>
    <select value={skin} onChange={(event) => setSkin(normalizeCardSkin(event.target.value))}>
      {cardSkins.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
    </select>
  </label>;
}
