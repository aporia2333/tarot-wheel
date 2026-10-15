import test from "node:test";
import assert from "node:assert/strict";
import { answerFollowUp, formatFollowUp, normalizeFollowUpRequest, parseFollowUp, MAX_FOLLOW_UPS } from "../src/lib/ai/followUp";
import { AiRequestConflict } from "../src/lib/ai/interpretReading";
import { readingFixture, aiFixture } from "./fixtures";
import type { TarotReading } from "../src/types";

const request = (index = 1) => ({ requestId: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`, question: `追问 ${index}：如何理解原牌面？` });
function repositoryFixture() {
  let stored: TarotReading = { ...readingFixture(), aiStatus: "completed", aiInterpretation: aiFixture() };
  let version = "2026-10-03T08:00:00.000Z";
  const save = async (next: TarotReading, expected: string) => {
    if (expected !== version) return null;
    stored = next; version = new Date(Date.parse(version) + 1).toISOString(); return version;
  };
  return { get stored() { return stored; }, get version() { return version; }, save };
}
const generate = async (reading: TarotReading) => ({ answer: "围绕原牌面的具体回答。", cardIds: [reading.selectedCards[0].card.id] });

test("follow-up inputs retain original cards, directions, positions and interpretation; malformed references are rejected", () => {
  const state = repositoryFixture(); const reading = state.stored;
  const before = JSON.stringify(reading);
  const input = formatFollowUp(reading, "这两张牌如何联系？");
  assert.deepEqual(input.cards.map((card) => card.cardId), reading.selectedCards.map((card) => card.card.id));
  assert.equal(input.cards[1].orientation, "逆位"); assert.equal(input.previousInterpretation, reading.aiInterpretation);
  assert.equal(JSON.stringify(reading), before);
  assert.equal(parseFollowUp(JSON.stringify({ answer: "解释", referencedCardIds: [reading.selectedCards[0].card.id] }), reading).answer, "解释");
  for (const value of [null, {}, { answer: " ", referencedCardIds: [reading.selectedCards[0].card.id] },
    { answer: "错误", referencedCardIds: ["not-drawn"] }, { answer: "错误", referencedCardIds: [] }]) {
    assert.throws(() => parseFollowUp(JSON.stringify(value), reading));
  }
  assert.throws(() => normalizeFollowUpRequest({ readingId: reading.readingId, ...request(), question: " " }));
  assert.throws(() => normalizeFollowUpRequest({ readingId: reading.readingId, ...request(), question: "x".repeat(801) }));
});

test("concurrent follow-up calls generate once, retry uses cache, and successful answers are capped at three", async () => {
  const state = repositoryFixture(); const initial = state.stored; const version = state.version;
  let calls = 0; const counted = async (reading: TarotReading) => { calls++; return generate(reading); };
  const results = await Promise.allSettled([1, 2].map(() => answerFollowUp(initial, version, request(), state, counted)));
  assert.equal(results.filter((item) => item.status === "fulfilled").length, 1); assert.equal(calls, 1);
  assert.equal((await answerFollowUp(state.stored, state.version, request(), state, counted)).cached, true);
  await assert.rejects(answerFollowUp(state.stored, state.version, { ...request(), question: "另一个问题" }, state, counted), AiRequestConflict);
  for (let index = 2; index <= MAX_FOLLOW_UPS; index++) await answerFollowUp(state.stored, state.version, request(index), state, counted);
  await assert.rejects(answerFollowUp(state.stored, state.version, request(4), state, counted), /3 次/);
  assert.equal(calls, 3); assert.equal(state.stored.aiFollowUps?.length, 3);
  assert.equal(state.stored.aiFollowUpJob, undefined);
});

test("failed follow-ups preserve base interpretation, allow same-request retry and stop unbounded paid retries", async () => {
  const state = repositoryFixture(); const original = state.stored.aiInterpretation;
  const failure = async () => { throw new Error("provider failure"); };
  await assert.rejects(answerFollowUp(state.stored, state.version, request(), state, failure), /provider failure/);
  assert.equal(state.stored.aiFollowUpJob?.status, "failed"); assert.equal(state.stored.aiFollowUpAttempts, 1);
  assert.equal(state.stored.aiInterpretation, original);
  await answerFollowUp(state.stored, state.version, request(), state, generate);
  assert.equal(state.stored.aiFollowUps?.length, 1);
  for (let index = 0; index < 4; index++) await assert.rejects(answerFollowUp(state.stored, state.version, request(2), state, failure));
  await assert.rejects(answerFollowUp(state.stored, state.version, request(2), state, generate), /尝试次数/);
  assert.equal(state.stored.aiFollowUpAttempts, 6);
});

test("fresh pending follow-ups conflict; stale jobs recover, and late failure cannot overwrite a newer answer", async () => {
  const state = repositoryFixture(); const now = Date.parse(state.version);
  await state.save({ ...state.stored, aiFollowUpJob: { ...request(), status: "pending" } }, state.version);
  await assert.rejects(answerFollowUp(state.stored, state.version, request(), state, generate, now), AiRequestConflict);
  await answerFollowUp(state.stored, state.version, request(), state, generate, now + 120_000);
  const newer = state.stored;
  await assert.rejects(answerFollowUp(state.stored, state.version, request(2), state, async () => {
    await state.save({ ...newer, aiFollowUps: [...newer.aiFollowUps!, { ...request(2), ...(await generate(newer)), createdAt: new Date(now).toISOString() }] }, state.version);
    throw new Error("late failure");
  }), /late failure/);
  assert.equal(state.stored.aiFollowUps?.length, 2);
  await assert.rejects(answerFollowUp(readingFixture(), state.version, request(), state, generate), /先生成/);
});
