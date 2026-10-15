import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { tarotCards } from "../src/data/tarotCards";
import { applyPreparationOperation, createMagicPreparationOperation, CUT_ACTIONS, SHUFFLE_ACTIONS, emptyPreparation, restorePreparation } from "../src/lib/preparation";
import { sampleRitualMotion, ritualDuration, ritualVariant } from "../src/lib/ritualMotion";
import { seededRandomInt } from "../src/lib/random";
import { dealerCharacters } from "../src/data/dealerCharacters";
import { dealerArmRig, dealerGazeOffset, mapRitualHands, sampleDealerHandPose } from "../src/lib/dealerArmRig";

const ids = tarotCards.map(card => card.id);
const orientations = Object.fromEntries(ids.map((id, i) => [id, i % 2 ? "reversed" as const : "upright" as const]));
test("v5 visual card IDs, geometry and final layer order follow the same persisted permutation", () => {
  for (const action of [...SHUFFLE_ACTIONS, ...CUT_ACTIONS]) {
    const stage = CUT_ACTIONS.includes(action as never) ? "cut" : "shuffle";
    const op = createMagicPreparationOperation(ids, stage, action, seededRandomInt(31));
    const before = JSON.stringify(op), result = applyPreparationOperation(op, orientations);
    for (let i = 0; i <= 300; i++) {
      const frame = sampleRitualMotion(op, i / 300);
      assert.equal(frame.cards.length, ids.length); assert.deepEqual(new Set(frame.cards.map(card => card.cardId)), new Set(ids));
      for (const card of frame.cards) {
        assert([card.x, card.y, card.pitch, card.z, card.rotation].every(Number.isFinite));
        assert(card.x >= 370 && card.x <= 710); assert(card.y >= 300 && card.y <= 505);
      }
      frame.hands.forEach(hand => assert([hand.x, hand.y, hand.turn].every(Number.isFinite)));
    }
    const final = sampleRitualMotion(op, 1);
    assert.deepEqual([...final.cards].sort((a, b) => b.z - a.z).map(card => card.cardId), result.ids);
    assert.equal(JSON.stringify(op), before);
    if (stage === "cut") { assert.equal(final.phase, "readyToDraw"); assert.equal(final.energy, 0); assert.deepEqual(result.orientations, orientations); }
    else { assert.equal(final.phase, "shuffleHold"); assert(final.energy > .4); }
    const state = { ...emptyPreparation(), phase: stage === "cut" ? "cutting" as const : "shuffling" as const, shuffleTarget: 1, cutTarget: stage === "cut" ? 1 : 0, pending: op };
    assert.deepEqual(restorePreparation(state, ids, stage === "cut" ? 1 : 0, 0), state);
    const broken = structuredClone(state); broken.pending.packets[0].poses[1].x += 1;
    assert.equal(restorePreparation(broken, ids, stage === "cut" ? 1 : 0, 0), null);
  }
});

test("rounds and the cut dialogue connect at exactly the same wrist, card and crystal positions", () => {
  const op = createMagicPreparationOperation(ids, "shuffle", "riffle", seededRandomInt(23));
  const result = applyPreparationOperation(op, orientations);
  const next = createMagicPreparationOperation(result.ids, "shuffle", "packets", seededRandomInt(24));
  const cut = createMagicPreparationOperation(result.ids, "cut", "triple", seededRandomInt(25));
  const end = sampleRitualMotion(op, 1, { round: 1, total: 2 });
  for (const frame of [sampleRitualMotion(next, 0, { round: 2, total: 2 }), sampleRitualMotion(cut, 0)]) {
    assert.deepEqual(frame.hands, end.hands); assert.equal(frame.energy, end.energy);
    for (const card of frame.cards) {
      const before = end.cards.find(value => value.cardId === card.cardId)!;
      assert(Math.abs(card.x - before.x) < 1e-7); assert(Math.abs(card.y - before.y) < 1e-7);
    }
  }
  const held = { ...op, id: "held", beforeIds: result.ids, packets: [{ ids: result.ids, flip: false, poses: [{ t: 0, x: 540, y: 320, rotation: 0 }, { t: 1, x: 540, y: 320, rotation: 0 }] }], collection: [0] };
  const hold = sampleRitualMotion(held, 0, { round: 1, total: 0, holding: true });
  assert.equal(hold.phase, "awaitCutConfig"); assert.deepEqual(hold.hands, end.hands);
  const nextCut = createMagicPreparationOperation(applyPreparationOperation(cut, orientations).ids, "cut", "double", seededRandomInt(26));
  assert.deepEqual(sampleRitualMotion(cut, 1, { round: 1, total: 2 }).hands, sampleRitualMotion(nextCut, 0, { round: 2, total: 2 }).hands);
});

test("cutting conserves contiguous blocks and their internal order, with visible separation and exchange", () => {
  for (const action of CUT_ACTIONS) {
    const op = createMagicPreparationOperation(ids, "cut", action, seededRandomInt(43));
    const expected = applyPreparationOperation(op, orientations).ids;
    for (const packet of op.packets) assert.deepEqual(expected.slice(expected.indexOf(packet.ids[0]), expected.indexOf(packet.ids[0]) + packet.ids.length), packet.ids);
    const mid = sampleRitualMotion(op, .26);
    assert(new Set(mid.packets.map(p => p.x.toFixed(1))).size > 1);
    for (const p of mid.packets) assert.equal(p.rotation, 0);
  }
});

