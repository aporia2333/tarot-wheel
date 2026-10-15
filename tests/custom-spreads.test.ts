import test from "node:test";
import assert from "node:assert/strict";
import { createCustomDraft, isCustomDraft, normalizeCustomSpread, normalizeSelectedSpread, spreadFromDraft } from "../src/lib/customSpreads";
import { CUSTOM_DRAFT_KEY, CUSTOM_TEMPLATES_KEY, clearCustomDraft, deleteCustomTemplate, loadCustomDraft, loadCustomTemplates, saveCustomDraft, saveCustomTemplate } from "../src/lib/customSpreadStorage";
import { normalizeNewReading } from "../src/lib/readings/validation";
import { restoreReadingFlow } from "../src/lib/readingFlow";
import { useReadingFlowStore } from "../src/store/readingFlowStore";
import { tarotCards } from "../src/data/tarotCards";
import { formatReading } from "../src/lib/ai/tarotInterpretation";
import { formatFollowUp } from "../src/lib/ai/followUp";
import { aiFixture, customReadingFixture, readingFixture } from "./fixtures";

test("custom spreads support 1–13 cards, reject ambiguous definitions and preserve authoritative preset facts", () => {
  for (const count of [1, 2, 4, 13]) {
    const reading = customReadingFixture(count);
    assert.equal(normalizeNewReading(reading).spread.count, count);
    assert.deepEqual(normalizeSelectedSpread(reading.spread), reading.spread);
  }
  const spread = customReadingFixture().spread;
  for (const invalid of [{ ...spread, count: 0 }, { ...spread, count: 14 }, { ...spread, count: 1.5 }, { ...spread, name: " " },
    { ...spread, name: "x".repeat(61) }, { ...spread, positions: spread.positions.slice(1) },
    { ...spread, positions: ["现实限制", " 现实限制 ", "资源", "行动"] }, { ...spread, positions: ["A", "a", "资源", "行动"] },
    { ...spread, positions: ["", "限制", "资源", "行动"] }, { ...spread, positionMeanings: ["缺失"] },
    { ...spread, positionMeanings: [null, "", "", ""] }, { ...spread, positionMeanings: ["x".repeat(301), "", "", ""] }]) {
    assert.throws(() => normalizeCustomSpread(invalid));
  }
  const emptyMeanings = normalizeCustomSpread({ ...spread, name: " 我的牌阵 ", positionMeanings: [" ", "", "", ""] });
  assert.equal(emptyMeanings.name, "我的牌阵"); assert.equal(emptyMeanings.positionMeanings, undefined);
  const preset = readingFixture().spread;
  assert.deepEqual(normalizeSelectedSpread({ ...preset, name: "伪造", positions: ["错误"], positionMeanings: ["错误"] }), preset);
});

test("editing custom positions or meanings resets draws, while reselecting the same definition preserves them and legacy snapshots restore", () => {
  const store = useReadingFlowStore; store.getState().resetFlow();
  try {
    const spread = customReadingFixture().spread;
    store.getState().setSelectedSpread(spread); store.getState().setShuffledDeck(tarotCards); store.getState().addSelectedCard(tarotCards[0]);
    const identity = store.getState().getReadingIdentity(); const snapshot = JSON.parse(JSON.stringify(store.getState()));
    assert.deepEqual(restoreReadingFlow(snapshot)?.selectedSpread, spread);
    const stale = structuredClone(snapshot); stale.selectedCards[0].position = "过期牌位"; assert.equal(restoreReadingFlow(stale), null);
    store.getState().setSelectedSpread({ ...spread }); assert.equal(store.getState().selectedCards.length, 1); assert.equal(store.getState().readingId, identity.readingId);
    store.getState().setSelectedSpread({ ...spread, positionMeanings: ["新的观察角度", ...spread.positionMeanings!.slice(1)] });
    assert.equal(store.getState().selectedCards.length, 0); assert.equal(store.getState().shuffledDeck.length, 0); assert.equal(store.getState().readingId, null);
    store.getState().setShuffledDeck(tarotCards); store.getState().addSelectedCard(tarotCards[1]);
    store.getState().setSelectedSpread({ ...spread, positions: [...spread.positions].reverse(), positionMeanings: [...spread.positionMeanings!].reverse() });
    assert.equal(store.getState().selectedCards.length, 0);
    snapshot.selectedSpread.positionMeanings = ["bad length"]; assert.equal(restoreReadingFlow(snapshot), null);
    store.getState().setSelectedSpread(readingFixture(3, "custom").spread); store.getState().setShuffledDeck(tarotCards);
    assert.deepEqual(restoreReadingFlow(JSON.parse(JSON.stringify(store.getState())))?.selectedSpread?.positions, ["第 1 张", "第 2 张", "第 3 张"]);
  } finally { store.getState().resetFlow(); }
});

