import raw from "./tarot_cards_merged_zh.json";
import type { Orientation, TarotCard } from "@/types";

type RawTarotData = { cards?: TarotCard[] } | TarotCard[];

const data = raw as RawTarotData;

export const tarotCards: TarotCard[] = Array.isArray(data) ? data : data.cards ?? [];

export function getCardImageSrc(card: TarotCard): string {
  const path = card.imageUrl || card.img || "";
  if (!path) return "";
  return path.startsWith("/") ? path : `/cards/${path}`;
}

export function getCardBackSrc(card?: TarotCard): string {
  const path = card?.backImageUrl || "/cards/back.png";
  return path.startsWith("/") ? path : `/cards/${path}`;
}

export function getKeywords(card: TarotCard, orientation: Orientation): string[] {
  if (orientation === "upright") {
    return card.uprightKeywordsCn?.length ? card.uprightKeywordsCn : card.uprightKeywords ?? [];
  }
  return card.reversedKeywordsCn?.length ? card.reversedKeywordsCn : card.reversedKeywords ?? [];
}