test("fixed seeds reproduce all three trajectories and production randomness remains injectable only at planning", () => {
  const variants = new Set();
  for (const action of SHUFFLE_ACTIONS) {
    const a = createMagicPreparationOperation(ids, "shuffle", action, seededRandomInt(20261012), "replay");
    const b = createMagicPreparationOperation(ids, "shuffle", action, seededRandomInt(20261012), "replay");
    assert.deepEqual(a, b); variants.add(ritualVariant(action));
    for (const p of [0, .25, .50, 1]) assert.deepEqual(sampleRitualMotion(a, p), sampleRitualMotion(b, p));
  }
  assert.equal(variants.size, 3);
  const small = ids.slice(0, 18), op = createMagicPreparationOperation(small, "shuffle", "riffle", seededRandomInt(6));
  assert.equal(sampleRitualMotion(op, .5).cards.length, 18);
});

test("all four skins keep joined cuffs, smooth hands, distinct control roles and a hand lead before levitation", () => {
  const op = createMagicPreparationOperation(ids, "shuffle", "packets", seededRandomInt(51));
  const early = sampleRitualMotion(op, 250 / ritualDuration(op, { round: 1, total: 1 }));
  assert(early.hands[0].y < 475); assert.equal(early.packets[0].x, 500); assert(early.energy < .1);
  for (const character of dealerCharacters) {
    let previous = mapRitualHands(character, sampleRitualMotion(op, 0).hands);
    for (let i = 1; i <= 400; i++) {
      const hands = mapRitualHands(character, sampleRitualMotion(op, i / 400).hands);
      hands.forEach((hand, side) => {
        assert(Math.hypot(hand.x - previous[side].x, hand.y - previous[side].y) < 5);
        const rig = dealerArmRig(character, [hand.x, hand.y], side as 0 | 1, hand.rotation), segment = rig.segments[1];
        const radians = (segment.angle + 90) * Math.PI / 180;
        assert(Math.abs(segment.origin[0] + Math.cos(radians) * segment.length - hand.x) < 1e-7);
        assert(Math.abs(segment.origin[1] + Math.sin(radians) * segment.length - hand.y) < 1e-7);
      }); previous = hands;
    }
  }
});

test("frame sampling avoids hidden RNG and excessive CPU work for the 78-card table shuffle", () => {
  const op = createMagicPreparationOperation(ids, "shuffle", "table", seededRandomInt(73));
  const start = performance.now();
  for (let i = 0; i < 600; i++) sampleRitualMotion(op, i / 600);
  assert(performance.now() - start < 2500, "600 frames should leave sufficient rendering budget");
});

test("finger tension starts open, leads block separation, differs between control and guide, and releases before settling", () => {
  const op = createMagicPreparationOperation(ids, "cut", "triple", seededRandomInt(93));
  const saved = JSON.stringify(op);
  const start = sampleRitualMotion(op, 0), gathering = sampleRitualMotion(op, .08), exchange = sampleRitualMotion(op, .32);
  assert(start.hands.every(hand => hand.grip === 0));
  assert(gathering.hands[1].grip > .5 && gathering.hands[0].grip < gathering.hands[1].grip);
  assert(exchange.hands[1].x > start.hands[1].x && exchange.hands[1].rotation > start.hands[1].rotation);
  assert(sampleRitualMotion(op, .62).hands.every(hand => hand.grip === 0));
  assert(sampleRitualMotion(op, 1).hands.every(hand => hand.grip === 0 && hand.turn === 0));
  assert.equal(JSON.stringify(op), saved);
  for (const character of dealerCharacters) assert.equal(mapRitualHands(character, exchange.hands)[1].grip, exchange.hands[1].grip);
});

test("all four finger weights conserve opacity and remain continuous through curl and wrist roll", () => {
  for (let turn = 0; turn <= 1; turn += .01) for (let curl = 0; curl <= 1; curl += .01) {
    const frame = sampleDealerHandPose(turn, curl), previous = sampleDealerHandPose(turn, Math.max(0, curl - .01));
    assert(Math.abs(frame.weights.reduce((n, weight) => n + weight, 0) - 1) < 1e-7);
    frame.weights.forEach((weight, index) => { assert(weight >= 0 && weight <= 1); assert(Math.abs(weight - previous.weights[index]) <= .1251); });
  }
  assert.equal(sampleDealerHandPose(1, 1).pose, "grip");
  assert.equal(sampleDealerHandPose(1, .45).grip, 1, "sustained guiding gestures should have a single opaque finger silhouette");
  assert.equal(sampleDealerHandPose(1, .28).grip, 0, "the supply hand remains relaxed instead of showing a second set of fingers");
  assert.equal(sampleDealerHandPose(0, 1).grip, 0, "closed fingers must not appear through the hand back");
});

test("gaze follows the actual card groups within tiny iris bounds and returns without a timer discontinuity", () => {
  const op = createMagicPreparationOperation(ids, "shuffle", "table", seededRandomInt(53));
  const samples = [.55, .62, .69].map(progress => sampleRitualMotion(op, progress).gaze);
  assert(samples.some((gaze, index) => index && gaze[0] !== samples[index - 1][0]));
  for (const character of dealerCharacters) {
    let previous = dealerGazeOffset(character, sampleRitualMotion(op, 0).gaze);
    for (let i = 1; i <= 600; i++) {
      const offset = dealerGazeOffset(character, sampleRitualMotion(op, i / 600).gaze);
      assert(Math.abs(offset[0]) <= 1 && Math.abs(offset[1]) <= 1.25);
      assert(Math.hypot(offset[0] - previous[0], offset[1] - previous[1]) < .04);
      previous = offset;
    }
  }
});
