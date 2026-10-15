import { createReadingId } from "@/lib/ids";
import { isCustomDraft, normalizeCustomSpread, type CustomSpreadDraft } from "@/lib/customSpreads";
import type { TarotSpread } from "@/types";

export const CUSTOM_DRAFT_KEY = "tarot_custom_spread_draft_v1";
export const CUSTOM_TEMPLATES_KEY = "tarot_custom_spread_templates_v1";
export const MAX_CUSTOM_TEMPLATES = 20;
export interface CustomSpreadTemplate { id: string; spread: TarotSpread; updatedAt: string }

export function loadCustomDraft(): CustomSpreadDraft | null {
  try { const value: unknown = JSON.parse(sessionStorage.getItem(CUSTOM_DRAFT_KEY) || "null"); return isCustomDraft(value) ? value : null; } catch { return null; }
}
export function saveCustomDraft(draft: CustomSpreadDraft) { try { sessionStorage.setItem(CUSTOM_DRAFT_KEY, JSON.stringify(draft)); } catch { /* The editor continues in memory. */ } }
export function clearCustomDraft() { try { sessionStorage.removeItem(CUSTOM_DRAFT_KEY); } catch { /* Storage may be unavailable. */ } }

export function loadCustomTemplates(): CustomSpreadTemplate[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(CUSTOM_TEMPLATES_KEY) || "[]");
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>(); const templates: CustomSpreadTemplate[] = [];
    for (const item of value.slice(0, MAX_CUSTOM_TEMPLATES)) {
      try {
        if (!item || typeof item.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item.id) || seen.has(item.id) || typeof item.updatedAt !== "string" || !Number.isFinite(Date.parse(item.updatedAt))) continue;
        templates.push({ id: item.id, spread: normalizeCustomSpread(item.spread), updatedAt: item.updatedAt }); seen.add(item.id);
      } catch { /* Ignore an incomplete template without breaking valid ones. */ }
    }
    return templates;
  } catch { return []; }
}
function writeTemplates(templates: CustomSpreadTemplate[], operation = "保存") {
  try { localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(templates)); }
  catch { throw new Error(`模板${operation}失败，浏览器存储可能不可用或空间不足。你仍可以使用此牌阵抽牌。`); }
}
export function saveCustomTemplate(spread: TarotSpread, id?: string): CustomSpreadTemplate {
  const normalized = normalizeCustomSpread(spread); const templates = loadCustomTemplates();
  const existing = templates.find((item) => item.id === id);
  if (!existing && templates.length >= MAX_CUSTOM_TEMPLATES) throw new Error("最多保存 20 个模板，请先删除不再使用的模板。");
  const template = { id: existing?.id || createReadingId(), spread: normalized, updatedAt: new Date().toISOString() };
  writeTemplates([template, ...templates.filter((item) => item.id !== template.id)]); return template;
}
export function deleteCustomTemplate(id: string) { writeTemplates(loadCustomTemplates().filter((item) => item.id !== id), "删除"); }
