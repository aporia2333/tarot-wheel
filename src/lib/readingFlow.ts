import { tarotCards, tarotCardById } from "@/data/tarotCards";
import { normalizeSelectedSpread } from "@/lib/customSpreads";
import { isRecord, isUuid } from "@/lib/readings/validation";
import { createDeckOrientations, resolveDrawOrientation } from "@/lib/draw";
import { emptyPreparation, restorePreparation, type PreparationState } from "@/lib/preparation";
import type { DrawnCard, Orientation, TarotCard, TarotSpread } from "@/types";

export interface ReadingFlowSnapshot {
  question: string;
  contextInfo: string;
  selectedSpread: TarotSpread | null;
  shuffledDeck: TarotCard[];
  selectedCards: DrawnCard[];
  baseOrientationByCardId: Record<string, Orientation>;
  readingId: string | null;
  readingCreatedAt: string | null;
  shuffleCount: number;
  cutCount: number;
  preparation: PreparationState;
}

export function restoreReadingFlow(value: unknown): ReadingFlowSnapshot | null {
  if (!isRecord(value) || typeof value.question !== "string" || typeof value.contextInfo !== "string" ||
    value.question.length > 2000 || value.contextInfo.length > 5000 || !Array.isArray(value.shuffledDeck) || !Array.isArray(value.selectedCards)) return null;
  if (!Number.isSafeInteger(value.shuffleCount) || (value.shuffleCount as number) < 0 ||
    !Number.isSafeInteger(value.cutCount) || (value.cutCount as number) < 0) return null;
  const deckIds = value.shuffledDeck.map((card) => isRecord(card) ? card.id : null);
  if (deckIds.length && (deckIds.length !== tarotCards.length || new Set(deckIds).size !== tarotCards.length ||
    !deckIds.every((id) => typeof id === "string" && tarotCardById.has(id)))) return null;
  let selectedSpread: TarotSpread | null = null;
  if (value.selectedSpread !== null) {
    if (!isRecord(value.selectedSpread) || typeof value.selectedSpread.id !== "string" || typeof value.selectedSpread.count !== "number") return null;
    try { selectedSpread = normalizeSelectedSpread(value.selectedSpread); } catch { return null; }
  }
  if (value.selectedCards.length && (!selectedSpread || !deckIds.length || value.selectedCards.length > selectedSpread.count)) return null;
  const selectedCards: DrawnCard[] = [];
  const baseOrientationByCardId: Record<string, Orientation> = {};
  if (!isRecord(value.baseOrientationByCardId) || Object.keys(value.baseOrientationByCardId).length !== deckIds.length) return null;
  for (const [id, orientation] of Object.entries(value.baseOrientationByCardId)) {
    if (!deckIds.includes(id) || (orientation !== "upright" && orientation !== "reversed")) return null;
    baseOrientationByCardId[id] = orientation;
  }
  for (const selected of value.selectedCards) {
    if (!isRecord(selected) || !isRecord(selected.card) || typeof selected.card.id !== "string") return null;
    const card = tarotCardById.get(selected.card.id);
    if (!card || selectedCards.some((item) => item.card.id === card.id) ||
      (selected.drawDirection !== "up" && selected.drawDirection !== "down") ||
      baseOrientationByCardId[card.id] !== selected.baseOrientation ||
      resolveDrawOrientation(baseOrientationByCardId[card.id], selected.drawDirection) !== selected.orientation) return null;
    if (selectedSpread?.id === "custom" && selected.position !== selectedSpread.positions[selectedCards.length]) return null;
    selectedCards.push({ card, orientation: selected.orientation as Orientation, baseOrientation: baseOrientationByCardId[card.id],
      drawDirection: selected.drawDirection, position: selectedSpread!.positions[selectedCards.length] });
  }
  if (value.readingId !== null && !isUuid(value.readingId)) return null;
  if (value.readingCreatedAt !== null && (typeof value.readingCreatedAt !== "string" || !Number.isFinite(Date.parse(value.readingCreatedAt)))) return null;
  if (Boolean(value.readingId) !== Boolean(value.readingCreatedAt)) return null;
  const preparation = value.preparation === undefined
    ? deckIds.length ? { ...emptyPreparation(), phase: "ready" as const, shuffleTarget: value.shuffleCount as number,
      cutTarget: value.cutCount as number, legacyReady: true as const } : emptyPreparation()
    : restorePreparation(value.preparation, deckIds as string[], value.shuffleCount as number, value.cutCount as number);
  if (!preparation || (selectedCards.length && preparation.phase !== "ready")) return null;
  return { question: value.question, contextInfo: value.contextInfo, selectedSpread,
    shuffledDeck: deckIds.map((id) => tarotCardById.get(id as string)!), selectedCards, baseOrientationByCardId,
    readingId: value.readingId as string | null, readingCreatedAt: value.readingCreatedAt as string | null,
    shuffleCount: value.shuffleCount as number, cutCount: value.cutCount as number, preparation };
}

// Upgrade a valid v1 session once. Already drawn cards retain their exact result;
// previously unseen orientations are fixed during this migration and then persisted.
export function migrateReadingFlow(value: unknown): ReadingFlowSnapshot | null {
  if (!isRecord(value) || !Array.isArray(value.shuffledDeck) || !Array.isArray(value.selectedCards) || !isRecord(value.orientationByCardId)) return null;
  const deck = value.shuffledDeck.map((card) => isRecord(card) && typeof card.id === "string" ? tarotCardById.get(card.id) : undefined);
  if (deck.some((card) => !card) || (deck.length && (deck.length !== tarotCards.length || new Set(deck.map((card) => card!.id)).size !== tarotCards.length))) return null;
  const knownOrientations: Record<string, Orientation> = {};
  for (const [id, orientation] of Object.entries(value.orientationByCardId)) {
    if (!deck.some((card) => card!.id === id) || (orientation !== "upright" && orientation !== "reversed")) return null;
    knownOrientations[id] = orientation;
  }
  const selectedCards = [];
  for (const selected of value.selectedCards) {
    if (!isRecord(selected) || !isRecord(selected.card) || typeof selected.card.id !== "string" ||
      !knownOrientations[selected.card.id] || knownOrientations[selected.card.id] !== selected.orientation) return null;
    selectedCards.push({ ...selected, baseOrientation: selected.orientation, drawDirection: "up" });
  }
  return restoreReadingFlow({ ...value,
    baseOrientationByCardId: { ...createDeckOrientations(deck as TarotCard[]), ...knownOrientations }, selectedCards });
}
