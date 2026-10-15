import { ritualSmooth } from "./ritualMotion";
import { CRYSTAL } from "./crystalMagicMotion";
import type { DealerStaffAsset } from "@/data/dealerCharacters";

/** Presentation only: no card planning, randomness or reading state. */
export function staffEnergy(energy: number, progress: number, beat: string, reduced = false) {
  const amount = Math.max(0, Math.min(1, energy));
  const charge = beat === "awakening" ? ritualSmooth(progress / .16) * .6 : amount;
  return {
    tip: reduced ? amount * .18 : Math.max(amount * .85, charge),
    conduit: reduced ? 0 : amount * .88,
    reflection: reduced ? 0 : amount * .25,
    // Two restrained currents separate during cutting, no impact flash.
    split: reduced ? 0 : beat.startsWith("cut-") || beat === "settling" ? amount * ritualSmooth(progress / .12) * (1 - ritualSmooth((progress - .62) / .25)) : 0,
  };
}
export function staffWorldPoint(asset: DealerStaffAsset, point: [number, number]): [number, number] {
  return [asset.bounds[0] + point[0] * asset.bounds[2], asset.bounds[1] + point[1] * asset.bounds[3]];
}
export function staffConduit(asset: DealerStaffAsset) {
  const [x, y] = staffWorldPoint(asset, asset.tip);
  // Bend around the outer shoulder before approaching the crystal above the table.
  return `M${x} ${y}C${x + 90} ${y + 170} ${CRYSTAL.x + 210} ${CRYSTAL.y - 55} ${CRYSTAL.x + 8} ${CRYSTAL.y - 23}`;
}
