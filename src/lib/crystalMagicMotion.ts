import { samplePose, type CardPose, type PreparationOperation, type PreparationPacket } from "./preparation";
import { sampleRitualMotion, type RitualContext } from "./ritualMotion";

export const CRYSTAL = { x: 365, y: 481, radius: 43 } as const;
const pose = (t: number, x: number, y: number, rotation = 0): CardPose => ({ t, x, y, rotation });

/** No random decisions during choreography: every lane and deposit follows the saved permutation. */
export function magicPacketPoses(packet: PreparationPacket, index: number, count: number, collection: number[], cut: boolean): CardPose[] {
  const rank = collection.indexOf(index);
  const lane = index / Math.max(1, count - 1);
  const destination = rank / Math.max(1, count - 1);
  const spread = cut ? 118 : 134;
  const x = 540 + (lane * 2 - 1) * spread;
  const y = 300 + Math.sin(lane * Math.PI) * 22;
  const rotation = cut ? 0 : (lane * 2 - 1) * 9;
  const turned = packet.flip ? 180 : 0;
  const deposit = .70 + (count - 1 - rank) / Math.max(1, count - 1) * .14;
  return [pose(0, 500, 430), pose(.14, 500, 430), pose(.30, 540, 340),
    pose(.48, x, y, rotation), pose(.66, 540 + (destination * 2 - 1) * spread,
      300 + Math.sin(destination * Math.PI) * 22 + (cut ? 0 : index % 2 ? -18 : 18), turned - rotation),
    pose(deposit, 540, 340, turned), pose(.88, 540, 340, turned),
    pose(.97, 500, 430, turned), pose(1, 500, 430, turned)];
}

/** Sequential cuts move continuous blocks, never interleaving their cards. */
export function cutPacketPoses(index: number, count: number, collection: number[]): CardPose[] {
  const rank = collection.indexOf(index), split = .30 / count, gather = .40 / count;
  const pickup = .16 + index * split, deposit = .54 + (count - 1 - rank) * gather;
  const gap = count <= 3 ? 108 : 72;
  const x = (count <= 3 ? 500 - (count - 1) * gap * .2 : 440) + index * gap;
  return [pose(0, 500, 430), pose(pickup, 500, 430), pose(pickup + split * .25, 500, 365),
    pose(pickup + split * .85, x, 430), pose(deposit, x, 430),
    pose(deposit + gather * .35, x, 365), pose(deposit + gather * .65, 500, 365),
    pose(deposit + gather * .90, 500, 430), pose(1, 500, 430)];
}

export function isCrystalMagic(operation: PreparationOperation | null): operation is PreparationOperation & { motionVersion: 3 | 4 | 5 } {
  return operation?.motionVersion === 3 || operation?.motionVersion === 4 || operation?.motionVersion === 5;
}

export function sampleCrystalMagic(operation: PreparationOperation, progress: number, context?: RitualContext) {
  if (operation.motionVersion === 5) return sampleRitualMotion(operation, progress, context);
  const p = Math.max(0, Math.min(1, progress));
  const smooth = (value: number) => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
  const release = smooth((p - .88) / .12);
  const energy = smooth((p - .02) / .18) * (1 - smooth((p - .82) / .16));
  const bob = Math.sin((p - .30) * Math.PI * 5) * .9 * smooth((p - .30) / .08) * (1 - smooth((p - .80) / .08));
  const weave = Math.sin(Math.PI * smooth((p - .48) / .18));
  const cutting = operation.motionVersion === 4;
  const pitch = cutting ? .45 : .45 + .55 * smooth((p - .14) / .16) * (1 - smooth((p - .88) / .12));
  const packets = operation.packets.map((packet, index) => {
    const point = samplePose(packet.poses, p);
    const split = .30 / operation.packets.length, gather = .40 / operation.packets.length;
    const deposit = .54 + (operation.packets.length - 1 - operation.collection.indexOf(index)) * gather;
    const before = operation.packets.slice(index + 1).reduce((n, item) => n + item.ids.length, 0);
    const after = operation.collection.slice(operation.collection.indexOf(index) + 1).reduce((n, i) => n + operation.packets[i].ids.length, 0);
    // Lift above the source pile before translating; restore the final pile's thickness on landing.
    const below = cutting ? p < .5 ? before * (1 - smooth((p - (.16 + index * split)) / (split * .25)))
      : after * smooth((p - (deposit + gather * .65)) / (gather * .25))
      : (p < .48 ? before : after) * (1 - smooth((p - .14) / .16) * (1 - smooth((p - .84) / .13)));
    // Saved pose coordinates use the original scene's +70px table projection.
    return { ...point, index, packet, below, pitch, displayY: point.y + 70 + (cutting ? 0 : bob
      + weave * (index % 2 ? -1 : 1) * (operation.stage === "cut" ? 18 : 32)) };
  });
  const hands = [0, 1].map(side => {
    // Lift the forearm before reaching outward and turning the wrist. A small lead from the
    // crystal-side hand keeps both arms from moving as a single rigid, mirrored gesture.
    const start = side * .012;
    const reach = smooth((p - start) / .22) * (1 - release);
    const lift = smooth((p - start) / .18) * (1 - release);
    const turn = smooth((p - start - .045) / .19) * (1 - smooth((p - .84) / .115));
    return { x: side ? 568 + ((cutting ? 660 : 635) - 568) * reach : 432 + (CRYSTAL.x - 432) * reach,
      y: 465 + ((side ? cutting ? 424 : 450 : 418) - 465) * lift,
      rotation: (side ? 14 : -13) * turn, turn };
  });
  const beat = cutting ? p < .16 ? "attune" : p < .46 ? "cut-split" : p < .54 ? "cut-pause" : p < .94 ? "cut-stack" : "cut-square"
    : p < .14 ? "attune" : p < .30 ? "lift" : p < .48 ? "spread" : p < .66 ? "weave" : p < .88 ? "align" : p < .97 ? "land" : "release";
  return { packets, hands, energy, beat, layered: p >= (cutting ? .54 : .66),
    shadowX: packets.reduce((sum, packet) => sum + packet.x * packet.packet.ids.length, 0) / operation.beforeIds.length,
    shadowScale: 1 - Math.min(.32, Math.max(0, (500 - packets[0].displayY) / 450)),
    shadowOpacity: .50 - energy * .19 };
}
