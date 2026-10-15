import { samplePose, type CardPose, type PreparationAction, type PreparationOperation, type PreparationPacket, type PreparationStage } from "./preparation";

export type RitualPhase = "awaitShuffleConfig" | "awakening" | "levitating" | "shuffling" | "shuffleHold" | "awaitCutConfig" | "cutting" | "settling" | "readyToDraw";
export type RitualVariant = "braid" | "triple-flow" | "reverse-arc";
export type RitualContext = { round: number; total: number; holding?: boolean };
export const RITUAL_CONFIG = {
  duration: { awakening: 1300, levitating: 1600, shuffle: 2800, middleShuffle: 2300, hold: 400, cut: 2300, settling: 1200 },
  deck: { rest: [500, 500], floating: [540, 390], fanWidth: 240, thickness: .35, pitch: .74 },
  effects: { desktopMotes: 8, compactMotes: 3, lowMotes: 0, maxGlow: .60 },
  actor: { controlCurl: .28, guideCurl: .94, guideReach: 15, wristSweep: 18, gazeXLimit: 2.1, gazeYLimit: 3.4 },
  reducedMs: 650,
} as const;
export const ritualSmooth = (value: number) => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const pose = (t: number, x: number, y: number, rotation = 0): CardPose => ({ t, x, y, rotation });
const compiled = new WeakMap<PreparationOperation, { beforeBelow: number[]; afterBelow: number[]; beforeRanks: Map<string, number>; afterRanks: Map<string, number> }>();
function compile(operation: PreparationOperation) {
  let plan = compiled.get(operation);
  if (!plan) {
    const final = operation.collection.flatMap(i => operation.packets[i].ids);
    plan = { beforeBelow: operation.packets.map((_, index) => operation.packets.slice(index + 1).reduce((n, p) => n + p.ids.length, 0)),
      afterBelow: operation.packets.map((_, index) => operation.collection.slice(operation.collection.indexOf(index) + 1).reduce((n, i) => n + operation.packets[i].ids.length, 0)),
      beforeRanks: new Map(operation.beforeIds.map((id, index) => [id, operation.beforeIds.length - index])),
      afterRanks: new Map(final.map((id, index) => [id, final.length - index])) };
    compiled.set(operation, plan);
  }
  return plan;
}
export function ritualVariant(action: PreparationAction): RitualVariant {
  return action === "packets" ? "triple-flow" : action === "overhand" ? "reverse-arc" : "braid";
}

/** Only presentation changes. Packet membership and collection come from the established engine. */
export function ritualPacketPoses(packet: PreparationPacket, index: number, count: number, collection: number[], stage: PreparationStage, action: PreparationAction): CardPose[] {
  const lane = index / Math.max(1, count - 1), destination = collection.indexOf(index) / Math.max(1, count - 1);
  const reverse = ritualVariant(action) === "reverse-arc" ? -1 : 1;
  const spread = stage === "cut" ? Math.min(142, (count - 1) * 55) : RITUAL_CONFIG.deck.fanWidth / 2;
  const x = 540 + (lane * 2 - 1) * spread * reverse, endX = 540 + (destination * 2 - 1) * spread * reverse;
  const arc = stage === "cut" ? 0 : -18 * Math.sin(lane * Math.PI);
  const angle = stage === "cut" ? 0 : (lane * 2 - 1) * 7;
  const flip = packet.flip ? 180 : 0;
  const depth = stage === "cut" ? index % 2 ? -42 : 24 : (index % (ritualVariant(action) === "triple-flow" ? 3 : 2) - .5) * 22;
  return [pose(0, 540, 320), pose(.24, x, 320 + arc, angle), pose(.46, x, 320 + depth, angle),
    pose(.70, endX, 320 + depth, flip - angle), pose(.80, endX, 320, flip),
    pose(.98, 540, 320, flip), pose(1, 540, 320, flip)];
}

export function ritualDuration(operation: PreparationOperation, context: RitualContext) {
  const first = operation.stage === "shuffle" && context.round === 1 && !context.holding;
  const body = operation.stage === "cut" ? RITUAL_CONFIG.duration.cut
    : context.round > 1 && context.round < context.total ? RITUAL_CONFIG.duration.middleShuffle : RITUAL_CONFIG.duration.shuffle;
  return (first ? RITUAL_CONFIG.duration.awakening + RITUAL_CONFIG.duration.levitating : 0) + body + RITUAL_CONFIG.duration.hold
    + (operation.stage === "cut" && context.round === context.total ? RITUAL_CONFIG.duration.settling : 0);
}

