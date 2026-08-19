import type { TarotCard } from "@/types";

export function shuffleDeck(cards: TarotCard[]): TarotCard[] {
  const deck = [...cards];
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
  }
  return deck;
}

export function cutDeck(deck: TarotCard[], index: number): TarotCard[] {
  if (!deck.length) return [];
  const cutIndex = Math.max(0, Math.min(deck.length - 1, index));
  return [...deck.slice(cutIndex), ...deck.slice(0, cutIndex)];
}
