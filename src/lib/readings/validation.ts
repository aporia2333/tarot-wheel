import { tarotCardById } from "@/data/tarotCards";
import { normalizeSelectedSpread } from "@/lib/customSpreads";
import { resolveDrawOrientation } from "@/lib/draw";
import type { AiInterpretation, SelectedCard, TarotReading } from "@/types";

export class ReadingValidationError extends Error {}
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

// New records use authoritative definitions; clients cannot forge card meanings or AI completion.
export function normalizeNewReading(value: unknown): TarotReading {
  const invalid = (message = "历史记录格式无效。") => { throw new ReadingValidationError(message); };
  if (!isRecord(value) || !isUuid(value.readingId)) return invalid();
  if (typeof value.question !== "string" || typeof value.contextInfo !== "string") return invalid();
  if (value.question.length > 2000 || value.contextInfo.length > 5000) return invalid("问题或背景信息超过允许长度。");
  if (typeof value.createdAt !== "string" || !Number.isFinite(Date.parse(value.createdAt))) return invalid("记录时间无效。");
  if (!isRecord(value.spread) || typeof value.spread.id !== "string" || typeof value.spread.count !== "number") return invalid("牌阵格式无效。");
  let spread;
  try { spread = normalizeSelectedSpread(value.spread); } catch (error) { return invalid(error instanceof Error ? error.message : "牌阵格式无效。"); }
  if (!Array.isArray(value.selectedCards) || value.selectedCards.length !== spread.count) return invalid("所选牌数与牌阵不一致。");
  const seen = new Set<string>();
  const selectedCards = value.selectedCards.map<SelectedCard>((selected, index) => {
    if (!isRecord(selected) || !isRecord(selected.card) || typeof selected.card.id !== "string") return invalid("塔罗牌信息不完整。");
    const card = tarotCardById.get(selected.card.id);
    if (!card || seen.has(card.id)) return invalid("所选牌包含未知或重复的塔罗牌。");
    if (selected.orientation !== "upright" && selected.orientation !== "reversed") return invalid("正逆位信息无效。");
    const hasDrawMetadata = selected.drawDirection !== undefined || selected.baseOrientation !== undefined;
    if (hasDrawMetadata && ((selected.drawDirection !== "up" && selected.drawDirection !== "down") ||
      (selected.baseOrientation !== "upright" && selected.baseOrientation !== "reversed") ||
      resolveDrawOrientation(selected.baseOrientation, selected.drawDirection) !== selected.orientation)) {
      return invalid("抽牌方向与正逆位信息不一致。");
    }
    if (spread.id === "custom" && selected.position !== spread.positions[index]) return invalid("所选牌的顺序与自定义牌位不一致，请重新读取本次选牌。");
    seen.add(card.id);
    return { card, orientation: selected.orientation, position: spread.positions[index],
      ...(hasDrawMetadata ? { baseOrientation: selected.baseOrientation as "upright" | "reversed", drawDirection: selected.drawDirection as "up" | "down" } : {}) };
  });
  return { readingId: value.readingId, question: value.question.trim(), contextInfo: value.contextInfo.trim(),
    spread, selectedCards, createdAt: value.createdAt, aiStatus: "not_started" };
}

// Historical snapshots keep their saved names, positions and optional metadata.
export function isStoredReading(value: unknown): value is TarotReading {
  return isRecord(value) && typeof value.readingId === "string" &&
    typeof value.question === "string" && typeof value.contextInfo === "string" &&
    typeof value.createdAt === "string" && Number.isFinite(Date.parse(value.createdAt)) &&
    isRecord(value.spread) && typeof value.spread.name === "string" &&
    Array.isArray(value.spread.positions) && Array.isArray(value.selectedCards) &&
    value.selectedCards.every((selected) => isRecord(selected) && isRecord(selected.card) &&
      (selected.orientation === "upright" || selected.orientation === "reversed"));
}

export function isAiInterpretation(value: unknown, count: number): value is AiInterpretation {
  return count > 0 && isRecord(value) && typeof value.summary === "string" && Boolean(value.summary.trim()) &&
    Array.isArray(value.cards) && value.cards.length === count && value.cards.every((card) =>
      isRecord(card) && typeof card.position === "string" && typeof card.cardName === "string" &&
      typeof card.interpretation === "string" && Boolean(card.interpretation.trim()) &&
      (card.orientation === "upright" || card.orientation === "reversed")) &&
    (value.overview === undefined || isAiOverview(value.overview));
}

export function isAiOverview(value: unknown): value is NonNullable<AiInterpretation["overview"]> {
  return isRecord(value) && ["theme", "tension", "nextStep"].every((key) => typeof value[key] === "string" &&
    Boolean((value[key] as string).trim()) && (value[key] as string).length <= 400);
}
