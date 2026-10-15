import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { formatReading, parseInterpretation } from "../src/lib/ai/tarotInterpretation";
import { generateDeepSeekInterpretation } from "../src/lib/ai/deepseek";
import { interpretReading, AiRequestConflict } from "../src/lib/ai/interpretReading";
import { tarotCards } from "../src/data/tarotCards";
import { readingFixture, rawAiFixture, aiFixture } from "./fixtures";

test("interpretation input includes orientation-specific knowledge, positions and synthesis facts", () => {
  const reading = readingFixture();
  const input = formatReading(reading);
  assert.equal(input.question, reading.question); assert.equal(input.context, reading.contextInfo);
  assert.equal(input.spread.description, reading.spread.description);
  assert.deepEqual(input.cards.map((card) => card.position), reading.spread.positions);
  assert.equal(input.cards[1].meaning, tarotCards[1].reversedMeaningCn);
  assert.equal(input.cards[1].uprightTopicReferences, undefined);
  assert.deepEqual(input.cards[1].keywords, tarotCards[1].reversedKeywordsCn);
  assert.deepEqual(input.cards[0].uprightTopicReferences, tarotCards[0].meaningsCn);
  assert.equal(input.overview.majorCount, 3); assert.equal(input.overview.reversedCount, 1);
  assert.equal(formatReading({ ...reading, question: "", contextInfo: "" }).question, null);
  const court = tarotCards.find((card) => card.rank === "queen")!;
  const single = readingFixture(1); single.selectedCards[0].card = court;
  assert.equal(formatReading(single).cards[0].pipNumber, null);
});

test("legacy generic labels gain context without modifying historical snapshots", () => {
  const reading = readingFixture(10, "celtic-cross");
  reading.spread.positions = Array.from({ length: 10 }, (_, index) => `第 ${index + 1} 张`);
  reading.selectedCards.forEach((card, index) => { card.position = reading.spread.positions[index]; });
  const before = JSON.stringify(reading);
  const input = formatReading(reading);
  assert.equal(input.cards[1].position, "第 2 张"); assert.equal(input.cards[1].positionContext, "交叉／挑战");
  assert.equal(JSON.stringify(reading), before);
  const custom = readingFixture(3, "custom");
  assert.equal(formatReading(custom).cards[0].positionContext, "第 1 张");
});

test("AI JSON rejects reordered, incomplete, null, empty, repetitive and truncated content", () => {
  const reading = readingFixture(); const raw = rawAiFixture();
  const parsed = parseInterpretation(JSON.stringify(raw), reading);
  assert.equal(parsed.cards[1].orientation, "reversed"); assert.equal(parsed.cards[0].cardName, "愚者");
  const invalid = [null, {}, { ...raw, cards: [null, ...raw.cards.slice(1)] }, { ...raw, cards: raw.cards.slice(1) },
    { ...raw, summary: " " }, { ...raw, cards: [...raw.cards].reverse() },
    { ...raw, cards: raw.cards.map((card) => ({ ...card, interpretation: "相同套话" })) },
    { ...raw, cards: [{ ...raw.cards[0], interpretation: 42 }, ...raw.cards.slice(1)] },
    { ...raw, cards: [{ ...raw.cards[0], interpretation: "x".repeat(2401) }, ...raw.cards.slice(1)] }];
  invalid.forEach((value) => assert.throws(() => parseInterpretation(JSON.stringify(value), reading)));
  assert.throws(() => parseInterpretation("{", reading));
});

test("API client scales long-spread budgets and handles provider errors without caching partial answers", async () => {
  const previousKey = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = "test-only-not-a-real-key";
  const reading = readingFixture(13, "yearly");
  let captured: { max_tokens: number; messages: Array<{ content: string }> } | undefined;
  const fetchStub = mock.method(globalThis, "fetch", async (_url: unknown, options?: RequestInit) => {
    captured = JSON.parse(String(options?.body));
    return Response.json({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(rawAiFixture(reading)) } }] });
  });
  try {
    assert.equal((await generateDeepSeekInterpretation(reading)).cards.length, 13);
    assert(captured!.max_tokens > 2400); assert.equal(captured!.messages.length, 2);
    assert.equal(JSON.parse(captured!.messages[1].content).cards.length, 13);
    for (const content of [null, "bad-json", JSON.stringify({ ...rawAiFixture(reading), summary: "" })]) {
      fetchStub.mock.mockImplementation(async () => Response.json({ choices: [{ finish_reason: "stop", message: { content } }] }));
      await assert.rejects(generateDeepSeekInterpretation(reading));
    }
    fetchStub.mock.mockImplementation(async () => Response.json({ choices: [{ finish_reason: "length", message: { content: "{}" } }] }));
    await assert.rejects(generateDeepSeekInterpretation(reading), /完整/);
    fetchStub.mock.mockImplementation(async () => new Response("error", { status: 429 }));
    await assert.rejects(generateDeepSeekInterpretation(reading), /429/);
    fetchStub.mock.mockImplementation(async () => { throw new Error("network"); });
    await assert.rejects(generateDeepSeekInterpretation(reading), /超时/);
  } finally {
    fetchStub.mock.restore();
    if (previousKey === undefined) delete process.env.DEEPSEEK_API_KEY; else process.env.DEEPSEEK_API_KEY = previousKey;
  }
});

test("concurrent interpretation requests call the paid generator only once", async () => {
  const reading = readingFixture();
  let stored = structuredClone(reading); let version = "2026-10-02T08:00:00.000Z"; let calls = 0;
  const repository = { save: async (next: typeof reading, expected: string) => {
    if (expected !== version) return null;
    stored = next; version = new Date(Date.parse(version) + 1).toISOString(); return version;
  } };
  const initialVersion = version;
  const generate = async () => { calls++; return aiFixture(); };
  const results = await Promise.allSettled([interpretReading(reading, initialVersion, repository, generate), interpretReading(reading, initialVersion, repository, generate)]);
  assert.equal(calls, 1); assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(stored.aiStatus, "completed");
  assert.equal((await interpretReading(stored, version, repository, generate)).cached, true); assert.equal(calls, 1);
});

test("pending requests recover after timeout and failed cleanup cannot overwrite a newer success", async () => {
  const pending = { ...readingFixture(), aiStatus: "pending" as const };
  const now = Date.now();
  await assert.rejects(interpretReading(pending, new Date(now).toISOString(), { save: async () => "" }, async () => aiFixture(), now), AiRequestConflict);
  let stored = pending as ReturnType<typeof readingFixture>;
  let version = new Date(now - 120_000).toISOString();
  const repository = { save: async (next: typeof stored, expected: string) => {
    if (version !== expected) return null;
    stored = next; version = new Date(Date.parse(version) + 1).toISOString(); return version;
  } };
  await interpretReading(stored, version, repository, async () => aiFixture(), now);
  assert.equal(stored.aiStatus, "completed");
  stored = readingFixture();
  await assert.rejects(interpretReading(stored, version, repository, async () => {
    stored = { ...stored, aiStatus: "completed", aiInterpretation: aiFixture() };
    version = new Date(Date.parse(version) + 1).toISOString();
    throw new Error("late failure");
  }), /late failure/);
  assert.equal(stored.aiStatus, "completed");
  await assert.rejects(interpretReading(readingFixture(), version, repository, async () => { throw new Error("provider failure"); }), /provider failure/);
  assert.equal(stored.aiStatus, "failed");
});
