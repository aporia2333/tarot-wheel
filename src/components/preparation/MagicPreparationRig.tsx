"use client";

import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from "react";
import { CrystalBall, type CrystalBallHandle } from "./CrystalBall";
import { CRYSTAL, sampleCrystalMagic } from "@/lib/crystalMagicMotion";
import { DealerArm, type DealerArmHandle } from "./DealerArm";
import { CardPacket, type CardPacketHandle } from "./CardPacket";
import type { PreparationOperation } from "@/lib/preparation";
import type { DealerManifest, DealerStaffAsset } from "@/data/dealerCharacters";
import { StaffMagic, type StaffMagicHandle } from "./StaffMagic";
import { staffEnergy } from "@/lib/staffMagicMotion";
import { sampleStaffPerformance, type StaffPerformance } from "@/lib/staffPerformance";
import { mapRitualHands } from "@/lib/dealerArmRig";
import { RITUAL_CONFIG, sampleRitualMotion, type RitualContext } from "@/lib/ritualMotion";
import { FloatingDeck, type FloatingDeckHandle } from "./FloatingDeck";

export interface MagicRigHandle { seek: (progress: number) => string }
type Props = { operation: PreparationOperation; character: DealerManifest; loaded: boolean; back: string; reduced: boolean; legacy?: boolean; staff?: DealerStaffAsset; hideHands?: boolean; context?: RitualContext; quality?: "full" | "compact" | "low"; orientations?: Record<string, string>; onStaffFrame?: (frame:StaffPerformance)=>void; onActorFrame?: (gaze: number[], lean: number, progress: number) => void };

