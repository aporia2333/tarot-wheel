import test from "node:test";
import assert from "node:assert/strict";
import { tarotCards } from "../src/data/tarotCards";
import { applyPreparationOperation, createPreparationOperation, CUT_ACTIONS, SHUFFLE_ACTIONS, emptyPreparation, restorePreparation } from "../src/lib/preparation";
import { cutPacketPoses, magicPacketPoses, sampleCrystalMagic } from "../src/lib/crystalMagicMotion";
import { dealerArmRig, sampleDealerHandTurn } from "../src/lib/dealerArmRig";
import { dealerElbow } from "../src/lib/overhandMotion";
import { dealerCharacters } from "../src/data/dealerCharacters";

// Retain coverage for persisted v3/v4 performances; new v5 continuity is tested separately.
function createMagicPreparationOperation(ids: string[], stage: "shuffle" | "cut", action: Parameters<typeof createPreparationOperation>[2]) {
  const op = createPreparationOperation(ids, stage, action);
  delete op.handPaths;
  return { ...op, motionVersion: stage === "cut" ? 4 as const : 3 as const,
    packets: op.packets.map((packet, index) => ({ ...packet, poses: stage === "cut" ? cutPacketPoses(index, op.packets.length, op.collection)
      : magicPacketPoses(packet, index, op.packets.length, op.collection, false) })) };
}

test("crystal choreography conserves all cards, lands in the planned order, keeps cut orientations and never resamples randomness", () => {
  const ids = tarotCards.map(card => card.id);
  const orientations = Object.fromEntries(ids.map((id, index) => [id, index % 2 ? "upright" as const : "reversed" as const]));
  for (const action of [...SHUFFLE_ACTIONS, ...CUT_ACTIONS]) {
    const stage = CUT_ACTIONS.includes(action as never) ? "cut" : "shuffle";
    const operation = createMagicPreparationOperation(ids, stage, action);
    const saved = JSON.stringify(operation), result = applyPreparationOperation(operation, orientations);
    const context = { ...emptyPreparation(), phase: stage === "cut" ? "cutting" as const : "shuffling" as const,
      shuffleTarget: 1, cutTarget: stage === "cut" ? 1 : 0, pending: operation };
    assert.deepEqual(restorePreparation(JSON.parse(JSON.stringify(context)), ids, stage === "cut" ? 1 : 0, 0), context);
    for (let index = 0; index <= 300; index++) {
      const frame = sampleCrystalMagic(operation, index / 300);
      assert.deepEqual(frame.packets.flatMap(packet => packet.packet.ids), ids);
      assert.equal(new Set(frame.packets.flatMap(packet => packet.packet.ids)).size, 78);
      assert(frame.energy >= 0 && frame.energy <= 1);
      for (const packet of frame.packets) assert([packet.x, packet.displayY, packet.rotation].every(Number.isFinite));
      for (const character of dealerCharacters) frame.hands.forEach((hand, side) => {
        const shoulder = side ? character.anchors.rightShoulder : character.anchors.leftShoulder;
        const [upperLength, lowerLength] = character.rig?.bones ?? [135, 105];
        const elbow = dealerElbow(shoulder, [hand.x, hand.y], side as 0 | 1, upperLength, lowerLength);
        assert(Math.abs(Math.hypot(elbow[0] - shoulder[0], elbow[1] - shoulder[1]) - upperLength) < 1e-7);
        assert(Math.abs(Math.hypot(hand.x - elbow[0], hand.y - elbow[1]) - lowerLength) < 1e-7);
        const rig = dealerArmRig(character, [hand.x, hand.y], side as 0 | 1, hand.rotation);
        assert.equal(rig.segments[0].length, character.rig?.bones[0] ?? 135);
        assert(Math.abs(rig.segments[1].length - (character.rig?.bones[1] ?? 105)) < 1e-7);
        const forearm = rig.segments[1], radians = (forearm.angle + 90) * Math.PI / 180;
        assert(Math.abs(forearm.origin[0] + Math.cos(radians) * forearm.length - hand.x) < 1e-7);
        assert(Math.abs(forearm.origin[1] + Math.sin(radians) * forearm.length - hand.y) < 1e-7);
        assert(Math.abs(rig.handAngle - forearm.angle) <= 12);
      });
    }
    const landed = sampleCrystalMagic(operation, 1);
    assert(landed.packets.every(packet => packet.x === 500 && packet.displayY === 500));
    assert.equal(landed.energy, 0);
    assert.deepEqual(operation.collection.flatMap(index => landed.packets[index].packet.ids), result.ids);
    for (const packet of landed.packets) for (const id of packet.packet.ids) {
      assert.equal(packet.rotation === 180, result.orientations[id] !== orientations[id]);
    }
    if (stage === "cut") assert.deepEqual(result.orientations, orientations);
    assert.equal(JSON.stringify(operation), saved);
    const malformed = JSON.parse(JSON.stringify(context)); malformed.pending.packets[0].poses[3].x += 1;
    assert.equal(restorePreparation(malformed, ids, stage === "cut" ? 1 : 0, 0), null);
    const legacy = { ...context, pending: createPreparationOperation(ids, stage, action) };
    assert.deepEqual(restorePreparation(legacy, ids, stage === "cut" ? 1 : 0, 0), legacy);
    const earlierMagic = { ...context, pending: { ...operation, motionVersion: 3 as const,
      packets: operation.packets.map((packet, index) => ({ ...packet, poses: magicPacketPoses(packet, index, operation.packets.length, operation.collection, stage === "cut") })) } };
    assert.deepEqual(restorePreparation(earlierMagic, ids, stage === "cut" ? 1 : 0, 0), earlierMagic);
  }
});