test("custom position meanings survive normalization and reach interpretation and follow-ups without replacing card facts", () => {
  const reading = customReadingFixture(); const normalized = normalizeNewReading(reading);
  assert.deepEqual(normalized.spread, reading.spread); assert.deepEqual(normalized.selectedCards, reading.selectedCards);
  const input = formatReading(normalized);
  assert.deepEqual(input.cards.map((card) => card.positionMeaning), reading.spread.positionMeanings);
  assert.equal(input.cards[1].orientation, "逆位"); assert.equal(input.cards[1].positionContext, "现实限制");
  const followUp = formatFollowUp({ ...reading, aiInterpretation: aiFixture(reading) }, "怎样行动？");
  assert.deepEqual(followUp.cards, input.cards); assert.deepEqual(followUp.spread.positions, reading.spread.positions);
  assert.throws(() => normalizeNewReading({ ...reading, selectedCards: [...reading.selectedCards].reverse() }), /顺序/);
  const legacy = readingFixture(3, "custom");
  assert.deepEqual(normalizeNewReading(legacy).spread, legacy.spread); assert.equal(formatReading(legacy).cards[0].positionMeaning, undefined);
});

test("templates persist, update without duplication, recover valid entries, cap storage and preserve incomplete editor drafts", () => {
  const local = new Map<string, string>(); const session = new Map<string, string>();
  const storage = (data: Map<string, string>) => ({ getItem: (key: string) => data.get(key) || null, setItem: (key: string, value: string) => { data.set(key, value); }, removeItem: (key: string) => { data.delete(key); } });
  const localStorage = storage(local);
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: localStorage });
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: storage(session) });
  try {
    local.set(CUSTOM_TEMPLATES_KEY, "broken"); assert.deepEqual(loadCustomTemplates(), []);
    const spread = customReadingFixture().spread; const first = saveCustomTemplate(spread);
    saveCustomTemplate({ ...spread, name: "修改过的模板" }, first.id); assert.equal(loadCustomTemplates().length, 1); assert.equal(loadCustomTemplates()[0].spread.name, "修改过的模板");
    local.set(CUSTOM_TEMPLATES_KEY, JSON.stringify([null, { ...first, spread: { ...spread, count: 99 } }, first, first]));
    assert.deepEqual(loadCustomTemplates(), [first]);
    const draft = { ...createCustomDraft(spread), name: "", templateId: first.id }; draft.slots[0].name = "";
    assert(isCustomDraft(draft)); saveCustomDraft(draft); assert.deepEqual(loadCustomDraft(), draft); assert.throws(() => spreadFromDraft(draft));
    clearCustomDraft(); assert.equal(loadCustomDraft(), null);
    session.set(CUSTOM_DRAFT_KEY, JSON.stringify({ ...draft, count: 99 })); assert.equal(loadCustomDraft(), null);
    deleteCustomTemplate(first.id); assert.deepEqual(loadCustomTemplates(), []);
    for (let index = 0; index < 20; index++) saveCustomTemplate({ ...spread, name: `模板 ${index}` });
    assert.throws(() => saveCustomTemplate(spread), /20/);
    const existing = loadCustomTemplates()[0]; saveCustomTemplate(spread, existing.id); assert.equal(loadCustomTemplates().length, 20);
    const before = local.get(CUSTOM_TEMPLATES_KEY); localStorage.setItem = () => { throw new Error("QuotaExceeded"); };
    assert.throws(() => saveCustomTemplate(spread, existing.id), /保存失败/); assert.equal(local.get(CUSTOM_TEMPLATES_KEY), before);
    assert.throws(() => deleteCustomTemplate(existing.id), /删除失败/); assert.equal(local.get(CUSTOM_TEMPLATES_KEY), before);
  } finally { delete (globalThis as { localStorage?: unknown }).localStorage; delete (globalThis as { sessionStorage?: unknown }).sessionStorage; }
});
