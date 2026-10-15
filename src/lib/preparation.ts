import { randomInt, type RandomIntSource } from "@/lib/random";
import { createReadingId } from "@/lib/ids";
import type { Orientation } from "@/types";
import { cutPacketPoses, magicPacketPoses } from "./crystalMagicMotion";

import { ritualPacketPoses } from "./ritualMotion";

export const PREPARATION_CONFIG = {
  manual: { min: 1, max: 10 },
  shuffleRandom: { min: 2, max: 4 },
  cutRandom: { min: 1, max: 3 },
  duration: { overhand: 4800, riffle: 4400, table: 5200, packets: 4800, double: 3200, triple: 4000, free: 4800 },
} as const;
export const SHUFFLE_ACTIONS = ["overhand", "riffle", "table", "packets"] as const;
export const CUT_ACTIONS = ["double", "triple", "free"] as const;
export type PreparationAction = typeof SHUFFLE_ACTIONS[number] | typeof CUT_ACTIONS[number];
export type PreparationStage = "shuffle" | "cut";
export type PreparationCountSource = "manual" | "tarotReader";
export type PreparationPhase = "choose-shuffle" | "shuffling" | "choose-cut" | "cutting" | "ready";
export const ACTION_NAMES: Record<PreparationAction, string> = {
  overhand: "过手洗牌", riffle: "交错洗牌", table: "桌面混洗", packets: "分叠洗牌",
  double: "双叠切牌", triple: "三叠切牌", free: "自由切牌",
};
export interface CardPose { t: number; x: number; y: number; rotation: number }
export interface PreparationPacket { ids: string[]; poses: CardPose[]; flip: boolean }
export interface PreparationOperation {
  id: string;
  stage: PreparationStage;
  action: PreparationAction;
  beforeIds: string[];
  packets: PreparationPacket[];
  /** Final top-to-bottom packet order; animation deposits in reverse order. */
  collection: number[];
  durationMs: number;
  /** 2: supported overhand; 3: levitation; 4: sequential cut; 5: continuous floating ritual. Missing means legacy playback. */
  motionVersion?: 2 | 3 | 4 | 5;
  handPaths?: { left: CardPose[]; right: CardPose[] };
}
export interface PreparationState {
  phase: PreparationPhase;
  shuffleTarget: number;
  cutTarget: number;
  pending: PreparationOperation | null;
  lastAction: PreparationAction | null;
  lastCommittedId: string | null;
  legacyReady?: true;
  countSource?: { shuffle: PreparationCountSource | null; cut: PreparationCountSource | null };
  shuffleMethods?: PreparationAction[];
  cutMethods?: PreparationAction[];
}
export const emptyPreparation = (): PreparationState => ({ phase: "choose-shuffle", shuffleTarget: 0, cutTarget: 0,
  pending: null, lastAction: null, lastCommittedId: null, countSource: { shuffle: null, cut: null }, shuffleMethods: [], cutMethods: [] });
export function validPreparationCount(count: number) {
  return Number.isInteger(count) && count >= PREPARATION_CONFIG.manual.min && count <= PREPARATION_CONFIG.manual.max;
}
export function randomPreparationCount(stage: PreparationStage) {
  const range = stage === "shuffle" ? PREPARATION_CONFIG.shuffleRandom : PREPARATION_CONFIG.cutRandom;
  return range.min + randomInt(range.max - range.min + 1);
}
export function choosePreparationAction(stage: PreparationStage, previous: PreparationAction | null): PreparationAction {
  const choices = [...(stage === "shuffle" ? SHUFFLE_ACTIONS : CUT_ACTIONS)].filter((action) => action !== previous);
  return choices[randomInt(choices.length)];
}
function shuffledIndexes(count: number, random: RandomIntSource) {
  const indexes = Array.from({ length: count }, (_, index) => index);
  for (let index = count - 1; index > 0; index--) {
    const other = random(index + 1); [indexes[index], indexes[other]] = [indexes[other], indexes[index]];
  }
  if (indexes.every((item, index) => item === index)) indexes.push(indexes.shift()!);
  return indexes;
}
function partition(ids: string[], count: number, random: RandomIntSource) {
  const cuts = new Set<number>();
  while (cuts.size < count - 1) cuts.add(1 + random(ids.length - 1));
  const boundaries = [0, ...[...cuts].sort((a, b) => a - b), ids.length];
  return boundaries.slice(1).map((end, index) => ids.slice(boundaries[index], end));
}
const pose = (t: number, x: number, y: number, rotation = 0): CardPose => ({ t, x, y, rotation });

