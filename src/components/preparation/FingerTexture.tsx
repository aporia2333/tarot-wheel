"use client";
import type { DealerFingerAtlas } from "@/data/dealerCharacters";

export function FingerTexture({ atlas, part, x, y, width, height }: { atlas: DealerFingerAtlas; part: string; x: number; y: number; width: number; height: number }) {
  const region = atlas.parts[part];
  if (!region) return null;
  const [column, row, ix, iy, iw, ih] = region;
  return <svg x={x} y={y} width={width} height={height} viewBox={`${column + ix} ${row + iy} ${iw} ${ih}`} preserveAspectRatio="none" overflow="hidden">
    <image href={atlas.atlas} width={atlas.grid[0]} height={atlas.grid[1]} preserveAspectRatio="none" />
  </svg>;
}