/** Imperative transforms keep the character, atlas and React tree out of the animation frame loop. */
export const MagicPreparationRig = forwardRef<MagicRigHandle, Props>(function MagicPreparationRig({ operation, character, loaded, back, reduced, legacy = false, staff, hideHands = false, context, quality = "full", onActorFrame, onStaffFrame, orientations }, ref) {
  const root = useRef<SVGGElement>(null), pileRoot = useRef<SVGGElement>(null), shadow = useRef<SVGGElement>(null);
  const ball = useRef<CrystalBallHandle>(null), energy = useRef<SVGGElement>(null);
  const staffRig = useRef<StaffMagicHandle>(null);
  const packetRefs = useRef<Array<SVGGElement | null>>([]), planeRefs = useRef<Array<CardPacketHandle | null>>([]);
  const armRefs = useRef<Array<DealerArmHandle | null>>([]);
  const moteRefs = useRef<Array<SVGGElement | null>>([]), last = useRef(0), layered = useRef<boolean | null>(null);
  const deck = useRef<FloatingDeckHandle>(null), identity = useRef(operation.id);
  const v5 = operation.motionVersion === 5;
  const moteCount = reduced || quality === "low" ? RITUAL_CONFIG.effects.lowMotes : quality === "compact" ? RITUAL_CONFIG.effects.compactMotes : RITUAL_CONFIG.effects.desktopMotes;

  function seek(progress: number) {
    last.current = progress;
    const frame = sampleCrystalMagic(operation, reduced ? 1 : progress, context);
    if ("cards" in frame) {
      deck.current?.seek(frame);
      if (!reduced && !staff) onActorFrame?.(frame.gaze, frame.lean, progress);
    }
    for (const packet of frame.packets) {
      const node = packetRefs.current[packet.index];
      node?.setAttribute("transform", `translate(${packet.x} ${packet.displayY}) rotate(${packet.rotation})`);
      planeRefs.current[packet.index]?.project(packet.pitch, packet.below);
    }
    if (layered.current !== frame.layered && pileRoot.current) {
      const order = frame.layered ? operation.collection : operation.packets.map((_, index) => index);
      for (const index of [...order].reverse()) {
        const node = packetRefs.current[index]; if (node) pileRoot.current.append(node);
      }
      layered.current = frame.layered;
    }
    (v5 ? mapRitualHands(character, frame.hands) : frame.hands).forEach((hand, side) => armRefs.current[side]?.seek(hand.x, hand.y, hand.rotation, hand.turn, "grip" in hand && typeof hand.grip === "number" ? hand.grip : 0));
    shadow.current?.setAttribute("transform", `translate(${frame.shadowX} 523) scale(${frame.shadowScale} 1)`);
    shadow.current?.setAttribute("opacity", String(frame.shadowOpacity));
    const amount = reduced ? 0 : frame.energy;
    const performance=sampleStaffPerformance(operation,progress,context,reduced);
    if(staff)onStaffFrame?.(performance);
    staffRig.current?.seek(frame.energy, progress, frame.beat, reduced || quality === "low",performance);
    ball.current?.energize(amount, progress, staff ? staffEnergy(frame.energy, progress, frame.beat, reduced).split : 0,staff?performance.pulse:0,performance.arrival);
    energy.current?.setAttribute("opacity", String(amount * .65));
    moteRefs.current.forEach((node, index) => {
      const t = (progress * 1.4 + index / Math.max(1, moteCount)) % 1;
      // A quiet, curved stream between the glass and floating deck, without flashes.
      const x = CRYSTAL.x + 170 * t, y = CRYSTAL.y - 32 - 103 * Math.sin(t * Math.PI / 2);
      node?.setAttribute("transform", `translate(${x} ${y + Math.sin(index * 1.9) * 9})`);
      node?.setAttribute("opacity", String(amount * Math.sin(t * Math.PI) * .55));
    });
    root.current?.setAttribute("data-beat", frame.beat);
    if ("phase" in frame) root.current?.setAttribute("data-ritual-phase", frame.phase);
    return frame.beat;
  }
  useImperativeHandle(ref, () => ({ seek }));
  useLayoutEffect(() => { if (identity.current !== operation.id) { last.current = 0; identity.current = operation.id; } layered.current = null; seek(last.current); });
  const initial = sampleCrystalMagic(operation, reduced ? 1 : 0, context);
  const initialHands = v5 ? mapRitualHands(character, initial.hands) : initial.hands;
  return <g ref={root} className="crystal-ritual" data-magic-rig="true">
    <g ref={shadow} transform="translate(500 523)" opacity=".5"><ellipse rx={65} ry={16} fill="#061a12" /></g>
    <CrystalBall ref={ball} palette={staff?.palette} />
    <g ref={energy} opacity={0} pointerEvents="none">
      <path d="M377 449C403 408 457 389 533 382" fill="none" stroke="#c4d1af" strokeWidth={staff?1.15:.6} opacity={staff?.55:.24} />
      <path d="M353 446C390 386 475 369 541 381" fill="none" stroke="#d3b87d" strokeWidth={staff?1:.7} opacity={staff?.35:.18} />
    </g>
    {v5 ? <FloatingDeck ref={deck} frame={sampleRitualMotion(operation, reduced ? 1 : 0, context)} back={back} compact={quality !== "full"} orientations={orientations} /> : <g ref={pileRoot} className="floating-packets">
      {[...initial.packets].reverse().map(p => <g key={p.index} ref={node => { packetRefs.current[p.index] = node; }}
        data-packet={p.index} data-card-count={p.packet.ids.length} data-flip={String(p.packet.flip)}
        transform={`translate(${p.x} ${p.displayY}) rotate(${p.rotation})`}>
        <CardPacket ref={node => { planeRefs.current[p.index] = node; }} count={p.packet.ids.length} back={back} pitch={p.pitch} />
      </g>)}
    </g>}
    {!staff && !hideHands ? initialHands.map((hand, side) => <DealerArm key={side} ref={node => { armRefs.current[side] = node; }}
      character={character} side={side as 0 | 1} loaded={loaded} legacy={legacy} details={quality === "full" && !reduced} x={hand.x} y={hand.y} gesture={hand.rotation} turn={hand.turn} grip={"grip" in hand && typeof hand.grip === "number" ? hand.grip : 0} pose="open" />)
      : staff ? <StaffMagic ref={staffRig} asset={staff} /> : null}
    {Array.from({ length: moteCount }, (_, index) => <g ref={node => { moteRefs.current[index] = node; }} key={index} opacity={0} pointerEvents="none">
      <circle r={index % 3 === 0 ? 1.4 : .85} fill={index % 2 ? "#cbd6bc" : "#dac18a"} />
    </g>)}
  </g>;
});
