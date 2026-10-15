"use client";
import { useId } from "react";
import type { DealerManifest, DealerPart } from "@/data/dealerCharacters";
import { dealerLimbAtlas } from "@/lib/dealerArmRig";

/** Keep a common wrist scale while clipping any neighboring row from a generated atlas. */
export function LimbSprite({ character, part, x, y, width, height, portion = 1, legacy = false, sideProfile = false }: {
  character: DealerManifest; part: DealerPart; x: number; y: number; width: number; height: number; portion?: number; legacy?: boolean; sideProfile?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const artwork = dealerLimbAtlas(character, legacy), region = (sideProfile ? artwork.sideParts?.[part] : null) ?? artwork.parts[part];
  if (!region) return null;
  const [column, row, ix, iy, iw, ih] = region;
  const sx = column + ix, sy = row + iy + (portion < 1 ? ih * .025 : 0), sh = ih * portion;
  const clippedHeight = Math.min(sh, (artwork.rowEnds?.[row] ?? sy + sh) - sy);
  return <svg x={x} y={y} width={width} height={height} viewBox={`${sx} ${sy} ${iw} ${sh}`} preserveAspectRatio="none" overflow="hidden">
    <defs><clipPath id={`limb-cell-${uid}`}><rect x={sx} y={sy} width={iw} height={clippedHeight} /></clipPath></defs>
    <image href={artwork.atlas} width={artwork.grid[0]} height={artwork.grid[1]} preserveAspectRatio="none" clipPath={`url(#limb-cell-${uid})`} />
  </svg>;
}