test("block cutting moves one continuous packet at a time and stacks bottom to top without spinning or flipping", () => {
  const ids = tarotCards.map(card => card.id);
  for (const action of CUT_ACTIONS) for (let run = 0; run < 12; run++) {
    const operation = createMagicPreparationOperation(ids, "cut", action);
    assert.equal(operation.motionVersion, 4);
    let previous = sampleCrystalMagic(operation, 0);
    for (let frame = 1; frame <= 600; frame++) {
      const current = sampleCrystalMagic(operation, frame / 600);
      const moving = current.packets.filter((packet, index) => Math.hypot(packet.x - previous.packets[index].x,
        packet.displayY - previous.packets[index].displayY) > 1e-6);
      assert(moving.length <= 1, `${action} must not interleave packets`);
      assert(current.packets.every(packet => packet.rotation === 0 && packet.pitch === .45 && !packet.packet.flip));
      previous = current;
    }
    const bottomToTop = [...operation.collection].reverse();
    const landingTimes = bottomToTop.map(index => operation.packets[index].poses[7].t);
    assert(landingTimes.every((time, index) => !index || time > landingTimes[index - 1]));
    const final = sampleCrystalMagic(operation, 1);
    for (const [rank, index] of operation.collection.entries()) {
      assert.equal(final.packets[index].below, operation.collection.slice(rank + 1).reduce((sum, next) => sum + operation.packets[next].ids.length, 0));
    }
  }
});

test("magic hands start and finish on their back, lift before turning and pass continuously through a side pose", () => {
  const ids = tarotCards.map(card => card.id);
  for (const stage of ["shuffle", "cut"] as const) {
    const operation = createMagicPreparationOperation(ids, stage, stage === "cut" ? "triple" : "packets");
    const start = sampleCrystalMagic(operation, 0).hands;
    assert.deepEqual(start, sampleCrystalMagic(operation, 1).hands);
    assert(start.every(hand => hand.turn === 0 && hand.rotation === 0));
    const early = sampleCrystalMagic(operation, .05).hands;
    assert(early.every(hand => hand.y < 465 && sampleDealerHandTurn(hand.turn).weights[0] === 1));
    const middle = sampleCrystalMagic(operation, .125).hands;
    assert(middle.every(hand => sampleDealerHandTurn(hand.turn).weights[1] > .5));
    assert(middle[0].turn > middle[1].turn);
    const raised = sampleCrystalMagic(operation, .3).hands;
    assert(sampleCrystalMagic(operation, .14).hands.every((hand, side) => hand.x !== raised[side].x));
    assert(sampleCrystalMagic(operation, .3).hands.every(hand => sampleDealerHandTurn(hand.turn).weights[2] === 1));
    assert(sampleCrystalMagic(operation, .96).hands.every(hand => hand.y < 465 && sampleDealerHandTurn(hand.turn).weights[0] === 1));

    let previous = start;
    for (let frame = 1; frame <= 1000; frame++) {
      const hands = sampleCrystalMagic(operation, frame / 1000).hands;
      hands.forEach((hand, side) => {
        const current = sampleDealerHandTurn(hand.turn), before = sampleDealerHandTurn(previous[side].turn);
        assert(Math.hypot(hand.x - previous[side].x, hand.y - previous[side].y) < 1.6);
        assert(current.width >= .80);
        assert(Math.abs(current.weights.reduce((sum, weight) => sum + weight, 0) - 1) < 1e-7);
        current.weights.forEach((weight, index) => {
          assert(weight >= 0 && weight <= 1);
          assert(Math.abs(weight - before.weights[index]) < .16);
        });
      });
      previous = hands;
    }
  }
});
