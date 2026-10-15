import test from "node:test";
import assert from "node:assert/strict";
import { tarotCards } from "../src/data/tarotCards";
import { spreads, toTarotSpread } from "../src/data/spreads";
import { useReadingFlowStore } from "../src/store/readingFlowStore";
import { restoreReadingFlow } from "../src/lib/readingFlow";
import { createDeckOrientations } from "../src/lib/draw";
import { applyPreparationOperation, choosePreparationAction, createPreparationOperation, CUT_ACTIONS, emptyPreparation,
  PREPARATION_CONFIG, randomPreparationCount, restorePreparation, samplePose, SHUFFLE_ACTIONS, validPreparationCount } from "../src/lib/preparation";
import { dealerCharacters } from "../src/data/dealerCharacters";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { preparationDisplayY, preparationHands, preparationPlaybackMs } from "../src/lib/preparationMotion";

const ids = tarotCards.map((card) => card.id);
for (const action of [...SHUFFLE_ACTIONS, ...CUT_ACTIONS]) test(`${action}: full deck permutation follows packet collection and keeps valid trajectories`, () => {
  const stage = CUT_ACTIONS.includes(action as never) ? "cut" : "shuffle";
  for (let attempt = 0; attempt < 25; attempt++) {
    const op = createPreparationOperation(ids, stage, action);
    const orientations = createDeckOrientations(tarotCards);
    const result = applyPreparationOperation(op, orientations);
    assert.equal(result.ids.length, 78);
    assert.deepEqual(new Set(result.ids), new Set(ids));
    assert.deepEqual(result.ids, op.collection.flatMap((index) => op.packets[index].ids));
    assert.notDeepEqual(result.ids, ids);
    assert.deepEqual(op.packets.flatMap((packet) => packet.ids), ids);
    if (stage === "cut") {
      assert.deepEqual(result.orientations, orientations);
      // Each cut packet stays contiguous and preserves its internal order.
      for (const packet of op.packets) {
        const index = result.ids.indexOf(packet.ids[0]);
        assert.deepEqual(result.ids.slice(index, index + packet.ids.length), packet.ids);
      }
    }
    const state = { ...emptyPreparation(), phase: stage === "cut" ? "cutting" as const : "shuffling" as const,
      shuffleTarget: 1, cutTarget: stage === "cut" ? 1 : 0, pending: op };
    assert.deepEqual(restorePreparation(JSON.parse(JSON.stringify(state)), ids, stage === "cut" ? 1 : 0, 0), state);
    for (const packet of op.packets) {
      assert.deepEqual(samplePose(packet.poses, 0), packet.poses[0]);
      assert.deepEqual(samplePose(packet.poses, 1), packet.poses[packet.poses.length - 1]);
      for (let fraction = .1; fraction < 1; fraction += .1) assert(Number.isFinite(samplePose(packet.poses, fraction).x));
      for (const id of packet.ids) assert.equal(result.orientations[id], packet.flip
        ? orientations[id] === "upright" ? "reversed" : "upright" : orientations[id]);
    }
  }
});

