import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { tarotCards } from "../src/data/tarotCards";
import { spreads, toTarotSpread } from "../src/data/spreads";
import { randomInt } from "../src/lib/random";
import { shuffleDeck, cutDeck } from "../src/lib/shuffle";
import { createReadingId } from "../src/lib/ids";
import { isUuid, normalizeNewReading } from "../src/lib/readings/validation";
import { restoreReadingFlow } from "../src/lib/readingFlow";
import { useReadingFlowStore } from "../src/store/readingFlowStore";
import { readingFixture } from "./fixtures";

test("random integers reject modulo bias and preserve both orientation outcomes", () => {
  const values = [0xffffffff, 0xfffffffe, 0, 1];
  const stub = mock.method(globalThis.crypto, "getRandomValues", (array: Uint32Array) => { array[0] = values.shift()!; return array; });
  try {
    assert.equal(randomInt(3), 2); assert.equal(stub.mock.callCount(), 2);
    assert.equal(randomInt(2), 0); assert.equal(randomInt(2), 1);
    assert.throws(() => randomInt(0)); assert.throws(() => randomInt(1.5));
  } finally { stub.mock.restore(); }
});

test("Fisher–Yates produces all six three-card permutations with equal branch counts", () => {
  const permutations = new Set<string>();
  for (let first = 0; first < 3; first++) for (let second = 0; second < 2; second++) {
    const values = [first, second];
    const stub = mock.method(globalThis.crypto, "getRandomValues", (array: Uint32Array) => { array[0] = values.shift()!; return array; });
    try { permutations.add(shuffleDeck(tarotCards.slice(0, 3)).map((card) => card.id).join(",")); }
    finally { stub.mock.restore(); }
  }
  assert.equal(permutations.size, 6);
  const shuffled = shuffleDeck(tarotCards);
  assert.equal(new Set(shuffled.map((card) => card.id)).size, 78);
  assert.deepEqual(new Set(shuffled), new Set(tarotCards));
  for (let index = 1; index < 78; index++) {
    const cut = cutDeck(shuffled, index);
    assert.notEqual(cut[0], shuffled[0]); assert.deepEqual(new Set(cut), new Set(shuffled));
  }
  assert.deepEqual(cutDeck([], 0), []); assert.throws(() => cutDeck(shuffled, NaN));
});

test("UUID fallback is compatible with the cloud API", () => {
  const stub = mock.method(globalThis.crypto, "randomUUID", undefined as never);
  // Test the native path too; fallback is exercised by deleting the method temporarily.
  stub.mock.restore();
  assert(isUuid(createReadingId()));
  const descriptor = Object.getOwnPropertyDescriptor(globalThis.crypto, "randomUUID");
  Object.defineProperty(globalThis.crypto, "randomUUID", { value: undefined, configurable: true });
  try { assert(isUuid(createReadingId())); }
  finally { if (descriptor) Object.defineProperty(globalThis.crypto, "randomUUID", descriptor); else delete (globalThis.crypto as Partial<Crypto>).randomUUID; }
});

test("rapid selections use atomic positions, reject duplicates, and retain orientation after undo", () => {
  const store = useReadingFlowStore;
  store.getState().resetFlow();
  const spread = toTarotSpread(spreads[0], 3);
  store.getState().setSelectedSpread(spread);
  store.getState().setShuffledDeck(tarotCards);
  const add = (index: number) => store.getState().addSelectedCard(tarotCards[index]);
  add(0); add(0); add(1); add(2); add(3);
  assert.deepEqual(store.getState().selectedCards.map((card) => card.position), spread.positions);
  const original = store.getState().selectedCards[2];
  store.getState().setSelectedCards(store.getState().selectedCards.slice(0, -1)); add(2);
  assert.equal(store.getState().selectedCards[2].orientation, original.orientation);
  const identity = store.getState().getReadingIdentity();
  assert.deepEqual(store.getState().getReadingIdentity(), identity);
  const snapshot = JSON.parse(JSON.stringify(store.getState()));
  assert.deepEqual(restoreReadingFlow(snapshot)?.selectedCards, store.getState().selectedCards);
  snapshot.shuffledDeck[1] = snapshot.shuffledDeck[0]; assert.equal(restoreReadingFlow(snapshot), null);
  store.getState().resetFlow();
  assert.equal(store.getState().readingId, null); assert.deepEqual(store.getState().baseOrientationByCardId, {});
  assert.equal(store.getState().selectedSpread, null);
});

test("saving validates complete spreads and rejects malformed or duplicate cards", () => {
  const reading = readingFixture();
  assert.equal(normalizeNewReading({ ...reading, question: "", contextInfo: "" }).question, "");
  const forged = { ...reading, aiStatus: "completed", aiInterpretation: { summary: "forged" } };
  const normalized = normalizeNewReading(forged);
  assert.equal(normalized.aiStatus, "not_started"); assert.equal(normalized.aiInterpretation, undefined);
  const malformed = [null, {}, { ...reading, createdAt: "invalid" }, { ...reading, selectedCards: reading.selectedCards.slice(1) },
    { ...reading, selectedCards: [reading.selectedCards[0], reading.selectedCards[0], reading.selectedCards[2]] },
    { ...reading, question: "x".repeat(2001) }, { ...reading, spread: { ...reading.spread, count: 2 } },
    { ...reading, selectedCards: [null, ...reading.selectedCards.slice(1)] },
    { ...reading, selectedCards: [{ ...reading.selectedCards[0], orientation: "sideways" }, ...reading.selectedCards.slice(1)] }];
  malformed.forEach((value) => assert.throws(() => normalizeNewReading(value)));
  const minimal = { ...reading, selectedCards: reading.selectedCards.map((selected) => ({ ...selected, card: { id: selected.card.id, nameCn: "fake" } })) };
  assert.equal(normalizeNewReading(minimal).selectedCards[0].card.nameCn, "愚者");
});
