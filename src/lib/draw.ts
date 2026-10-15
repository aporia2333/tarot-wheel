import { randomInt } from "@/lib/random";
import type { DrawDirection, Orientation, TarotCard } from "@/types";

export function createDeckOrientations(deck: TarotCard[]): Record<string, Orientation> {
  return Object.fromEntries(deck.map((card) => [card.id, randomInt(2) === 0 ? "upright" : "reversed"]));
}

export function resolveDrawOrientation(baseOrientation: Orientation, direction: DrawDirection): Orientation {
  return direction === "up" ? baseOrientation : baseOrientation === "upright" ? "reversed" : "upright";
}
