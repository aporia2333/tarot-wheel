"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";

export interface CardPacketHandle { project: (pitch: number, below: number) => void }
export const CardPacket = forwardRef<CardPacketHandle, { count: number; back: string; pitch?: number }>(function CardPacket({ count, back, pitch = .45 }, ref) {
  const plane = useRef<SVGGElement>(null);
  const thickness = count * .35;
  const projection = (tilt: number, below: number) => `translate(0 ${(-below * .35 * tilt).toFixed(3)}) scale(1 ${tilt.toFixed(3)}) skewX(${(-8 * (1 - tilt)).toFixed(3)})`;
  useImperativeHandle(ref, () => ({ project(tilt, below) { plane.current?.setAttribute("transform", projection(tilt, below)); } }));
  return <g ref={plane} data-packet-plane="true" transform={projection(pitch, 0)}>
    <path d={`M-31 ${50 - thickness}H31V52H-31Z`} fill="#c9bb99" stroke="#746b53" strokeWidth=".7" />
    {Array.from({ length: Math.min(14, Math.max(1, count - 1)) }, (_, index) => <path key={index}
      d={`M-30 ${51 - thickness + (index + 1) * thickness / Math.min(15, count)}H30`} fill="none" stroke="#817862" strokeWidth=".45" opacity=".55" />)}
    <rect x={-31} y={-50 - thickness} width={62} height={102} rx={2.2} fill="#ded4b7" stroke="#ac9770" strokeWidth=".7" />
    <image href={back} x={-31} y={-50 - thickness} width={62} height={102} preserveAspectRatio="none" />
  </g>;
});