test("two stages commit once, resume the same plan, reject early draw and do not repeat actions", () => {
  const store = useReadingFlowStore;
  store.getState().resetFlow(); store.getState().setSelectedSpread(toTarotSpread(spreads[0], 3));
  assert.equal(store.getState().startPreparationStage("cut", 1), false);
  assert.equal(store.getState().startPreparationStage("shuffle", 1.5), false);
  assert.equal(store.getState().startPreparationStage("shuffle", 3), true);
  assert.equal(store.getState().startPreparationStage("shuffle", 3), false);
  assert.equal(store.getState().addSelectedCard(tarotCards[0]), false);
  let previous: string | null = null;
  for (let index = 0; index < 3; index++) {
    const state = store.getState(); const op = state.preparation.pending!;
    assert.notEqual(op.action, previous); previous = op.action;
    const resumed = restoreReadingFlow(JSON.parse(JSON.stringify(state)))!;
    assert.deepEqual(resumed.preparation.pending, op);
    store.setState(resumed);
    const expected = applyPreparationOperation(op, state.baseOrientationByCardId);
    assert.equal(store.getState().commitPreparationOperation("wrong-id"), false);
    assert.equal(store.getState().commitPreparationOperation(op.id), true);
    assert.equal(store.getState().commitPreparationOperation(op.id), false);
    assert.equal(store.getState().shuffleCount, index + 1);
    assert.deepEqual(store.getState().shuffledDeck.map((card) => card.id), expected.ids);
    assert.deepEqual(store.getState().baseOrientationByCardId, expected.orientations);
  }
  assert.equal(store.getState().preparation.phase, "choose-cut");
  const orientations = store.getState().baseOrientationByCardId;
  assert.equal(store.getState().startPreparationStage("cut", 2), true);
  for (let index = 0; index < 2; index++) {
    const op = store.getState().preparation.pending!;
    assert.equal(store.getState().commitPreparationOperation(op.id), true);
    assert.deepEqual(store.getState().baseOrientationByCardId, orientations);
  }
  assert.equal(store.getState().preparation.phase, "ready");
  assert.equal(store.getState().addSelectedCard(store.getState().shuffledDeck[0], "down"), true);
  assert.notEqual(store.getState().selectedCards[0].orientation, store.getState().selectedCards[0].baseOrientation);
  assert(restoreReadingFlow(JSON.parse(JSON.stringify(store.getState()))));
  store.getState().setQuestionInfo("新问题", "");
  assert.deepEqual(store.getState().preparation, emptyPreparation());
});

test("invalid saved plans cannot resume or finish preparation", () => {
  const op = createPreparationOperation(ids, "shuffle", "packets");
  const base = { ...emptyPreparation(), phase: "shuffling", shuffleTarget: 1, pending: op };
  for (const mutate of [
    (v: typeof base) => { v.pending.collection[1] = v.pending.collection[0]; },
    (v: typeof base) => { v.pending.packets[0].ids[0] = "unknown"; },
    (v: typeof base) => { v.pending.packets[0].poses[1].t = 0; },
    (v: typeof base) => { v.pending.packets[0].poses[1].x = 10000; },
    (v: typeof base) => { v.pending.beforeIds.reverse(); },
    (v: typeof base) => { v.lastCommittedId = v.pending.id; },
  ]) {
    const forged = JSON.parse(JSON.stringify(base)); mutate(forged);
    assert.equal(restorePreparation(forged, ids, 0, 0), null);
  }
  assert.equal(restorePreparation({ ...base, phase: "ready", pending: null }, ids, 0, 0), null);
  assert.equal(restorePreparation({ ...emptyPreparation(), phase: "choose-cut", shuffleTarget: 1, cutTarget: 0 }, ids, 1, 2), null);
});

test("count config bounds random choices; next action excludes previous", () => {
  for (const count of [0, -1, 1.5, 11, NaN, Infinity]) assert.equal(validPreparationCount(count), false);
  assert(validPreparationCount(1)); assert(validPreparationCount(10));
  for (let attempt = 0; attempt < 100; attempt++) {
    for (const stage of ["shuffle", "cut"] as const) {
      const count = randomPreparationCount(stage); const range = stage === "shuffle" ? PREPARATION_CONFIG.shuffleRandom : PREPARATION_CONFIG.cutRandom;
      assert(count >= range.min && count <= range.max);
      const first = choosePreparationAction(stage, null);
      assert.notEqual(choosePreparationAction(stage, first), first);
    }
  }
});

