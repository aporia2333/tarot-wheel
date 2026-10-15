"use client";
import { forwardRef, useId, useImperativeHandle, useLayoutEffect, useRef } from "react";
import type { DealerStaffAsset, StaffExpression } from "@/data/dealerCharacters";
import { staffWorldPoint } from "@/lib/staffMagicMotion";
import { freeArmTransform, RESTING_STAFF, type StaffPerformance } from "@/lib/staffPerformance";
import { ritualSmooth } from "@/lib/ritualMotion";

export interface StaffPortraitHandle { seek: (frame: StaffPerformance) => void }
type Props={asset:DealerStaffAsset;id:string;blink?:boolean;foreground?:boolean;actingReady?:boolean;running?:boolean;resting?:"idle"|"focus"|"finish"};
/** The grip remains one painted unit. The free sleeve/hand retreats behind the table. */
export const StaffPortrait=forwardRef<StaffPortraitHandle,Props>(function StaffPortrait({asset,id,blink=false,foreground=false,actingReady=false,running=false,resting="idle"},ref){
  const uid=useId().replace(/:/g,""),acting=actingReady?asset.acting:undefined;
  const [x,y,width,height]=asset.bounds;
  const pose=useRef<SVGGElement>(null),free=useRef<SVGGElement>(null),grip=useRef<SVGGElement>(null),lit=useRef<SVGGElement>(null);
  const underlay=useRef<SVGGElement>(null);
  const faces=useRef<Array<SVGGElement|null>>([]),last=useRef<StaffPerformance>(RESTING_STAFF);
  const pivot=staffWorldPoint(asset,[.52,.85]),gripPivot=staffWorldPoint(asset,acting?.gripPivot??[.76,.455]);
  const polygon=(points:Array<[number,number]>)=>points.map(point=>staffWorldPoint(asset,point).join(",")).join(" ");
  function seek(frame:StaffPerformance){
    last.current=frame;
    pose.current?.setAttribute("transform",`rotate(${acting?frame.lean.toFixed(4):0} ${pivot.join(" ")})`);
    free.current?.setAttribute("transform",acting?freeArmTransform(asset,frame):"");
    free.current?.setAttribute("opacity",acting?String(1-ritualSmooth((frame.withdraw-.74)/.26)):"1");
    free.current?.setAttribute("data-withdraw",acting?frame.withdraw.toFixed(4):"0");
    grip.current?.setAttribute("transform",`rotate(${acting?frame.gripTurn.toFixed(4):0} ${gripPivot.join(" ")})`);
    grip.current?.setAttribute("data-grip-turn",acting?frame.gripTurn.toFixed(4):"0");
    underlay.current?.setAttribute("opacity",acting?frame.withdraw.toFixed(4):"0");
    [frame.focus,frame.active,frame.smile].forEach((weight,index)=>faces.current[index]?.setAttribute("opacity",weight.toFixed(4)));
    lit.current?.setAttribute("opacity",(frame.release*.17).toFixed(4));
    pose.current?.setAttribute("data-expression",frame.smile>.5?"smile":frame.focus>frame.active?"focus":frame.active>.2?"active":"normal");
  }
  useImperativeHandle(ref,()=>({seek}));
  useLayoutEffect(()=>{seek(running?last.current:{...RESTING_STAFF,focus:resting==="focus"?.7:0,smile:resting==="finish"?1:0});});
  const sprite=(part:"normal"|"closed",dx=0,dy=0)=>{
    const [col,row,ix,iy,iw,ih]=asset.parts[part];
    return <svg x={x+dx} y={y+dy} width={width} height={height} viewBox={`${col+ix} ${row+iy} ${iw} ${ih}`} preserveAspectRatio="none" overflow="hidden">
      <image href={asset.atlas} width={asset.grid[0]} height={asset.grid[1]} preserveAspectRatio="none" />
    </svg>;
  };
  const expression=(part:StaffExpression,register=true)=>{
    if(!acting)return null;const [col,row,ix,iy,iw,ih]=acting.parts[part];
    return <g transform={register?`matrix(${acting.registration[part].join(" ")})`:undefined}>
      <svg x={x} y={y} width={width} height={height} viewBox={`${col+ix} ${row+iy} ${iw} ${ih}`} preserveAspectRatio="none" overflow="hidden">
        <image href={acting.atlas} width={acting.grid[0]} height={acting.grid[1]} preserveAspectRatio="none" />
      </svg>
    </g>;
  };
  const definitions=<defs>
    <radialGradient id={`feather-${uid}`}><stop offset=".68" stopColor="white" /><stop offset="1" stopColor="white" stopOpacity="0" /></radialGradient>
    <radialGradient id={`lit-${uid}`}><stop stopColor={asset.palette[0]} stopOpacity=".7" /><stop offset="1" stopColor={asset.palette[1]} stopOpacity="0" /></radialGradient>
    <clipPath id={`front-table-${uid}`}><rect x={0} y={390} width={1000} height={300} /></clipPath>
    <clipPath id={`rest-hand-${uid}`}><polygon points={polygon(asset.foreground[0])} /></clipPath>
    <clipPath id={`shaft-foot-${uid}`}><polygon points={polygon(asset.foreground[1])} /></clipPath>
    <mask id={`silhouette-${uid}`} maskUnits="userSpaceOnUse" x={x} y={y} width={width} height={height} style={{maskType:"alpha"}}>{sprite("normal")}</mask>
    {acting?<>
      <clipPath id={`free-arm-${uid}`}><polygon points={polygon(acting.freeArm)} /></clipPath>
      <clipPath id={`grip-arm-${uid}`}>{acting.gripRegions.map((region,index)=><polygon key={index} points={polygon(region)} />)}</clipPath>
      <mask id={`body-${uid}`} maskUnits="userSpaceOnUse" x={x} y={y} width={width} height={height}><rect x={x} y={y} width={width} height={height} fill="white" />
        <polygon points={polygon(acting.freeArm)} fill="black" />{acting.gripRegions.map((region,index)=><polygon key={index} points={polygon(region)} fill="black" />)}
      </mask>
      <mask id={`face-${uid}`} maskUnits="userSpaceOnUse" x={x} y={y} width={width} height={height}>
        {asset.eyes.map((eye,side)=><ellipse key={side} cx={x+eye.open[0]*width} cy={y+eye.open[1]*height}
          rx={width*.043} ry={height*.034} fill={`url(#feather-${uid})`} />)}
        <ellipse cx={x+acting.face[0]*width} cy={y+acting.face[1]*height}
          rx={width*(acting.face[2]>.13?.078:.055)} ry={height*.064} fill={`url(#feather-${uid})`} />
      </mask>
    </>:null}
    {asset.eyes.map((eye,side)=>{const[cx,cy]=staffWorldPoint(asset,eye.open),rx=eye.radius[0]*width,ry=eye.radius[1]*height;
      return <mask key={side} id={`eye-${uid}-${side}`} maskUnits="userSpaceOnUse" x={cx-rx} y={cy-ry} width={rx*2} height={ry*2}>
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#feather-${uid})`} />
      </mask>;})}
  </defs>;
  if(foreground)return <g data-staff-foreground={id} pointerEvents="none">{definitions}<g clipPath={`url(#front-table-${uid})`}>
    <g ref={pose} data-staff-front-pose="true">
      <g ref={free} data-staff-free-arm="foreground" clipPath={`url(#rest-hand-${uid})`}>{sprite("normal")}</g>
      <g ref={grip} data-staff-grip-unit="foreground" clipPath={`url(#shaft-foot-${uid})`}>{sprite("normal")}</g>
    </g>
  </g></g>;
  return <g data-staff-portrait={id} data-pose={acting?"ritual-performance":"fixed-grip"} data-acting-material={acting?"loaded":"fallback"}>{definitions}
    <g ref={pose} data-staff-performance="true">
      {acting?<g ref={underlay} opacity={0} clipPath={`url(#free-arm-${uid})`}>{expression("active",false)}</g>:null}
      <g data-staff-body="true" mask={acting?`url(#body-${uid})`:undefined}>{sprite("normal")}</g>
      {acting?<>
        <g mask={`url(#silhouette-${uid})`}><polygon points={polygon(acting.gripRegions[0])} fill="#173326" opacity=".8" /></g>
        <g ref={free} data-staff-free-arm="background" clipPath={`url(#free-arm-${uid})`}>{sprite("normal")}</g>
        <g ref={grip} data-staff-grip-unit="background" clipPath={`url(#grip-arm-${uid})`}>{sprite("normal")}</g>
        <g mask={`url(#face-${uid})`}>{(["focus","active","smile"] as const).map((part,index)=><g key={part} ref={node=>{faces.current[index]=node;}} opacity={0} data-staff-expression={part}>{expression(part)}</g>)}</g>
      </>:null}
      {blink?<g data-staff-blink="true">{asset.eyes.map((eye,side)=><g key={side} mask={`url(#eye-${uid}-${side})`}>
        {sprite("closed",(eye.open[0]-eye.closed[0])*width,(eye.open[1]-eye.closed[1])*height)}
      </g>)}</g>:null}
      <g ref={lit} opacity={0} mask={`url(#silhouette-${uid})`} pointerEvents="none" data-staff-skin-light="true"><ellipse cx={x+width*.62} cy={y+height*.27} rx={width*.09} ry={height*.12} fill={`url(#lit-${uid})`} />
        <ellipse cx={x+width*.81} cy={y+height*.66} rx={width*.10} ry={height*.10} fill={`url(#lit-${uid})`} />
      </g>
    </g>
  </g>;
});
