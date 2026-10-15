import test from "node:test";
import assert from "node:assert/strict";
import { createMagicPreparationOperation } from "../src/lib/preparation";
import { sampleStaffPerformance, posedStaffTip, freeArmTransform } from "../src/lib/staffPerformance";
import { tarotCards } from "../src/data/tarotCards";
import { seededRandomInt } from "../src/lib/random";
import { sampleRitualMotion } from "../src/lib/ritualMotion";
import { dealerCharacters } from "../src/data/dealerCharacters";
import { readFileSync } from "node:fs";

const ids=tarotCards.map(card=>card.id);
test("performance establishes concentration and a crystal response before levitation, then relaxes once",()=>{
 const shuffle=createMagicPreparationOperation(ids,"shuffle","packets",seededRandomInt(13)),saved=JSON.stringify(shuffle);
 const rest=sampleStaffPerformance(shuffle,0),focus=sampleStaffPerformance(shuffle,.12),release=sampleStaffPerformance(shuffle,.21),active=sampleStaffPerformance(shuffle,.65);
 assert.equal(rest.withdraw,0);assert(focus.focus>focus.active);assert(release.pulse>.5);assert.equal(sampleRitualMotion(shuffle,.21).phase,"awakening");
 assert(active.active>.99&&active.withdraw>.99);assert.notEqual(active.flow,sampleStaffPerformance(shuffle,.7).flow);
 assert.equal(JSON.stringify(shuffle),saved);
 const cut=createMagicPreparationOperation(ids,"cut","triple",seededRandomInt(14));
 assert(sampleStaffPerformance(cut,.5).withdraw>.99);assert(sampleStaffPerformance(cut,.96).smile>.9);assert.equal(sampleStaffPerformance(cut,1).withdraw,0);
});
test("round boundaries keep the gesture and expressions, and reduced motion removes body and staff movement",()=>{
 const op=createMagicPreparationOperation(ids,"shuffle","packets",seededRandomInt(1));
 const end=sampleStaffPerformance(op,1),next=sampleStaffPerformance(op,0,{round:2,total:2}),hold=sampleStaffPerformance(op,0,{round:1,total:0,holding:true});
 for(const key of ["withdraw","focus","active","lean","gripTurn","release"] as const){assert.equal(end[key],next[key]);assert.equal(end[key],hold[key]);}
 const reduced=sampleStaffPerformance(op,.6,{round:1,total:1},true);
 for(const key of ["withdraw","lean","gripTurn","flow","pulse"] as const)assert.equal(reduced[key],0);
});
test("all sampled poses stay finite and move the emitter with the same joined arm transformation",()=>{
 for(const role of dealerCharacters){
  const acting=role.staff!.acting!;assert(acting,`${role.id} has performance art`);
  const png=readFileSync(`public${acting.atlas}`);assert.equal(png.readUInt32BE(16),2172);assert.equal(png.readUInt32BE(20),724);assert.equal(png[25],6,"RGBA source");
  for(const registration of Object.values(acting.registration))assert(registration.every(Number.isFinite));
 }
 const op=createMagicPreparationOperation(ids,"shuffle","packets",seededRandomInt(99));
 for(let step=0;step<=200;step++){
  const frame=sampleStaffPerformance(op,step/200);assert(Object.values(frame).every(Number.isFinite));
  assert(frame.withdraw>=0&&frame.withdraw<=1);assert(frame.gripTurn>=-3&&frame.gripTurn<=0);
  for(const role of dealerCharacters){const asset=role.staff!;assert(posedStaffTip(asset,frame).every(Number.isFinite));assert(!freeArmTransform(asset,frame).includes("NaN"));}
 }
 const asset=dealerCharacters[0].staff!;assert.notDeepEqual(posedStaffTip(asset,sampleStaffPerformance(op,0)),posedStaffTip(asset,sampleStaffPerformance(op,.6)));
});