/** The random decisions are made here once, before playback, and are persisted unchanged. */
export function createPreparationOperation(ids: string[], stage: PreparationStage, action: PreparationAction, random: RandomIntSource = randomInt, id = createReadingId()): PreparationOperation {
  if (ids.length < 12 || new Set(ids).size !== ids.length || !(stage === "shuffle" ? SHUFFLE_ACTIONS : CUT_ACTIONS).includes(action as never)) {
    throw new Error("洗切牌动作与牌组不匹配。");
  }
  let groups: string[][];
  let collection: number[];
  let splitIndex = 0;
  const handPaths = action === "table" ? {
    left: [pose(0, 476, 395), pose(.08, 476, 375), pose(.22, 380, 380), pose(.32, 420, 435), pose(.45, 360, 400)],
    right: [pose(0, 524, 395), pose(.08, 524, 375), pose(.22, 620, 380), pose(.32, 580, 435), pose(.45, 640, 400)],
  } : undefined;
  if (action === "table") {
    groups = ids.map((id) => [id]);
    collection = shuffledIndexes(groups.length, random);
  } else if (action === "riffle") {
    const middle = Math.floor(ids.length / 2) - 5 + random(11);
    const chunk = (pile: string[]) => {
      const result: string[][] = [];
      for (let offset = 0; offset < pile.length;) {
        const length = 1 + random(4); result.push(pile.slice(offset, offset + length)); offset += length;
      }
      return result;
    };
    const left = chunk(ids.slice(0, middle)); const right = chunk(ids.slice(middle));
    splitIndex = left.length; groups = [...left, ...right]; collection = [];
    for (let index = 0; index < Math.max(left.length, right.length); index++) {
      if (index < right.length) collection.push(splitIndex + index);
      if (index < left.length) collection.push(index);
    }
  } else {
    const count = action === "double" ? 2 : action === "triple" ? 3 : action === "overhand" ? 7 + random(4)
      : action === "packets" ? 4 + random(3) : 4 + random(3);
    groups = partition(ids, count, random);
    collection = action === "double" ? [1, 0] : action === "overhand" ? groups.map((_, index) => groups.length - 1 - index)
      : shuffledIndexes(groups.length, random);
  }
  const packets = groups.map((group, index): PreparationPacket => {
    const depositIndex = groups.length - 1 - collection.indexOf(index);
    const deposit = .55 + depositIndex / groups.length * .34;
    if (action === "table") {
      const angle = random(80) - 40;
      const hand = index % 2 ? handPaths!.right : handPaths!.left;
      const dx = random(221) - 110; const dy = random(111) - 55;
      const flip = random(4) === 0;
      return { ids: group, flip, poses: [pose(0, 500, 410), pose(.08, 500, 410), pose(.22, hand[2].x + dx, hand[2].y + dy, angle),
        pose(.32, hand[3].x + dx, hand[3].y + dy, angle + (flip ? 90 : 0)),
        pose(.45, hand[4].x + dx, hand[4].y + dy, angle + (flip ? 180 : 0)),
        pose(deposit - .015, hand[4].x + dx, hand[4].y + dy, angle + (flip ? 180 : 0)),
        pose(deposit, 500, 430, flip ? 180 : 0), pose(1, 500, 430, flip ? 180 : 0)] };
    }
    if (action === "overhand") {
      const stroke = .62 / groups.length;
      const pickup = .22 + (index + .42) * stroke;
      const deposit = .22 + (index + .92) * stroke;
      return { ids: group, flip: false, poses: [pose(0, 500, 430), pose(.12, 500, 430), pose(.22, 535, 385, 8),
        pose(pickup, 535, 385, 8), pose(deposit, 480, 415, -4), pose(.84, 480, 415, -4),
        pose(.94, 500, 430), pose(1, 500, 430)] };
    }
    if (action === "riffle") {
      const x = index < splitIndex ? 405 : 595;
      const rotation = index < splitIndex ? 18 : -18;
      return { ids: group, flip: false, poses: [pose(0, 500, 410), pose(.2, x, 390, rotation), pose(.4, x, 365, rotation), pose(deposit - .03, x, 365, rotation),
        pose(deposit, 500, 415, 0), pose(.96, 500, 430), pose(1, 500, 430)] };
    }
    const spreadX = 310 + index / Math.max(1, groups.length - 1) * 380;
    const spreadY = action === "free" ? 365 + (index % 2) * 68 : 400;
    const pickup = .08 + index * .065;
    return { ids: group, flip: false, poses: [pose(0, 500, 410), pose(pickup, 500, 410), pose(pickup + .02, 500, 380),
      pose(pickup + .06, spreadX, spreadY, action === "packets" ? (index % 2 ? 9 : -9) : 0),
      pose(deposit - .025, spreadX, spreadY, 0), pose(deposit, 500, 415), pose(1, 500, 430)] };
  });
  return { id, stage, action, beforeIds: [...ids], packets, collection,
    durationMs: PREPARATION_CONFIG.duration[action], ...(action === "overhand" ? { motionVersion: 2 as const } : {}), ...(handPaths ? { handPaths } : {}) };
}
export function applyPreparationOperation(operation: PreparationOperation, orientations: Record<string, Orientation>) {
  const ids = operation.collection.flatMap((index) => operation.packets[index].ids);
  const nextOrientations = { ...orientations };
  for (const packet of operation.packets) if (packet.flip) for (const id of packet.ids) {
    nextOrientations[id] = orientations[id] === "upright" ? "reversed" : "upright";
  }
  return { ids, orientations: nextOrientations };
}

