import test from "node:test";
import assert from "node:assert/strict";
import { dealerCharacters } from "../src/data/dealerCharacters";
import { actorAttention, actorEyeProfile, applyMatrix, triangleMatrix, fingerDefinitions, fingerSkin, clothSkin, hairLocks, hairMotion, type Point } from "../src/lib/actorDetailRig";

const close = (a: Point, b: Point) => assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-7);
test("painted mesh triangles map all vertices exactly and cannot silently accept a degenerate source", () => {
  const source: [Point, Point, Point] = [[-7, 4], [5, 4], [-7, 19]], target: [Point, Point, Point] = [[-6, 5], [9, 3], [-4, 23]];
  const matrix = triangleMatrix(source, target);
  source.forEach((point, index) => close(applyMatrix(matrix, point), target[index]));
  assert.throws(() => triangleMatrix([[0, 0], [0, 1], [0, 2]], target), /Degenerate/);
});
test("each human digit or feline toe has independent joined bones and the open pose preserves painted pixels", () => {
  for (const character of dealerCharacters) for (const side of [0, 1] as const) {
    const box = { x: -34, y: -24, width: 68, height: 78 }, fingers = fingerDefinitions(character, side);
    assert.equal(fingers.length, character.kind === "cat" ? 4 : 5);
    for (const [index, finger] of fingers.entries()) {
      const open = fingerSkin(finger, box, 0, index, character.kind === "cat");
      open.bones.forEach(bone => {
        const point = bone.clip[0]; close(applyMatrix(bone.matrix, point), point);
      });
      let previous = open;
      for (let step = 0; step <= 100; step++) {
        const pose = fingerSkin(finger, box, step / 100, index, character.kind === "cat");
        close(pose.bones[0].origin, open.root);
        pose.bones.forEach((bone, joint) => {
          assert.ok(bone.matrix.every(Number.isFinite));
          if (joint) close(bone.origin, pose.bones[joint - 1].end);
          assert.ok(Math.hypot(bone.end[0] - previous.bones[joint].end[0], bone.end[1] - previous.bones[joint].end[1]) < 1);
        });
        previous = pose;
      }
      assert.ok(previous.bones.at(-1)!.angle > 0);
    }
  }
});
test("cloth mesh deforms painted folds with connected edges and fixes both sleeve endpoints", () => {
  const rest = clothSkin(92, 135, 135, 0, 0), bent = clothSkin(92, 135, 151, 70, 2);
  rest.forEach(triangle => triangle.source.forEach(point => close(applyMatrix(triangle.matrix, point), point)));
  assert.notDeepEqual(rest[2].matrix, bent[2].matrix);
  for (const triangle of bent) triangle.source.forEach((point, index) => close(applyMatrix(triangle.matrix, point), triangle.target[index]));
  close(bent[0].target[0], [-46, -18]); close(bent.at(-1)!.target[1], [46, 172]);
  for (let row = 0; row < 3; row++) {
    close(bent[row * 2].target[2], bent[(row + 1) * 2].target[0]);
    close(bent[row * 2 + 1].target[1], bent[(row + 1) * 2].target[1]);
  }
});
test("all characters have independent anchored locks and deterministic restrained settling", () => {
  assert.equal(actorAttention(0), 0); assert.equal(actorAttention(1), 0); assert.equal(actorAttention(.5), 1);
  for (const character of dealerCharacters) {
    assert.equal(hairLocks(character).length, 2);
    if (character.kind === "cat") {
      const normal = actorEyeProfile(character), focus = actorEyeProfile(character, "focus");
      focus.centers.forEach((center, side) => assert.ok(center[1] - normal.centers[side][1] > 5, "lowered feline face keeps its own eye coordinates"));
    }
    for (const side of [0, 1]) {
      assert.equal(hairMotion(0, [0, 0], 0, side), 0);
      assert.ok(Math.abs(hairMotion(0, [0, 0], 1, side)) < 1e-10);
      let previous = 0;
      for (let step = 0; step <= 100; step++) {
        const angle = hairMotion(.3, [2, 1], step / 100, side);
        assert.ok(Math.abs(angle) <= .65); assert.ok(Math.abs(angle - previous) < .35);
        previous = angle;
      }
    }
  }
});
