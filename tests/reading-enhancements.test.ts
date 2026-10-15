import assert from "node:assert/strict";
import test from "node:test";
import { aiAccessForUser } from "../src/lib/ai/access";
import { evaluationCases, evaluationReading, qualityRubric } from "../src/lib/ai/evaluationCases";
import { formatReading, parseInterpretation } from "../src/lib/ai/tarotInterpretation";
import { isAiInterpretation } from "../src/lib/readings/validation";
import { suggestedGuide, readingGuides } from "../src/data/readingGuides";
import { getSpreadDefinition, toTarotSpread } from "../src/data/spreads";
import { getCardMeaning } from "../src/data/tarotCards";
import { rawAiFixture, readingFixture, aiFixture } from "./fixtures";

test("reading guides preserve valid existing spreads and propose directions without choosing cards", () => {
  readingGuides.forEach((guide) => {
    const spread = toTarotSpread(getSpreadDefinition(guide.spreadId)!, guide.count);
    assert.equal(spread.positions.length, guide.count);
    assert(guide.question.length > 0);
  });
  assert.equal(suggestedGuide("面对两个选择"), "choice");
  assert.equal(suggestedGuide("怎样理解这段关系"), "relationship");
  assert.equal(suggestedGuide(""), "present");
});

test("reference meanings follow orientation and structured overviews preserve legacy interpretations", () => {
  const reading = readingFixture();
  assert.equal(getCardMeaning(reading.selectedCards[1].card, "reversed"), reading.selectedCards[1].card.reversedMeaningCn);
  const raw = rawAiFixture(reading);
  assert.equal(parseInterpretation(JSON.stringify(raw), reading).overview?.theme, raw.overview.theme);
  assert.throws(() => parseInterpretation(JSON.stringify({ ...raw, overview: { theme: "", tension: "x", nextStep: "y" } }), reading), /速览/);
  assert.equal(isAiInterpretation(aiFixture(reading), reading.selectedCards.length), true);
});

test("AI access differentiates guest, allowed member, blocked account and unavailable service", () => {
  const oldEmails = process.env.AI_ALLOWED_EMAILS; const oldKey = process.env.DEEPSEEK_API_KEY;
  try {
    process.env.AI_ALLOWED_EMAILS = "Allowed@Example.test"; process.env.DEEPSEEK_API_KEY = "test-only";
    assert.equal(aiAccessForUser(null).mode, "unauthenticated");
    assert.equal(aiAccessForUser({ is_anonymous: true }).mode, "guest");
    assert.equal(aiAccessForUser({ email: "allowed@example.test", is_anonymous: false }).allowed, true);
    assert.equal(aiAccessForUser({ email: "other@example.test", is_anonymous: false }).mode, "blocked");
    delete process.env.DEEPSEEK_API_KEY;
    assert.equal(aiAccessForUser({ email: "allowed@example.test", is_anonymous: false }).mode, "unconfigured");
  } finally {
    if (oldEmails === undefined) delete process.env.AI_ALLOWED_EMAILS; else process.env.AI_ALLOWED_EMAILS = oldEmails;
    if (oldKey === undefined) delete process.env.DEEPSEEK_API_KEY; else process.env.DEEPSEEK_API_KEY = oldKey;
  }
});

test("all twenty quality cases are deterministic, complete and cover the promised interpretation edge cases", () => {
  assert.equal(evaluationCases.length, 20);
  assert.equal(new Set(evaluationCases.map((item) => item.id)).size, 20);
  assert.equal(qualityRubric.length, 5);
  evaluationCases.forEach((item) => {
    const reading = evaluationReading(item);
    assert.deepEqual(evaluationReading(item), reading);
    assert.equal(new Set(reading.selectedCards.map((card) => card.card.id)).size, item.count);
    assert.equal(formatReading(reading).cards.length, item.count);
    if (item.allReversed) assert(reading.selectedCards.every((card) => card.orientation === "reversed"));
    if (item.pool === "court") assert(formatReading(reading).cards.every((card) => card.pipNumber === null));
  });
  assert(evaluationCases.some((item) => item.count === 13));
  assert(evaluationCases.some((item) => item.spreadId === "custom"));
  assert(evaluationCases.some((item) => item.question === ""));
});
