import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { tarotCards } from "../src/data/tarotCards";
import { spreads, toTarotSpread } from "../src/data/spreads";
import { resolveDrawOrientation } from "../src/lib/draw";
import { cutDeck } from "../src/lib/shuffle";
import { migrateReadingFlow, restoreReadingFlow } from "../src/lib/readingFlow";
import { normalizeNewReading } from "../src/lib/readings/validation";
import { useReadingFlowStore } from "../src/store/readingFlowStore";

test("washing fixes all 78 orientations; cutting, drawing and undo never consume new randomness", () => {
  const store = useReadingFlowStore;
  const stub = mock.method(globalThis.crypto, "getRandomValues", (array: Uint32Array) => { array[0] = 1; return array; });
  store.getState().resetFlow();
  try {
    store.getState().setSelectedSpread(toTarotSpread(spreads[0], 3));
    store.getState().setShuffledDeck(tarotCards);
    const base = { ...store.getState().baseOrientationByCardId };
    assert.equal(Object.keys(base).length, 78);
    assert.equal(stub.mock.callCount(), 78);
    assert.equal(base[tarotCards[0].id], "reversed");
    stub.mock.mockImplementation(() => { throw new Error("Drawing must not randomize the deck."); });
    store.getState().setShuffledDeck(cutDeck(tarotCards, 17), "cut");
    assert.deepEqual(store.getState().baseOrientationByCardId, base);
    assert.equal(store.getState().cutCount, 1);
    assert.equal(store.getState().addSelectedCard(tarotCards[0], "up"), true);
    assert.equal(store.getState().selectedCards[0].orientation, "reversed");
    assert.equal(store.getState().addSelectedCard(tarotCards[0], "down"), false);
    store.getState().setSelectedCards([]);
    store.getState().addSelectedCard(tarotCards[0], "down");
    assert.equal(store.getState().selectedCards[0].orientation, "upright");
    assert.equal(store.getState().selectedCards[0].baseOrientation, "reversed");
    const snapshot = JSON.parse(JSON.stringify(store.getState()));
    assert.deepEqual(restoreReadingFlow(snapshot)?.selectedCards, store.getState().selectedCards);
    assert.deepEqual(restoreReadingFlow(snapshot)?.baseOrientationByCardId, base);
    assert.equal(stub.mock.callCount(), 78);
  } finally { stub.mock.restore(); store.getState().resetFlow(); }
});

test("directional results are validated and malformed session metadata cannot be restored", () => {
  assert.equal(resolveDrawOrientation("upright", "up"), "upright");
  assert.equal(resolveDrawOrientation("upright", "down"), "reversed");
  assert.equal(resolveDrawOrientation("reversed", "up"), "reversed");
  assert.equal(resolveDrawOrientation("reversed", "down"), "upright");
  const store = useReadingFlowStore;
  store.getState().resetFlow();
  try {
    store.getState().setSelectedSpread(toTarotSpread(spreads[0], 1));
    store.getState().setShuffledDeck(tarotCards);
    store.getState().addSelectedCard(tarotCards[0], "down");
    const state = store.getState();
    const reading = { ...state.getReadingIdentity(), question: "", contextInfo: "", spread: state.selectedSpread!, selectedCards: state.selectedCards, aiStatus: "not_started" };
    assert.deepEqual(normalizeNewReading(reading).selectedCards, state.selectedCards);
    const wrongResult = structuredClone(reading);
    wrongResult.selectedCards[0].orientation = wrongResult.selectedCards[0].baseOrientation;
    assert.throws(() => normalizeNewReading(wrongResult), /方向/);
    const snapshot = JSON.parse(JSON.stringify(state));
    for (const mutate of [
      (value: typeof snapshot) => { delete value.baseOrientationByCardId[tarotCards[1].id]; },
      (value: typeof snapshot) => { value.selectedCards[0].drawDirection = "sideways"; },
      (value: typeof snapshot) => { value.selectedCards[0].orientation = value.selectedCards[0].baseOrientation; },
      (value: typeof snapshot) => { value.selectedCards[0].baseOrientation = "sideways"; },
    ]) {
      const invalid = structuredClone(snapshot); mutate(invalid); assert.equal(restoreReadingFlow(invalid), null);
    }
  } finally { store.getState().resetFlow(); }
});

test("legacy sessions retain their exact selected cards and saved identity through a one-time migration", () => {
  const store = useReadingFlowStore;
  store.getState().resetFlow();
  try {
    store.getState().setSelectedSpread(toTarotSpread(spreads[0], 3));
    store.getState().setShuffledDeck(tarotCards);
    store.getState().addSelectedCard(tarotCards[0], "down");
    store.getState().getReadingIdentity();
    const snapshot = JSON.parse(JSON.stringify(store.getState()));
    const oldSelected = snapshot.selectedCards.map(({ card, orientation, position }: { card: unknown; orientation: string; position: string }) => ({ card, orientation, position }));
    const legacy = { ...snapshot, selectedCards: oldSelected,
      orientationByCardId: { [tarotCards[0].id]: oldSelected[0].orientation, [tarotCards[5].id]: "reversed" } };
    delete legacy.baseOrientationByCardId;
    const migrated = migrateReadingFlow(legacy)!;
    assert(migrated);
    assert.equal(migrated.readingId, snapshot.readingId);
    assert.equal(migrated.selectedCards[0].orientation, oldSelected[0].orientation);
    assert.equal(migrated.selectedCards[0].drawDirection, "up");
    assert.equal(migrated.baseOrientationByCardId[tarotCards[5].id], "reversed");
    assert.equal(Object.keys(migrated.baseOrientationByCardId).length, 78);
    assert.deepEqual(restoreReadingFlow(migrated), migrated);
    assert.equal(migrateReadingFlow({ ...legacy, selectedCards: [{ ...oldSelected[0], orientation: "sideways" }] }), null);
  } finally { store.getState().resetFlow(); }
});
