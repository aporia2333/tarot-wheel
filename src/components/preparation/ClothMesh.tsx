"use client";
import { forwardRef, useCallback, useId, useImperativeHandle, useLayoutEffect, useRef } from "react";
import type { DealerManifest, DealerPart } from "@/data/dealerCharacters";
import { clothSkin, matrixText, polygonText, type Point } from "@/lib/actorDetailRig";
import { LimbSprite } from "./LimbSprite";

export interface ClothMeshHandle { seek: (bend: number, gravity: number, length: number) => void }
export const ClothMesh = forwardRef<ClothMeshHandle, { character: DealerManifest; part: DealerPart; width: number; length: number; portion: number }>(function ClothMesh({ character, part, width, length, portion }, ref) {
  const uid = useId().replace(/:/g, ""), nodes = useRef<Array<SVGGElement | null>>([]), crease = useRef<SVGGElement>(null);
  const rest = clothSkin(width, length, length, 0, 0);
  const seek = useCallback((bend: number, gravity: number, targetLength: number) => {
    const mesh = clothSkin(width, length, targetLength, bend, gravity);
    mesh.forEach((triangle, index) => nodes.current[index]?.setAttribute("transform", matrixText(triangle.matrix)));
    crease.current?.setAttribute("opacity", (mesh[0].tension * .22).toFixed(4));
    crease.current?.setAttribute("transform", `translate(${gravity.toFixed(3)} 0)`);
  }, [length, width]);
  useImperativeHandle(ref, () => ({ seek }), [seek]);
  useLayoutEffect(() => { seek(0, 0, length); }, [length, seek]);
  return <g data-cloth-mesh="true">
    <defs>
      <linearGradient id={`fold-${uid}`}><stop stopColor="#071c14" stopOpacity="0" /><stop offset=".45" stopColor="#061c12" /><stop offset=".7" stopColor="#768773" /><stop offset="1" stopColor="#768773" stopOpacity="0" /></linearGradient>
      {rest.map((triangle, index) => {
        const center = triangle.source.reduce((sum, point) => [sum[0] + point[0] / 3, sum[1] + point[1] / 3] as Point, [0, 0] as Point);
        const overlap = triangle.source.map(point => [center[0] + (point[0] - center[0]) * 1.004, center[1] + (point[1] - center[1]) * 1.004] as Point);
        return <clipPath key={index} id={`cloth-${uid}-${index}`}><polygon points={polygonText(overlap)} /></clipPath>;
      })}
    </defs>
    {rest.map((triangle, index) => <g key={index} ref={node => { nodes.current[index] = node; }} transform={matrixText(triangle.matrix)} data-cloth-triangle={index}>
      <g clipPath={`url(#cloth-${uid}-${index})`}><LimbSprite character={character} part={part} x={-width / 2} y={-18} width={width} height={length + 39} portion={portion} /></g>
    </g>)}
    <g ref={crease} opacity={0} data-cloth-fold="true" pointerEvents="none">
      <path d={`M${-width * .35} 20Q0 31 ${width * .3} 17M${-width * .3} 31Q0 42 ${width * .35} 29`} fill="none" stroke={`url(#fold-${uid})`} strokeWidth={2.4} />
    </g>
  </g>;
});