/** Reuse the established shuffle/cut permutation, with a persisted magical performance. */
export function createMagicPreparationOperation(ids: string[], stage: PreparationStage, action: PreparationAction, random: RandomIntSource = randomInt, id = createReadingId()): PreparationOperation {
  const planned = createPreparationOperation(ids, stage, action, random, id);
  delete planned.handPaths;
  return { ...planned, motionVersion: 5,
    packets: planned.packets.map((packet, index) => ({ ...packet,
      poses: ritualPacketPoses(packet, index, planned.packets.length, planned.collection, stage, action) })) };
}
export function samplePose(poses: CardPose[], progress: number): CardPose {
  const end = poses.findIndex((item) => item.t > progress);
  if (end === -1) return poses[poses.length - 1];
  if (end === 0) return poses[0];
  const a = poses[end - 1]; const b = poses[end];
  const ratio = (progress - a.t) / (b.t - a.t); const eased = ratio * ratio * (3 - 2 * ratio);
  return pose(progress, a.x + (b.x - a.x) * eased, a.y + (b.y - a.y) * eased, a.rotation + (b.rotation - a.rotation) * eased);
}

function record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
/** Strictly validate saved plans, including their permutation and trajectories, before resuming. */
export function restorePreparation(value: unknown, deckIds: string[], shuffleCount: number, cutCount: number): PreparationState | null {
  if (record(value) && value.legacyReady === true) {
    return value.phase === "ready" && deckIds.length > 0 && value.pending === null &&
      value.shuffleTarget === shuffleCount && value.cutTarget === cutCount && value.lastAction === null && value.lastCommittedId === null
      ? value as unknown as PreparationState : null;
  }
  if (!record(value) || !["choose-shuffle", "shuffling", "choose-cut", "cutting", "ready"].includes(value.phase as string) ||
    !Number.isInteger(value.shuffleTarget) || !Number.isInteger(value.cutTarget) ||
    ![value.shuffleTarget, value.cutTarget].every((count) => (count as number) >= 0 && (count as number) <= PREPARATION_CONFIG.manual.max) ||
    (value.lastAction !== null && ![...SHUFFLE_ACTIONS, ...CUT_ACTIONS].includes(value.lastAction as never)) ||
    (value.lastCommittedId !== null && typeof value.lastCommittedId !== "string")) return null;
  const state = value as unknown as PreparationState;
  // Optional fields keep previously saved v3 plans valid without inventing past actions.
  if (state.countSource !== undefined && (!record(state.countSource) || ![state.countSource.shuffle, state.countSource.cut]
    .every((source) => source === null || source === "manual" || source === "tarotReader"))) return null;
  for (const [methods, actions, count] of [[state.shuffleMethods, SHUFFLE_ACTIONS, shuffleCount], [state.cutMethods, CUT_ACTIONS, cutCount]] as const) {
    if (methods !== undefined && (!Array.isArray(methods) || methods.length > count || !methods.every((action) => actions.includes(action as never)))) return null;
  }
  const active = state.phase === "shuffling" || state.phase === "cutting";
  if (state.phase === "choose-shuffle" && (deckIds.length || shuffleCount || cutCount || state.shuffleTarget || state.cutTarget)) return null;
  if (state.phase !== "choose-shuffle" && (!deckIds.length || !validPreparationCount(state.shuffleTarget) || shuffleCount > state.shuffleTarget)) return null;
  if (["choose-shuffle", "shuffling", "choose-cut"].includes(state.phase) && (cutCount !== 0 || state.cutTarget !== 0)) return null;
  if (["choose-cut", "cutting", "ready"].includes(state.phase) && shuffleCount !== state.shuffleTarget) return null;
  if (["cutting", "ready"].includes(state.phase) && (!validPreparationCount(state.cutTarget) || cutCount > state.cutTarget)) return null;
  if (state.phase === "ready" && cutCount !== state.cutTarget) return null;
  if (!active) return state.pending === null ? state : null;
  const stage = state.phase === "shuffling" ? "shuffle" : "cut";
  if ((stage === "shuffle" ? shuffleCount >= state.shuffleTarget : cutCount >= state.cutTarget)) return null;
  const op = state.pending;
  if (!record(op) || typeof op.id !== "string" || op.id === state.lastCommittedId || op.stage !== stage ||
    !(stage === "shuffle" ? SHUFFLE_ACTIONS : CUT_ACTIONS).includes(op.action as never) ||
    op.durationMs !== PREPARATION_CONFIG.duration[op.action as PreparationAction] || !Array.isArray(op.beforeIds) ||
    JSON.stringify(op.beforeIds) !== JSON.stringify(deckIds) || !Array.isArray(op.packets) || !Array.isArray(op.collection) ||
    op.packets.length < 2 || op.packets.length > deckIds.length || op.collection.length !== op.packets.length ||
    new Set(op.collection).size !== op.packets.length || !op.collection.every((index) => Number.isInteger(index) && index >= 0 && index < op.packets.length)) return null;
  if (op.motionVersion !== undefined && op.motionVersion !== 2 && op.motionVersion !== 3 && op.motionVersion !== 4 && op.motionVersion !== 5) return null;
  if (op.motionVersion === 4 && stage !== "cut") return null;
  if (op.motionVersion === 2 && (op.action !== "overhand" ||
    op.collection.some((index, position) => index !== op.packets.length - 1 - position))) return null;
  if ((op.motionVersion === 3 || op.motionVersion === 4 || op.motionVersion === 5) && op.handPaths !== undefined) return null;
  const allIds: string[] = [];
  if (op.handPaths !== undefined) {
    if (!record(op.handPaths) || op.action !== "table") return null;
    for (const hand of [op.handPaths.left, op.handPaths.right]) {
      if (!Array.isArray(hand) || hand.length !== 5) return null;
      for (let index = 0; index < hand.length; index++) {
        const p = hand[index];
        if (!record(p) || ![p.t, p.x, p.y, p.rotation].every((v) => typeof v === "number" && Number.isFinite(v)) ||
          p.t !== [0, .08, .22, .32, .45][index] || (p.x as number) < 200 || (p.x as number) > 800 || (p.y as number) < 250 || (p.y as number) > 550 || p.rotation !== 0) return null;
      }
    }
  }
  for (const [packetIndex, packet] of op.packets.entries()) {
    if (!record(packet) || !Array.isArray(packet.ids) || !packet.ids.length || typeof packet.flip !== "boolean" ||
      !Array.isArray(packet.poses) || packet.poses.length < 3 || packet.poses.length > (op.motionVersion === 3 || op.motionVersion === 4 ? 9 : 8) || (stage === "cut" && packet.flip)) return null;
    allIds.push(...packet.ids);
    let previous = -1;
    for (const p of packet.poses) {
      if (!record(p) || ![p.t, p.x, p.y, p.rotation].every((v) => typeof v === "number" && Number.isFinite(v)) ||
        (p.t as number) <= previous || (p.t as number) < 0 || (p.t as number) > 1 ||
        (p.x as number) < 200 || (p.x as number) > 800 || (p.y as number) < 250 || (p.y as number) > 550 || Math.abs(p.rotation as number) > 360) return null;
      previous = p.t as number;
    }
    if (packet.poses[0].t !== 0 || packet.poses[packet.poses.length - 1].t !== 1) return null;
    if (op.motionVersion === 2) {
      const stroke = .62 / op.packets.length;
      const timeline = [0, .12, .22, .22 + (packetIndex + .42) * stroke,
        .22 + (packetIndex + .92) * stroke, .84, .94, 1];
      if (packet.flip || packet.poses.length !== timeline.length ||
        packet.poses.some((point, index) => point.t !== timeline[index])) return null;
    }
    if (op.motionVersion === 3 && JSON.stringify(packet.poses) !== JSON.stringify(
      magicPacketPoses(packet, packetIndex, op.packets.length, op.collection, stage === "cut"))) return null;
    if (op.motionVersion === 5 && JSON.stringify(packet.poses) !== JSON.stringify(
      ritualPacketPoses(packet as unknown as PreparationPacket, packetIndex, op.packets.length, op.collection, stage, op.action as PreparationAction))) return null;
    if (op.motionVersion === 4 && JSON.stringify(packet.poses) !== JSON.stringify(
      cutPacketPoses(packetIndex, op.packets.length, op.collection))) return null;
  }
  return JSON.stringify(allIds) === JSON.stringify(deckIds) ? state : null;
}
