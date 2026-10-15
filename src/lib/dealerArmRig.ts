import type { DealerManifest, DealerPart, AtlasRegion } from "@/data/dealerCharacters";
import { dealerElbow } from "./overhandMotion";

type Point = [number, number];

/** Visual proportions are independent of the saved hand path and bone lengths. */
export function dealerLimbAppearance(character: DealerManifest) {
  return character.limbs ?? { upperWidth: 78, forearmWidth: 78, handWidth: 76, handHeight: 74, upperCrop: .54, forearmCrop: .54 };
}

export function dealerRitualProfile(character: DealerManifest) {
  return character.ritual ?? { controlSide: 0 as const, amplitude: 1, rest: [[414, 475], [578, 458]] as [Point, Point], elbowDrop: [14, 5] as Point };
}

export function mapRitualHands(character: DealerManifest, hands: Array<{ x: number; y: number; rotation: number; turn: number; grip?: number }>) {
  const profile = dealerRitualProfile(character), base = [[414, 475], [578, 458]];
  return [0, 1].map(side => {
    const role = side === profile.controlSide ? 0 : 1, source = hands[role];
    return { ...source, x: profile.rest[side][0] + (source.x - base[role][0]) * profile.amplitude,
      y: profile.rest[side][1] + (source.y - base[role][1]) * profile.amplitude };
  });
}

export function dealerLimbAtlas(character: DealerManifest, legacy = false): { atlas: string; grid: [number, number]; parts: Partial<Record<DealerPart, AtlasRegion>>; rowEnds?: [number, number, number]; sideParts?: Partial<Record<DealerPart, AtlasRegion>> } {
  return !legacy && character.rig ? character.rig : character;
}

/** Existing back, curled side and palm artwork share one wrist; narrow the profile as it turns. */
export function sampleDealerHandTurn(value: number) {
  const turn = Math.max(0, Math.min(1, value));
  const smooth = (value: number) => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
  // Most of the roll holds an opaque side silhouette. Brief texture blends avoid ghost fingers.
  const side = smooth((turn - .16) / .14), palm = smooth((turn - .65) / .14);
  return { weights: [1 - side, side * (1 - palm), palm],
    width: 1 - .20 * Math.sin(turn * Math.PI), roll: 4 * Math.sin(turn * Math.PI),
    pose: turn <= .16 ? "back" : turn >= .79 ? "palm" : turn >= .30 && turn <= .65 ? "side" : "turning" };
}

/** Curl is an independent pose channel. Preserve the same cuff and wrist while fingers change. */
export function sampleDealerHandPose(turn: number, curl = 0) {
  const frame = sampleDealerHandTurn(turn);
  const intent = Math.max(0, Math.min(1, curl));
  // Hold opaque key poses; use a short roll between them instead of ghosting two sets
  // of fingers throughout a sustained gesture. Low tension only softens the open pose.
  const t = Math.max(0, Math.min(1, (intent - .30) / .12));
  const grip = t * t * (3 - 2 * t) * frame.weights[2];
  return { ...frame, weights: [...frame.weights.map(weight => weight * (1 - grip)), grip],
    pose: grip > .55 ? "grip" : frame.pose, grip, flex: 1 - .04 * Math.min(.30, intent) };
}

/** Narrow iris texture shifts; eye lids, eyebrows and the surrounding face stay in place. */
export function dealerGazeOffset(character: DealerManifest, gaze: number[]) {
  const scale = character.kind === "cat" ? .42 : .34;
  return [Math.max(-1.0, Math.min(1.0, gaze[0] * scale)), Math.max(-1.25, Math.min(1.25, gaze[1] * scale))];
}

export function dealerArmRig(character: DealerManifest, wrist: Point, side: 0 | 1, gesture = 0) {
  const shoulder = side ? character.anchors.rightShoulder : character.anchors.leftShoulder;
  // Longer upper sleeves and shorter forearms let the elbows hang below the shoulders.
  const [upperLength, lowerLength] = character.rig?.bones ?? [135, 105];
  const elbow = dealerElbow(shoulder, wrist, side, upperLength, lowerLength);
  const angle = (a: Point, b: Point) => Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI - 90;
  const lowerAngle = angle(elbow, wrist);
  return {
    // Each redesign has calibrated adult bone lengths. Old saved table sweeps may reach farther;
    // keep their cuff attached rather than introducing a gap in a resumed historical performance.
    segments: [{ origin: shoulder, angle: angle(shoulder, elbow), length: upperLength },
      { origin: elbow, angle: lowerAngle, length: Math.hypot(wrist[0] - elbow[0], wrist[1] - elbow[1]) }],
    // The cuff belongs to the hand sprite. It inherits the forearm's rotation.
    handAngle: lowerAngle + Math.max(-12, Math.min(12, gesture * .35)),
  };
}
