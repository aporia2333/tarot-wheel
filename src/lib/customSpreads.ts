import { getSpreadDefinition, MAX_CUSTOM_CARDS, toTarotSpread } from "@/data/spreads";
import type { TarotSpread } from "@/types";

export { MAX_CUSTOM_CARDS };
export const CUSTOM_NAME_LIMIT = 60;
export const POSITION_MEANING_LIMIT = 300;
export class SpreadValidationError extends Error {}

const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const fail = (message: string): never => { throw new SpreadValidationError(message); };

export function normalizeCustomSpread(value: unknown): TarotSpread {
  if (!record(value) || value.id !== "custom") return fail("自定义牌阵格式无效。");
  const count = value.count;
  if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 1 || count > MAX_CUSTOM_CARDS) return fail("自定义牌阵需要 1～13 张牌。");
  if (typeof value.name !== "string" || !value.name.trim() || value.name.length > CUSTOM_NAME_LIMIT) return fail("请填写 1～60 字的牌阵名称。");
  if (!Array.isArray(value.positions) || value.positions.length !== count) return fail("牌位数量需要与牌数一致。");
  const seen = new Set<string>();
  const positions = value.positions.map((name, index) => {
    if (typeof name !== "string" || !name.trim() || name.length > CUSTOM_NAME_LIMIT) return fail(`请为第 ${index + 1} 个牌位填写 1～60 字的名称。`);
    const key = name.trim().replace(/\s+/g, " ").toLocaleLowerCase();
    if (seen.has(key)) return fail(`牌位名称“${name.trim()}”重复，请用不同名称区分每个位置。`);
    seen.add(key); return name.trim();
  });
  let positionMeanings: string[] | undefined;
  if (value.positionMeanings !== undefined) {
    if (!Array.isArray(value.positionMeanings) || value.positionMeanings.length !== count ||
        value.positionMeanings.some((meaning) => typeof meaning !== "string" || meaning.length > POSITION_MEANING_LIMIT)) return fail("每个牌位的含义应与牌位一一对应，且不超过 300 字。");
    const meanings = (value.positionMeanings as string[]).map((meaning) => meaning.trim());
    if (meanings.some(Boolean)) positionMeanings = meanings;
  }
  if (value.description !== undefined && (typeof value.description !== "string" || value.description.length > 500)) return fail("牌阵说明不能超过 500 字。");
  if (value.suitableFor !== undefined && (typeof value.suitableFor !== "string" || value.suitableFor.length > 300)) return fail("牌阵用途不能超过 300 字。");
  return { id: "custom", name: value.name.trim(), count,
    description: typeof value.description === "string" ? value.description.trim() : "按自定义牌位顺序展开阅读。",
    suitableFor: typeof value.suitableFor === "string" ? value.suitableFor.trim() : "自定义问题与观察角度",
    positions, ...(positionMeanings ? { positionMeanings } : {}) };
}

// Preset definitions remain authoritative. Only custom spreads accept user-authored positions.
export function normalizeSelectedSpread(value: unknown): TarotSpread {
  if (!record(value) || typeof value.id !== "string" || typeof value.count !== "number") return fail("牌阵格式无效。");
  if (value.id === "custom") return normalizeCustomSpread(value);
  const definition = getSpreadDefinition(value.id);
  if (!definition || !definition.countOptions.some((option) => option.value === value.count)) return fail("牌阵或抽牌数量无效。");
  return toTarotSpread(definition, value.count);
}

export function sameSpreadSelection(first: TarotSpread | null, second: TarotSpread): boolean {
  if (!first || first.id !== second.id || first.count !== second.count) return false;
  if (first.id !== "custom") return true;
  return first.name === second.name && first.description === second.description && first.suitableFor === second.suitableFor &&
    JSON.stringify(first.positions) === JSON.stringify(second.positions) &&
    JSON.stringify(first.positionMeanings || []) === JSON.stringify(second.positionMeanings || []);
}

export interface CustomSpreadDraft { name: string; count: number; slots: Array<{ name: string; meaning: string }>; templateId?: string }
export function createCustomDraft(spread?: TarotSpread | null): CustomSpreadDraft {
  return { name: spread?.name || "我的牌阵", count: spread?.count || 3,
    slots: Array.from({ length: MAX_CUSTOM_CARDS }, (_, index) => ({ name: spread?.positions[index] || `第 ${index + 1} 张`, meaning: spread?.positionMeanings?.[index] || "" })) };
}
export function spreadFromDraft(draft: CustomSpreadDraft): TarotSpread {
  return normalizeCustomSpread({ id: "custom", name: draft.name, count: draft.count,
    positions: draft.slots.slice(0, draft.count).map((slot) => slot.name), positionMeanings: draft.slots.slice(0, draft.count).map((slot) => slot.meaning) });
}
export function isCustomDraft(value: unknown): value is CustomSpreadDraft {
  return record(value) && typeof value.name === "string" && value.name.length <= CUSTOM_NAME_LIMIT &&
    (value.templateId === undefined || (typeof value.templateId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.templateId))) &&
    typeof value.count === "number" && Number.isSafeInteger(value.count) && value.count >= 1 && value.count <= MAX_CUSTOM_CARDS &&
    Array.isArray(value.slots) && value.slots.length === MAX_CUSTOM_CARDS && value.slots.every((slot) => record(slot) &&
      typeof slot.name === "string" && slot.name.length <= CUSTOM_NAME_LIMIT && typeof slot.meaning === "string" && slot.meaning.length <= POSITION_MEANING_LIMIT);
}
