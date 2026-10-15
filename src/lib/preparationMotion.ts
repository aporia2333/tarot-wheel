import { samplePose, type PreparationAction, type PreparationOperation } from "./preparation";
import { RITUAL_CONFIG, ritualDuration } from "./ritualMotion";

// Presentation timing never changes the persisted operation or its random decisions.
const playbackMs: Record<PreparationAction, number> = { overhand: 3000, riffle: 2600, table: 3400, packets: 2800, double: 1800, triple: 2300, free: 2800 };
export function preparationPlaybackMs(operation: PreparationOperation, round = 1, total = 1, reduced = false) {
  if (operation.motionVersion === 5) return reduced ? RITUAL_CONFIG.reducedMs : ritualDuration(operation, { round, total });
  const natural = operation.action === "overhand" && operation.motionVersion === 2;
  const duration = operation.motionVersion === 4 ? 5600 : operation.motionVersion === 3 ? operation.stage === "shuffle" ? 6800 : 4600
    : natural ? 1400 + operation.packets.length * 360 : playbackMs[operation.action];
  return reduced ? 650 : Math.round(duration * (round > 1 && round < total ? natural ? .9 : .8 : 1));
}
export type HandContact = { x: number; y: number; packet: number | null; pose: "open" | "grip" | "support"; behind: boolean; rotation: number };
export function preparationDisplayY(y: number, action?: PreparationAction) {
  // Compress table sweeps in depth; held piles retain their lifting height.
  return action === "table" ? 500 + (y - 430) * .45 : y + 70;
}
export function preparationHands(operation: PreparationOperation | null, progress: number): [HandContact, HandContact] {
  const rest = (side: number): HandContact => ({ x: side ? 568 : 432, y: 395, packet: null, pose: "open", behind: false, rotation: 0 });
  if (!operation || progress >= .96) return [rest(0), rest(1)];
  if (operation.handPaths && progress <= .45) return [0, 1].map((side) => {
    const p = samplePose(side ? operation.handPaths!.right : operation.handPaths!.left, progress);
    return { x: p.x, y: p.y - 6, packet: null, pose: "open", behind: false, rotation: p.rotation };
  }) as [HandContact, HandContact];
  // Track all logical packets, including those omitted by the representative renderer.
  const packets = operation.packets.map((packet, index) => {
    const p = samplePose(packet.poses, progress);
    const before = samplePose(packet.poses, Math.max(0, progress - .006));
    const after = samplePose(packet.poses, Math.min(1, progress + .006));
    const furthest = packet.poses.reduce((a, b) => Math.abs(a.x - 500) > Math.abs(b.x - 500) ? a : b);
    return { ...p, index, side: furthest.x < 500 ? 0 : 1, speed: Math.hypot(after.x - before.x, after.y - before.y) };
  }).sort((a, b) => b.speed - a.speed);
  const hands: [HandContact, HandContact] = [rest(0), rest(1)];
  for (const side of [0, 1] as const) {
    const packet = packets.find((p) => p.side === side && p.speed > .12);
    if (packet) hands[side] = { x: packet.x + (side ? 29 : -29), y: packet.y - 34, packet: packet.index,
      pose: "grip", behind: side === 0, rotation: packet.rotation * .35 };
  }
  if (operation.action === "overhand" && progress > .02 && progress < .9) {
    const pile = samplePose(operation.packets[0].poses.slice(0, 2), Math.min(progress, .08));
    hands[0] = { x: pile.x - 27, y: pile.y - 18, packet: 0, pose: "support", behind: true, rotation: 0 };
    const moving = packets.find((p) => p.speed > .12);
    if (moving && progress > .08) hands[1] = { x: moving.x + 29, y: moving.y - 34, packet: moving.index, pose: "grip", behind: false, rotation: moving.rotation * .35 };
  }
  return hands;
}
