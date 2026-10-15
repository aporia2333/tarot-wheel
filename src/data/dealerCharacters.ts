import starMoon from "../../public/characters/star-moon/manifest.json";
import scholar from "../../public/characters/scholar/manifest.json";
import quqi from "../../public/characters/quqi/manifest.json";
import starCap from "../../public/characters/star-cap/manifest.json";
import type { PreparationAction } from "@/lib/preparation";

export type DealerState = "idle" | "talk" | "shuffle" | "cut" | "finish";
export type DealerExpression = "normal" | "smile" | "focus" | "closed" | "thinking";
export type DealerPart = "body" | "leftArm" | "rightArm" | "leftUpper" | "rightUpper" | "leftLower" | "rightLower" | "leftHand" | "rightHand" | "leftGrip" | "rightGrip" | "leftSupport" | "rightSupport" | DealerExpression;
export type DealerLimbPart = "leftUpper" | "rightUpper" | "leftLower" | "rightLower" | "leftHand" | "rightHand" | "leftGrip" | "rightGrip" | "leftSupport" | "rightSupport";
export type AtlasRegion = [number, number, number, number, number, number];
export interface DealerPortraitManifest {
  version: number; atlas: string; grid: [number, number];
  parts: Record<DealerExpression, AtlasRegion>;
  bounds: [number, number, number, number];
  eyes: [number, number, number, number, number]; blinkOffsetY: number; torsoMask?: string;
}
export interface DealerRigManifest {
  atlas: string; grid: [number, number]; parts: Record<DealerLimbPart, AtlasRegion>; bones: [number, number]; rowEnds?: [number, number, number]; sideParts?: Partial<Record<DealerLimbPart, AtlasRegion>>;
}
export interface DealerFingerAtlas {
  atlas: string; grid: [number, number];
  parts: Record<string, AtlasRegion>;
}
export interface DealerStaffAsset {
  atlas: string; grid: [number, number]; bounds: [number, number, number, number];
  parts: { normal: AtlasRegion; closed: AtlasRegion };
  /** Normalized coordinates in one atlas panel; the whole grip stays painted. */
  tip: [number, number]; eyes: Array<{ open: [number, number]; closed: [number, number]; radius: [number, number] }>;
  foreground: Array<Array<[number, number]>>; palette: [string, string];
  acting?: DealerStaffActing;
}
export type StaffExpression = "focus" | "active" | "smile";
export interface DealerStaffActing {
  atlas: string; grid: [number, number]; parts: Record<StaffExpression, AtlasRegion>;
  /** Three-landmark affine registration to the original eyes and mouth, in scene coordinates. */
  registration: Record<StaffExpression, [number, number, number, number, number, number]>;
  face: [number, number, number, number];
  freeArm: Array<[number, number]>; freePivot: [number, number];
  gripRegions: Array<Array<[number, number]>>; gripPivot: [number, number];
}
export interface DealerRitualProfile {
  /** Anatomical mapping can be inverted by a mirrored character skin. */
  controlSide: 0 | 1; amplitude: number;
  rest: [[number, number], [number, number]];
  elbowDrop: [number, number];
}
export interface DealerManifest {
  id: string; name: string; kind: "human" | "cat"; description: string;
  atlas: string; grid: [number, number]; canvas: [number, number];
  version?: number; legacyAtlas?: string; portrait?: DealerPortraitManifest; rig?: DealerRigManifest; ritual?: DealerRitualProfile;
  limbs?: { upperWidth: number; forearmWidth: number; handWidth: number; handHeight: number; upperCrop: number; forearmCrop: number };
  fingerAtlas?: DealerFingerAtlas;
  staff?: DealerStaffAsset;
  parts: Record<DealerPart, AtlasRegion>;
  anchors: Record<"head" | "body" | "leftShoulder" | "rightShoulder" | "leftRest" | "rightRest" | "deck", [number, number]> & { tableY: number };
  states: Record<DealerState, DealerExpression>;
  actions: Record<PreparationAction, "rig">;
}
export const dealerCharacters = [starMoon, scholar, quqi, starCap] as DealerManifest[];
export const DEALER_STORAGE_KEY = "tarot_dealer_character_v1";
export function getDealerCharacter(id: string | null) { return dealerCharacters.find((character) => character.id === id) ?? dealerCharacters[0]; }