/** A shared floating pose connects rounds, the second dialogue and cutting without a reset. */
export function sampleRitualMotion(operation: PreparationOperation, progress: number, context: RitualContext = { round: 1, total: 1 }) {
  const p = Math.max(0, Math.min(1, progress)), duration = ritualDuration(operation, context), time = p * duration;
  const first = operation.stage === "shuffle" && context.round === 1 && !context.holding;
  const compiledPlan = compile(operation);
  const intro = first ? RITUAL_CONFIG.duration.awakening + RITUAL_CONFIG.duration.levitating : 0;
  const body = operation.stage === "cut" ? RITUAL_CONFIG.duration.cut
    : context.round > 1 && context.round < context.total ? RITUAL_CONFIG.duration.middleShuffle : RITUAL_CONFIG.duration.shuffle;
  const settleStart = intro + body + RITUAL_CONFIG.duration.hold;
  const settling = operation.stage === "cut" && context.round === context.total ? ritualSmooth((time - settleStart) / RITUAL_CONFIG.duration.settling) : 0;
  const awake = first ? ritualSmooth(time / RITUAL_CONFIG.duration.awakening) : 1;
  const lift = first ? ritualSmooth((time - RITUAL_CONFIG.duration.awakening) / RITUAL_CONFIG.duration.levitating) : 1;
  const step = context.holding ? 1 : Math.max(0, Math.min(1, (time - intro) / body));
  const spread = ritualSmooth(step / .24) * (1 - ritualSmooth((step - .80) / .18));
  const energy = lerp(.04, .57, first ? ritualSmooth((time - 260) / 1200) : 1) * (1 - settling);
  const phase: RitualPhase = context.holding ? "awaitCutConfig" : first && time < RITUAL_CONFIG.duration.awakening ? "awakening"
    : first && time < intro ? "levitating" : time < intro + body ? operation.stage === "cut" ? "cutting" : "shuffling"
    : time < settleStart || operation.stage === "shuffle" || context.round < context.total ? "shuffleHold"
    : p < 1 ? "settling" : "readyToDraw";
  const beat = phase === "shuffling" ? step < .24 ? "spread" : step < .70 ? "weave" : "align"
    : phase === "cutting" ? step < .24 ? "cut-split" : step < .46 ? "cut-pause" : step < .80 ? "cut-exchange" : "cut-stack" : phase;
  const packetOffsets = operation.packets.map((packet, index) => {
    const point = samplePose(packet.poses, step);
    const before = compiledPlan.beforeBelow[index], after = compiledPlan.afterBelow[index];
    return { ...point, index, packet, below: lerp(before, after, ritualSmooth((step - .70) / .10)),
      pitch: lerp(.45, RITUAL_CONFIG.deck.pitch, lift * (1 - settling)),
      x: lerp(500, point.x, lift * (1 - settling)), displayY: lerp(500, point.y + 70, lift * (1 - settling)) };
  });
  const weave = Math.sin(Math.PI * ritualSmooth((step - .24) / .46)) * spread;
  const cards = packetOffsets.flatMap(packet => packet.packet.ids.map((cardId, offset) => {
    const below = packet.below + packet.packet.ids.length - offset;
    const fan = operation.stage === "shuffle" ? (offset / Math.max(1, packet.packet.ids.length - 1) - .5) * 42 * spread : 0;
    return { cardId, packetIndex: packet.index, offset, x: packet.x + fan,
      y: packet.displayY - below * RITUAL_CONFIG.deck.thickness * packet.pitch,
      rotation: packet.rotation, pitch: packet.pitch,
      z: lerp(compiledPlan.beforeRanks.get(cardId)!, compiledPlan.afterRanks.get(cardId)!, ritualSmooth((step - .70) / .10))
        + (packet.index % 2 ? 130 : -130) * weave };
  }));
  // Shared asymmetrical endpoints; the dominant hand leads the glass response by ~260ms.
  const lead = first ? ritualSmooth(time / 1350) : 1;
  const guide = first ? ritualSmooth((time - 380) / 1550) : 1;
  // Fingers establish control before the blocks fully separate. Every round ends open,
  // preserving the shared floating wrist pose across refreshes and subsequent rounds.
  const gathering = ritualSmooth(step / .14) * (1 - ritualSmooth((step - .78) / .20));
  const tension = operation.stage === "cut" ? gathering : gathering * .46;
  const sweep = Math.sin(Math.PI * ritualSmooth((step - .24) / .46)) * spread;
  const guideGesture = operation.stage === "cut" ? RITUAL_CONFIG.actor.guideReach * sweep : Math.sin(step * Math.PI * 2) * 12 * spread;
  const hands = [
    { x: lerp(414, 370, lead * (1 - settling)), y: lerp(475, 414, lead * (1 - settling)), rotation: -9 * lead * (1 - settling), turn: lead * (1 - settling), grip: RITUAL_CONFIG.actor.controlCurl * tension * (1 - settling) },
    { x: lerp(578, 694 + guideGesture, guide * (1 - settling)), y: lerp(458, 423 - weave * 9, guide * (1 - settling)), rotation: (9 + RITUAL_CONFIG.actor.wristSweep * sweep) * guide * (1 - settling), turn: guide * (1 - settling), grip: RITUAL_CONFIG.actor.guideCurl * tension * (1 - settling) },
  ];
  // Follow the current weighted group centre, rather than oscillating on a free-running timer.
  const attention = packetOffsets.reduce((sum, packet) => [sum[0] + packet.x * packet.packet.ids.length,
    sum[1] + packet.displayY * packet.packet.ids.length], [0, 0]).map(value => value / operation.beforeIds.length);
  const tracking = spread * lift;
  const gaze = phase === "awakening" ? [-2.0 * awake, 1.5 * awake] : [-2 + 3 * lift + (attention[0] - 540) / 85 * tracking,
    1.5 + lift * 1.6 + (attention[1] - 390) / 65 * tracking];
  const boundedGaze = [Math.max(-RITUAL_CONFIG.actor.gazeXLimit, Math.min(RITUAL_CONFIG.actor.gazeXLimit, gaze[0])),
    Math.max(-RITUAL_CONFIG.actor.gazeYLimit, Math.min(RITUAL_CONFIG.actor.gazeYLimit, gaze[1]))];
  return { packets: packetOffsets, cards, hands, energy, phase, beat, layered: step >= .70,
    gaze: boundedGaze.map(value => value * (1 - settling)), lean: .3 * awake * (1 - settling),
    shadowX: lerp(500, 540, lift * (1 - settling)), shadowScale: 1 - .28 * lift * (1 - settling), shadowOpacity: .5 - .22 * lift * (1 - settling) };
}
