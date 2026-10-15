import test from "node:test";
import assert from "node:assert/strict";
import { tarotCards } from "../src/data/tarotCards";
import { createPreparationOperation, applyPreparationOperation, emptyPreparation, restorePreparation } from "../src/lib/preparation";
import { dealerElbow, sampleOverhand } from "../src/lib/overhandMotion";
import { preparationPlaybackMs } from "../src/lib/preparationMotion";

const ids = tarotCards.map(card => card.id);
test("supported overhand preserves every card, keeps grip contact continuous and reaches the committed stack order", () => {
  for (let attempt = 0; attempt < 10; attempt++) {
    const op = createPreparationOperation(ids, "shuffle", "overhand");
    const unchanged = JSON.stringify(op);
    let previous = sampleOverhand(op, 0);
    for (let step = 0; step <= 1000; step++) {
      const p = step / 1000, frame = sampleOverhand(op, p);
      const visibleIds = frame.piles.flatMap(pile => pile.packet.ids);
      assert.equal(visibleIds.length, 78); assert.deepEqual(new Set(visibleIds), new Set(ids));
      assert(frame.piles.length <= 2); assert(frame.taken >= previous.taken);
      const received = frame.piles.find(pile => pile.role === "received");
      if (received && p <= .94) {
        assert.equal(frame.hands[0].x, received.x - 27); assert.equal(frame.hands[0].y, received.y - 18);
        assert.equal(frame.hands[0].pose, "support");
      }
      for (const side of [0,1] as const) {
        const hand = frame.hands[side], before = previous.hands[side];
        assert(Math.hypot(hand.x - before.x, hand.y - before.y) < 8, "hands must not jump between packets");
        const shoulder: [number,number] = [side ? 586 : 414,245], wrist: [number,number] = [hand.x, hand.y + 70];
        const elbow = dealerElbow(shoulder, wrist, side);
        assert(Math.abs(Math.hypot(elbow[0]-shoulder[0],elbow[1]-shoulder[1])-110) < 1e-6);
        assert(Math.abs(Math.hypot(wrist[0]-elbow[0],wrist[1]-elbow[1])-138) < 1e-6);
      }
      previous = frame;
    }
    const orientations = Object.fromEntries(ids.map(id => [id,"upright" as const]));
    const final = sampleOverhand(op, 1);
    assert.deepEqual(final.piles[0].packet.ids, applyPreparationOperation(op, orientations).ids);
    assert.equal(final.piles[0].x,500); assert.equal(final.piles[0].y,430);
    assert.equal(JSON.stringify(op),unchanged);
    assert(preparationPlaybackMs(op) >= 3900 && preparationPlaybackMs(op) <= 5000);
  }
});

test("motion versions validate without invalidating saved legacy operations", () => {
  const op = createPreparationOperation(ids,"shuffle","overhand");
  const state = { ...emptyPreparation(),phase:"shuffling",shuffleTarget:1,pending:op };
  assert(restorePreparation(state,ids,0,0));
  const old = JSON.parse(JSON.stringify(state)); delete old.pending.motionVersion;
  assert(restorePreparation(old,ids,0,0));
  const forged = JSON.parse(JSON.stringify(state)); forged.pending.collection.reverse();
  assert.equal(restorePreparation(forged,ids,0,0),null);
  forged.pending.motionVersion = 3; assert.equal(restorePreparation(forged,ids,0,0),null);
  const incomplete = JSON.parse(JSON.stringify(state));
  incomplete.pending.packets[0].poses.splice(3,1);
  assert.equal(restorePreparation(incomplete,ids,0,0),null);
  const mistimed = JSON.parse(JSON.stringify(state));
  mistimed.pending.packets[0].poses[3].t += .001;
  assert.equal(restorePreparation(mistimed,ids,0,0),null);
  const flipped = JSON.parse(JSON.stringify(state)); flipped.pending.packets[0].flip = true;
  assert.equal(restorePreparation(flipped,ids,0,0),null);
});
