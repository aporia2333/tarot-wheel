import raw from "./tarot_cards_merged_zh.json";
import type { Orientation, TarotCard } from "@/types";
import { getSkinCardImageSrc, getSkinCardBackSrc, type CardSkinId } from "./cardSkins";

type RawTarotData = { cards?: TarotCard[] } | TarotCard[];

const data = raw as RawTarotData;

export const tarotCards: TarotCard[] = Array.isArray(data) ? data : data.cards ?? [];
export const tarotCardById = new Map(tarotCards.map((card) => [card.id, card]));

export function getCardKnowledge(card: Partial<TarotCard>): TarotCard {
  const known = card.id ? tarotCardById.get(card.id) : undefined;
  // Some old snapshots only contain a name. Enrich them without rewriting stored history.
  const resolved = known ?? tarotCards.find((item) => item.nameEn === card.nameEn || item.nameEn === card.name);
  if (!resolved) throw new Error("记录中包含无法识别的塔罗牌。");
  return resolved;
}

export function getCardImageSrc(card: TarotCard, skin: CardSkinId = "original"): string {
  const skinImage = getSkinCardImageSrc(skin, card.id);
  if (skinImage) return skinImage;
  const path = card.imageUrl || card.img || "";
  if (!path) return "";
  return /^(\/|https?:\/\/)/.test(path) ? path : `/cards/${path}`;
}

export function getCardBackSrc(card?: TarotCard, skin: CardSkinId = "original"): string {
  const skinBack = getSkinCardBackSrc(skin);
  if (skinBack) return skinBack;
  const path = !card?.backImageUrl || card.backImageUrl === "/cards/back.png" ? "/cards/back.svg" : card.backImageUrl;
  return path.startsWith("/") ? path : `/cards/${path}`;
}

export function getCardMeaning(card: TarotCard, orientation: Orientation): string {
  return orientation === "reversed"
    ? card.reversedMeaningCn || `逆位参考：${getKeywords(card, orientation).join("、")}`
    : card.uprightMeaningCn || `正位参考：${getKeywords(card, orientation).join("、")}`;
}

export function getKeywords(card: TarotCard, orientation: Orientation): string[] {
  if (orientation === "upright") {
    return card.uprightKeywordsCn?.length ? card.uprightKeywordsCn : card.uprightKeywords ?? [];
  }
  return card.reversedKeywordsCn?.length ? card.reversedKeywordsCn : card.reversedKeywords ?? [];
}
