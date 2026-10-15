import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { dealerCharacters } from "../src/data/dealerCharacters";
import { staffConduit, staffEnergy, staffWorldPoint } from "../src/lib/staffMagicMotion";
import { applyPreparationOperation, createMagicPreparationOperation } from "../src/lib/preparation";
import { sampleRitualMotion } from "../src/lib/ritualMotion";
import { seededRandomInt } from "../src/lib/random";
import { tarotCards } from "../src/data/tarotCards";

test("all fixed staff materials are real RGBA paintings with aligned blink regions and complete contact masks", () => {
  for (const character of dealerCharacters) {
    assert(character.staff);
    const asset = character.staff, bytes = readFileSync(path.join(process.cwd(), "public", asset.atlas));
    assert.equal(bytes[25], 6); assert.equal(bytes.readUInt32BE(16), bytes.readUInt32BE(20) * 2);
    assert.equal(asset.eyes.length, 2); assert.equal(asset.foreground.length, 2);
    for (const eye of asset.eyes) {
      assert(Math.hypot(eye.open[0] - eye.closed[0], eye.open[1] - eye.closed[1]) < .05);
      assert(eye.radius.every(value => value > 0 && value < .05));
    }
    const tip = staffWorldPoint(asset, asset.tip);
    assert(tip[0] > 580 && tip[0] < 740 && tip[1] < 160);
    assert(!staffConduit(asset).includes("NaN"));
  }
});
test("staff energy follows saved ritual frames without changing cards, orientation or the plan", () => {
  const ids = tarotCards.map(card => card.id), orientations = Object.fromEntries(ids.map((id, i) => [id, i % 2 ? "upright" as const : "reversed" as const]));
  for (const action of ["packets", "table", "triple"] as const) {
    const operation = createMagicPreparationOperation(ids, action === "triple" ? "cut" : "shuffle", action, seededRandomInt(20261013));
    const saved = JSON.stringify(operation), expected = applyPreparationOperation(operation, orientations);
    for (let step = 0; step <= 100; step++) {
      const p = step / 100, frame = sampleRitualMotion(operation, p);
      const light = staffEnergy(frame.energy, p, frame.beat);
      assert(Object.values(light).every(value => Number.isFinite(value) && value >= 0 && value <= 1));
      assert.equal(new Set(frame.cards.map(card => card.cardId)).size, 78);
      assert.equal(JSON.stringify(operation), saved);
    }
    assert.deepEqual(applyPreparationOperation(operation, orientations), expected);
  }
});
test("fixed staff light joins the floating bridge and reduced motion removes the conduit and reflections", () => {
  const ids = tarotCards.map(card => card.id), shuffle = createMagicPreparationOperation(ids, "shuffle", "packets", seededRandomInt(8));
  const end = sampleRitualMotion(shuffle, 1), next = sampleRitualMotion(shuffle, 0, { round: 2, total: 2 });
  const a = staffEnergy(end.energy, 1, end.beat), b = staffEnergy(next.energy, 0, next.beat);
  assert.equal(a.tip, b.tip); assert.equal(a.conduit, b.conduit);
  assert.equal(staffEnergy(.57, 0, "cut-split").split, 0); assert.equal(staffEnergy(0, 1, "readyToDraw").tip, 0);
  const reduced = staffEnergy(.57, .5, "cut-exchange", true);
  assert.equal(reduced.split, 0); assert.equal(reduced.conduit, 0); assert.equal(reduced.reflection, 0);
});
