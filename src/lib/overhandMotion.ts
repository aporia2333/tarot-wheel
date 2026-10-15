import { samplePose, type CardPose, type PreparationOperation, type PreparationPacket } from "./preparation";
import type { HandContact } from "./preparationMotion";

type Point = [number, number];
export type OverhandPile = { index: number; role: "source" | "received"; x: number; y: number; rotation: number; packet: PreparationPacket };
export function isNaturalOverhand(operation: PreparationOperation | null): operation is PreparationOperation {
  return operation?.action === "overhand" && operation.motionVersion === 2;
}
const smooth = (v: number) => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rest = (side: number): HandContact => ({ x: side ? 568 : 432, y: 395, packet: null, pose: "open", behind: false, rotation: 0 });

/** Two supported piles, derived only from the saved packet order and pickup/deposit events. */
export function sampleOverhand(operation: PreparationOperation, progress: number) {
  const p = Math.max(0, Math.min(1, progress));
  const n = operation.packets.length;
  const stroke = .62 / n;
  const index = Math.max(0, Math.min(n - 1, Math.floor((p - .22) / stroke)));
  const packet = operation.packets[index];
  const pickup = packet.poses[3].t;
  const deposit = packet.poses[4].t;
  const taken = p < .22 ? 0 : p >= .84 ? n : index + (p >= pickup ? 1 : 0);
  const source = samplePose(operation.packets[0].poses.slice(0, 3), Math.min(p, .22));
  let received: CardPose = { t: p, x: 480, y: 415, rotation: -4 };
  if (p >= .22 && p < .84) {
    const start = .22 + index * stroke;
    if (p < pickup) {
      // The receiving palm approaches before it strips the next packet.
      const t = smooth((p - start) / (pickup - start));
      received = { t: p, x: lerp(480, source.x, t), y: lerp(415, source.y, t), rotation: lerp(-4, source.rotation, t) };
    } else received = samplePose(packet.poses.slice(3, 6), p);
  } else if (p >= .84) received = samplePose(packet.poses.slice(5), p);
  const piles: OverhandPile[] = [];
  const sourceIds = operation.packets.slice(taken).flatMap(item => item.ids);
  const receivedIds = operation.collection.filter(i => i < taken).flatMap(i => operation.packets[i].ids);
  if (sourceIds.length) piles.push({ ...source, index: 0, role: "source", packet: { ids: sourceIds, flip: false, poses: [] } });
  if (receivedIds.length) piles.push({ ...received, index: 1, role: "received", packet: { ids: receivedIds, flip: false, poses: [] } });
  const leftTarget = { x: received.x - 27, y: received.y - 18 };
  const rightTarget = { x: source.x + 28, y: source.y - 18 };
  const left: HandContact = { ...rest(0), ...leftTarget, packet: taken ? taken - 1 : null,
    pose: taken ? "support" : "open", behind: true, rotation: received.rotation };
  const right: HandContact = { ...rest(1), ...rightTarget, packet: taken < n ? taken : null,
    pose: p >= .105 && p < .91 ? "grip" : "open", rotation: source.rotation };
  if (p < .22) {
    const t = smooth(p / .12);
    left.x = lerp(432, 453, t); left.y = lerp(395, 397, t); left.rotation = lerp(0, -4, t);
    if (p < .12) { right.x = lerp(568, rightTarget.x, t); right.y = lerp(395, rightTarget.y, t); }
  }
  if (p > .84) {
    const t = smooth((p - .84) / .16);
    right.x = lerp(rightTarget.x, 568, t); right.y = lerp(rightTarget.y, 395, t); right.rotation = lerp(source.rotation, 0, t);
  }
  if (p > .94) {
    const t = smooth((p - .94) / .06);
    left.x = lerp(leftTarget.x, 432, t); left.y = lerp(leftTarget.y, 395, t); left.rotation = lerp(received.rotation, 0, t);
    if (p > .97) left.pose = "open";
  }
  const beat = p < .12 ? "approach" : p < .22 ? "lift" : p < .84 ? p < pickup ? "reach" : p < deposit ? "receive" : "hold" : p < .94 ? "align" : "release";
  return { piles, hands: [left, right] as [HandContact, HandContact], taken, beat };
}

/** A fixed-length two-bone chain; the elbow always bends away from the torso. */
export function dealerElbow(shoulder: Point, wrist: Point, side: 0 | 1, upper = 110, lower = 138): Point {
  const dx = wrist[0] - shoulder[0], dy = wrist[1] - shoulder[1];
  const distance = Math.max(Math.abs(upper - lower) + .001, Math.min(upper + lower - .001, Math.hypot(dx, dy)));
  const angle = Math.atan2(dy, dx);
  const along = (upper * upper - lower * lower + distance * distance) / (2 * distance);
  const perpendicular = Math.sqrt(Math.max(0, upper * upper - along * along)) * (side ? -1 : 1);
  return [shoulder[0] + Math.cos(angle) * along - Math.sin(angle) * perpendicular,
    shoulder[1] + Math.sin(angle) * along + Math.cos(angle) * perpendicular];
}
