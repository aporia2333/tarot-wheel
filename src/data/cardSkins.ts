import quqiSkin from "./quqiSkin.json";

export const cardSkins = [
  { id: "original", name: "原版皮肤" },
  { id: "quqi", name: "曲奇皮肤" },
] as const;

export type CardSkinId = typeof cardSkins[number]["id"];
export const CARD_SKIN_STORAGE_KEY = "tarot_card_skin_v1";

export function normalizeCardSkin(value: unknown): CardSkinId {
  return value === "quqi" ? "quqi" : "original";
}

const quqiImages: Readonly<Record<string, string>> = quqiSkin.cards;

export function getSkinCardImageSrc(skin: CardSkinId, cardId: string): string | undefined {
  return skin === "quqi" ? quqiImages[cardId] : undefined;
}

export function getSkinCardBackSrc(skin: CardSkinId): string | undefined {
  return skin === "quqi" ? quqiSkin.cardBackImageUrl : undefined;
}
