import type { DealerStaffAsset } from "@/data/dealerCharacters";
import type { PreparationOperation } from "./preparation";
import { RITUAL_CONFIG, ritualDuration, ritualSmooth, type RitualContext } from "./ritualMotion";
import { staffWorldPoint } from "./staffMagicMotion";

export interface StaffPerformance {
  withdraw: number; focus: number; active: number; smile: number;
  lean: number; gripTurn: number; release: number; flow: number; pulse: number; arrival: number;
}
export const RESTING_STAFF: StaffPerformance = { withdraw:0, focus:0, active:0, smile:0, lean:0, gripTurn:0, release:0, flow:0, pulse:0, arrival:0 };

/** Performance is sampled from the same paused/resumable operation clock as the cards. */
export function sampleStaffPerformance(operation: PreparationOperation, progress: number, context: RitualContext = {round:1,total:1}, reduced = false): StaffPerformance {
  const p=Math.max(0,Math.min(1,progress)), duration=ritualDuration(operation,context), time=p*duration;
  const first=operation.stage==="shuffle"&&context.round===1&&!context.holding;
  const body=operation.stage==="cut"?RITUAL_CONFIG.duration.cut:context.round>1&&context.round<context.total?RITUAL_CONFIG.duration.middleShuffle:RITUAL_CONFIG.duration.shuffle;
  const closing=operation.stage==="cut"&&context.round===context.total?ritualSmooth((time-body-RITUAL_CONFIG.duration.hold)/RITUAL_CONFIG.duration.settling):0;
  const intent=first?ritualSmooth((time-100)/1000):1;
  const open=first?ritualSmooth((time-960)/520):1;
  const returning=ritualSmooth(closing);
  const briefFocus=operation.stage==="cut"&&!context.holding ? .22*Math.sin(Math.PI*Math.min(1,time/420)) : 0;
  const focus=(intent*(1-open)+briefFocus)*(1-returning);
  const active=Math.max(0,intent*open-briefFocus)*(1-returning);
  const release=first?ritualSmooth((time-750)/500):1;
  const flow=(first?Math.max(0,(time-750)/(duration-750))*9:p*3)%1;
  // First release reaches the glass before the existing 1300ms levitation starts.
  const arrival=first?Math.max(0,Math.min(1,(time-1050)/650)):Math.max(0,Math.min(1,time/600));
  const impact=first?Math.sin(Math.PI*arrival):operation.stage==="cut"?Math.sin(Math.PI*arrival)*.65:0;
  return {withdraw:reduced?0:(first?ritualSmooth((time-80)/1180):1)*(1-returning),focus:reduced?0:focus,active:reduced?(1-returning)*.55:active,smile:returning,
    lean:reduced?0:intent*.55*(1-returning),gripTurn:reduced?0:-3*intent*(1-returning),release:release*(1-returning),flow:reduced?0:flow,pulse:reduced?0:impact*(1-returning),arrival:reduced?0:arrival};
}
export function rotateStaffPoint(point:[number,number], pivot:[number,number], degrees:number):[number,number] {
  const r=degrees*Math.PI/180, x=point[0]-pivot[0],y=point[1]-pivot[1];
  return [pivot[0]+x*Math.cos(r)-y*Math.sin(r),pivot[1]+x*Math.sin(r)+y*Math.cos(r)];
}
export function posedStaffTip(asset:DealerStaffAsset, frame:StaffPerformance):[number,number] {
  const point=staffWorldPoint(asset,asset.tip);
  if(!asset.acting)return point;
  const grip=rotateStaffPoint(point,staffWorldPoint(asset,asset.acting.gripPivot),frame.gripTurn);
  return rotateStaffPoint(grip,staffWorldPoint(asset,[.52,.85]),frame.lean);
}
export function freeArmTransform(asset:DealerStaffAsset, frame:StaffPerformance) {
  const pivot=staffWorldPoint(asset,asset.acting?.freePivot??[.23,.46]);
  return `translate(${pivot.join(" ")}) rotate(${(-23*frame.withdraw).toFixed(4)}) scale(1 ${(1-.035*frame.withdraw).toFixed(4)}) translate(${-pivot[0]} ${-pivot[1]})`;
}