test("four dealer manifests cover every state/action and reference real transparent atlases", () => {
  assert.equal(dealerCharacters.filter((item) => item.kind === "human").length, 2);
  assert.equal(dealerCharacters.filter((item) => item.kind === "cat").length, 2);
  for (const dealer of dealerCharacters) {
    const file = path.join(process.cwd(), "public", dealer.atlas);
    assert(existsSync(file));
    const bytes = readFileSync(file); assert.equal(bytes[25], 6, "PNG must have RGBA alpha");
    assert(Math.abs(bytes.readUInt32BE(16) / bytes.readUInt32BE(20) - dealer.grid[0] / dealer.grid[1]) < .05);
    assert(dealer.rig);
    const rigBytes = readFileSync(path.join(process.cwd(), "public", dealer.rig.atlas));
    assert.equal(rigBytes[25], 6, "Rig must retain alpha");
    for (const part of Object.values(dealer.rig.parts)) assert(part.every(Number.isFinite));
    assert(dealer.portrait);
    const portraitBytes = readFileSync(path.join(process.cwd(), "public", dealer.portrait.atlas));
    assert.equal(portraitBytes[25], 6, "Connected portrait must retain alpha");
    for (const expression of ["normal", "smile", "focus", "closed", "thinking"] as const) {
      const crop: readonly number[] = dealer.portrait.parts[expression];
      assert(crop.every(Number.isFinite));
      assert.equal(crop[4], dealer.portrait.parts.normal[4]);
      assert.equal(crop[5], dealer.portrait.parts.normal[5]);
    }
    for (const part of ["closed", "thinking", "leftUpper", "rightUpper", "leftLower", "rightLower", "leftGrip", "rightGrip", "leftSupport", "rightSupport"] as const) assert(dealer.parts[part]);
    for (const state of ["idle", "talk", "shuffle", "cut", "finish"] as const) assert(dealer.parts[dealer.states[state]]);
    for (const action of [...SHUFFLE_ACTIONS, ...CUT_ACTIONS]) assert.equal(dealer.actions[action], "rig");
  }
});

test("presentation speed and grip contacts use the saved plan without changing its permutation", () => {
  for (const action of [...SHUFFLE_ACTIONS, ...CUT_ACTIONS]) {
    const operation = createPreparationOperation(ids, CUT_ACTIONS.includes(action as never) ? "cut" : "shuffle", action);
    const before = JSON.stringify(operation);
    assert(preparationPlaybackMs(operation, 2, 3) < preparationPlaybackMs(operation, 1, 3));
    assert.equal(preparationPlaybackMs(operation, 1, 1, true), 650);
    for (const progress of [.15, .3, .6, .75]) {
      for (const hand of preparationHands(operation, progress)) {
        assert(Number.isFinite(hand.x) && Number.isFinite(hand.y));
        if (hand.packet !== null && hand.pose === "grip") {
          const pose = samplePose(operation.packets[hand.packet].poses, progress);
          assert(Math.abs(Math.abs(hand.x - pose.x) - 29) < 1e-9); assert.equal(hand.y, pose.y - 34);
        }
      }
    }
    assert.equal(JSON.stringify(operation), before);
  }
  assert.equal(preparationDisplayY(430), preparationDisplayY(430, "table"));
  assert(preparationDisplayY(325, "table") >= 450 && preparationDisplayY(455, "table") <= 520);
});

test("new provenance records committed actions only, and older plans remain resumable", () => {
  const store = useReadingFlowStore;
  store.getState().resetFlow(); store.getState().setSelectedSpread(toTarotSpread(spreads[0], 3));
  store.getState().startPreparationStage("shuffle", 1, "tarotReader");
  const pending = store.getState().preparation.pending!;
  assert.deepEqual(store.getState().preparation.shuffleMethods, []);
  const old = JSON.parse(JSON.stringify(store.getState()));
  delete old.preparation.countSource; delete old.preparation.shuffleMethods; delete old.preparation.cutMethods;
  assert.deepEqual(restoreReadingFlow(old)?.preparation.pending, pending);
  assert.equal(store.getState().commitPreparationOperation(pending.id), true);
  assert.equal(store.getState().commitPreparationOperation(pending.id), false);
  assert.deepEqual(store.getState().preparation.shuffleMethods, [pending.action]);
  assert.equal(store.getState().preparation.countSource?.shuffle, "tarotReader");
  const saved = JSON.parse(JSON.stringify(store.getState()));
  saved.preparation.cutMethods = ["overhand"]; assert.equal(restoreReadingFlow(saved), null);
  store.getState().resetFlow();
});
