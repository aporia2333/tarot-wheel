"use client";

import { forwardRef, useId, useImperativeHandle, useRef } from "react";
import { CRYSTAL } from "@/lib/crystalMagicMotion";

export interface CrystalBallHandle { energize: (amount: number, progress: number, split?: number, pulse?:number,arrival?:number) => void }

export const CrystalBall = forwardRef<CrystalBallHandle, { palette?: [string, string] }>(function CrystalBall({ palette }, ref) {
  const uid = useId().replace(/:/g, "");
  const glow = useRef<SVGGElement>(null), core = useRef<SVGGElement>(null), swirl = useRef<SVGGElement>(null);
  const mist = useRef<SVGGElement>(null), currents = useRef<SVGGElement>(null);
  const ripple=useRef<SVGGElement>(null);
  const [cool, warm] = palette ?? ["#bdcfb3", "#d6dcb0"];
  useImperativeHandle(ref, () => ({ energize(amount, progress, split = 0,pulse=0,arrival=0) {
    glow.current?.setAttribute("opacity", String(amount * .55));
    core.current?.setAttribute("opacity", String(.22 + amount * .55+pulse*.18));
    const turn = Math.sin(progress * Math.PI * 2) * 12;
    swirl.current?.setAttribute("transform", `rotate(${turn})`);
    mist.current?.setAttribute("opacity", String(amount * .52));
    mist.current?.setAttribute("transform", `translate(${Math.sin(progress * Math.PI * 2) * 3} ${Math.sin(progress * Math.PI) * 2}) rotate(${-turn * .7})`);
    currents.current?.setAttribute("opacity", String(split * .55));
    ripple.current?.setAttribute("opacity",String(pulse*.68));
    ripple.current?.setAttribute("transform",`scale(${.6+arrival*.85})`);
  } }));
  return <g className="crystal-ball" data-crystal="true" transform={`translate(${CRYSTAL.x} ${CRYSTAL.y})`}>
    <defs>
      <radialGradient id={`glass-${uid}`} cx="32%" cy="24%" r="78%">
        <stop stopColor="#e3eee2" stopOpacity=".85" /><stop offset=".25" stopColor="#aac8bd" stopOpacity=".65" />
        <stop offset=".65" stopColor="#315f64" stopOpacity=".85" /><stop offset=".9" stopColor="#173734" />
        <stop offset="1" stopColor="#9cad92" stopOpacity=".8" />
      </radialGradient>
      <radialGradient id={`aura-${uid}`}><stop stopColor={warm} stopOpacity=".55" /><stop offset="1" stopColor="#9ab5a8" stopOpacity="0" /></radialGradient>
      <radialGradient id={`heart-${uid}`}><stop stopColor="#edf0d4" /><stop offset=".28" stopColor={cool} stopOpacity=".9" /><stop offset="1" stopColor="#8fb0a0" stopOpacity="0" /></radialGradient>
      <linearGradient id={`brass-${uid}`}><stop stopColor="#4a3626" /><stop offset=".38" stopColor="#b49b66" /><stop offset=".6" stopColor="#d3bd80" /><stop offset="1" stopColor="#57432c" /></linearGradient>
      <clipPath id={`inside-${uid}`}><circle r={40} /></clipPath>
    </defs>
    <ellipse cy={65} rx={58} ry={12} fill="#051711" opacity=".4" />
    <path d="M-19 38Q-10 50-14 54L-29 59Q-32 64 0 66Q32 64 29 59L14 54Q10 50 19 38Z" fill={`url(#brass-${uid})`} stroke="#97805a" strokeWidth=".8" />
    <ellipse cy={39} rx={29} ry={9} fill="#273d30" stroke="#b9a16a" strokeWidth={2} />
    <g ref={glow} opacity={0}><ellipse rx={84} ry={74} fill={`url(#aura-${uid})`} /><ellipse cy={56} rx={74} ry={17} fill={`url(#aura-${uid})`} /></g>
    <circle r={43} fill={`url(#glass-${uid})`} stroke="#d3dcc8" strokeWidth=".8" />
    <g clipPath={`url(#inside-${uid})`}>
      <g ref={core} opacity=".22"><ellipse cx={3} cy={7} rx={30} ry={32} fill={`url(#heart-${uid})`} /></g>
      <g ref={mist} opacity={0} data-crystal-mist="true">
        <ellipse cx={-10} cy={5} rx={27} ry={13} fill={`url(#heart-${uid})`} transform="rotate(-24)" />
        <ellipse cx={11} cy={-10} rx={19} ry={11} fill={`url(#aura-${uid})`} transform="rotate(35)" />
      </g>
      <g ref={ripple} data-crystal-arrival="true" opacity={0} fill="none" stroke={cool} strokeWidth="1.1"><ellipse rx={30} ry={21} transform="rotate(-23)" /><ellipse rx={23} ry={16} transform="rotate(17)" opacity=".35" /></g>
      <g ref={currents} opacity={0} data-crystal-cut-currents="true" fill="none" stroke={cool} strokeWidth=".65">
        <path d="M-29 16Q-35-11-12-23Q1-27-2-10Q-8 7-26 13" />
        <path d="M29-16Q35 11 12 23Q-1 27 2 10Q8-7 26-13" />
      </g>
      <g ref={swirl} opacity=".42" fill="none" stroke="#cbd4b7" strokeWidth=".8">
        <path d="M-37 15Q-6-12 30-2Q47 6 27 24Q5 37-22 25" />
        <path d="M-29-16Q-6-34 20-14Q39 0 21 13" opacity=".45" />
      </g>
      <ellipse cx={-16} cy={-20} rx={10} ry={17} transform="rotate(35 -16 -20)" fill="#f0f4e6" opacity=".31" />
      <path d="M-27-26Q-15-39 5-35" fill="none" stroke="#f0ead4" strokeWidth={2} opacity=".55" strokeLinecap="round" />
      <path d="M21 29Q32 19 33 6" fill="none" stroke="#d1cbaa" strokeWidth="1.2" opacity=".25" />
    </g>
  </g>;
});
