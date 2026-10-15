"use client";
import { forwardRef, useId, useImperativeHandle, useRef } from "react";
import type { DealerStaffAsset } from "@/data/dealerCharacters";
import { staffEnergy } from "@/lib/staffMagicMotion";
import { posedStaffTip, RESTING_STAFF, type StaffPerformance } from "@/lib/staffPerformance";
import { CRYSTAL } from "@/lib/crystalMagicMotion";

export interface StaffMagicHandle { seek:(energy:number,progress:number,beat:string,reduced:boolean,performance?:StaffPerformance)=>void }
export const StaffMagic=forwardRef<StaffMagicHandle,{asset:DealerStaffAsset}>(function StaffMagic({asset},ref){
  const uid=useId().replace(/:/g,""),tip=useRef<SVGGElement>(null),conduit=useRef<SVGGElement>(null),reflection=useRef<SVGGElement>(null);
  const paths=useRef<Array<SVGPathElement|null>>([]),flow=useRef<SVGPathElement>(null),ring=useRef<SVGGElement>(null);
  const [cool,warm]=asset.palette;
  useImperativeHandle(ref,()=>({seek(energy,progress,beat,reduced,performance=RESTING_STAFF){
    const light=staffEnergy(energy,progress,beat,reduced),[x,y]=posedStaffTip(asset,performance);
    const path=`M${x} ${y}C${x+85} ${y+155} ${CRYSTAL.x+215} ${CRYSTAL.y-60} ${CRYSTAL.x+8} ${CRYSTAL.y-23}`;
    tip.current?.setAttribute("transform",`translate(${x.toFixed(3)} ${y.toFixed(3)})`);
    tip.current?.setAttribute("data-tip-world",`${x.toFixed(3)},${y.toFixed(3)}`);
    tip.current?.setAttribute("opacity",(reduced?light.tip:Math.max(light.tip,performance.release*.9)).toFixed(4));
    conduit.current?.setAttribute("opacity",(reduced?0:Math.max(light.conduit,performance.release*.8)*performance.release).toFixed(4));
    reflection.current?.setAttribute("opacity",light.reflection.toFixed(4));
    paths.current.forEach(node=>node?.setAttribute("d",path));flow.current?.setAttribute("d",path);
    flow.current?.setAttribute("stroke-dashoffset",String(-performance.flow*100));
    flow.current?.setAttribute("opacity",reduced?"0":String((.55+performance.pulse*.45)*Math.sin(performance.flow*Math.PI)));
    ring.current?.setAttribute("transform",`rotate(${reduced?0:progress*180}) scale(${reduced?1:.86+performance.release*.14})`);
  }}));
  return <g data-staff-magic="true" pointerEvents="none">
    <defs>
      <radialGradient id={`light-${uid}`}><stop stopColor={cool} stopOpacity=".9" /><stop offset=".34" stopColor={warm} stopOpacity=".27" /><stop offset="1" stopColor={warm} stopOpacity="0" /></radialGradient>
      <linearGradient id={`thread-${uid}`}><stop stopColor={cool} stopOpacity=".9" /><stop offset=".5" stopColor={warm} /><stop offset="1" stopColor={warm} stopOpacity=".85" /></linearGradient>
    </defs>
    <g ref={reflection} opacity={0} data-staff-reflection="true"><ellipse cx={472} cy={500} rx={110} ry={25} fill={`url(#light-${uid})`} /></g>
    <g ref={conduit} opacity={0} data-staff-conduit="true">
      <path ref={node=>{paths.current[0]=node;}} fill="none" stroke={warm} strokeWidth={8} opacity=".18" />
      <path ref={node=>{paths.current[1]=node;}} fill="none" stroke={`url(#thread-${uid})`} strokeWidth={2.2} opacity=".9" />
      <path ref={flow} data-magic-flow="true" fill="none" stroke={cool} strokeWidth={4} strokeLinecap="round" pathLength={100} strokeDasharray="8 92" />
    </g>
    <g ref={tip} opacity={0} data-staff-tip="true">
      <ellipse rx={29} ry={32} fill={`url(#light-${uid})`} />
      <circle r={5.5} fill={cool} opacity=".8" />
      <g ref={ring} data-staff-charge-ring="true" fill="none" stroke={warm} strokeWidth=".8" opacity=".85">
        <path d="M-20 0A20 20 0 0 1 13-15M20 0A20 20 0 0 1-13 15" />
        <path d="M-25 0h7M25 0h-7M0-25v7M0 25v-7" stroke={cool} />
      </g>
    </g>
  </g>;
});
