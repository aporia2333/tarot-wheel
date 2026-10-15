"use client";

import { forwardRef, useCallback, useId, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import type { DealerManifest, DealerPart } from "@/data/dealerCharacters";
import { dealerArmRig, dealerLimbAppearance, dealerRitualProfile, sampleDealerHandPose } from "@/lib/dealerArmRig";

import { LimbSprite } from "./LimbSprite";
import { FingerRig, type FingerRigHandle } from "./FingerRig";
import { ClothMesh, type ClothMeshHandle } from "./ClothMesh";

type Pose = "open" | "support" | "grip";
export interface DealerArmHandle { seek: (x: number, y: number, gesture: number, turn?: number, grip?: number) => void }
type Props = { character: DealerManifest; side: 0 | 1; loaded: boolean; x: number; y: number; gesture: number; pose: Pose; turn?: number; grip?: number; packet?: number | null; showHand?: boolean; legacy?: boolean; details?: boolean };
const transform = (x: number, y: number, angle: number) => `translate(${x.toFixed(3)} ${y.toFixed(3)}) rotate(${angle.toFixed(3)})`;

/** Sleeve crops exclude their old cuffs. A single integrated cuff/hand continues the forearm. */
export const DealerArm = forwardRef<DealerArmHandle, Props>(function DealerArm({ character, side, loaded, x, y, gesture, pose, turn, grip = 0, packet = null, showHand = true, legacy = false, details = true }, ref) {
  const uid = useId().replace(/:/g, "");
  const appearance = dealerLimbAppearance(character);
  const sleeveWidths = [appearance.upperWidth, appearance.forearmWidth];
  const handBox = { x: -appearance.handWidth / 2, y: -24 * appearance.handHeight / 74, width: appearance.handWidth, height: appearance.handHeight };
  const root = useRef<SVGGElement>(null), upper = useRef<SVGGElement>(null), lower = useRef<SVGGElement>(null), hand = useRef<SVGGElement>(null);
  const profile = useRef<SVGGElement>(null), poseRefs = useRef<Array<SVGGElement | null>>([]);
  const cloth = useRef<SVGGElement>(null);
  const fingers = useRef<SVGGElement>(null);
  const fingerRig = useRef<FingerRigHandle>(null), clothMeshes = useRef<Array<ClothMeshHandle | null>>([]);
  const sleeveMasks = useRef<Array<SVGRectElement | null>>([]);
  const sleeveBounds = useRef<Array<SVGMaskElement | null>>([]);
  const [fingerStatus, setFingerStatus] = useState({ atlas: "", ready: false });
  const fingerAtlas = character.fingerAtlas?.atlas ?? "";
  const onFingerAvailability = useCallback((ready: boolean) => { setFingerStatus({ atlas: fingerAtlas, ready }); }, [fingerAtlas]);
  const hasSkeleton = Boolean(character.rig && !legacy && (character.kind === "cat" || character.fingerAtlas));
  const skeletal = hasSkeleton && (character.kind === "cat" || fingerStatus.atlas === fingerAtlas && fingerStatus.ready);
  const clothDetailed = Boolean(character.rig && !legacy && details);
  const last = useRef({ x, y, gesture, turn, grip });
  const lastProps = useRef({ x, y, gesture, turn, grip, id: character.id });
  const seek = useCallback((nextX: number, nextY: number, nextGesture: number, nextTurn = last.current.turn, nextGrip = last.current.grip) => {
    last.current = { x: nextX, y: nextY, gesture: nextGesture, turn: nextTurn, grip: nextGrip };
    const rig = dealerArmRig(character, [nextX, nextY], side, nextGesture);
    [upper, lower].forEach((node, index) => {
      const segment = rig.segments[index];
      node.current?.setAttribute("transform", transform(...segment.origin, segment.angle));
    });
    hand.current?.setAttribute("transform", transform(nextX, nextY, rig.handAngle));
    // The cloth sags with gravity inside the forearm mask; the cuff keeps its exact wrist anchor.
    const sag = dealerRitualProfile(character).elbowDrop[side] * .18 * Math.sin(rig.segments[1].angle * Math.PI / 180);
    cloth.current?.setAttribute("transform", details ? "" : `skewX(${sag.toFixed(3)})`);
    rig.segments.forEach((segment, index) => {
      clothMeshes.current[index]?.seek(rig.segments[1].angle - rig.segments[0].angle, sag, segment.length);
      sleeveMasks.current[index]?.setAttribute("height", String(segment.length + 39));
      sleeveBounds.current[index]?.setAttribute("height", String(segment.length + 43));
    });
    root.current?.setAttribute("data-grip", `${nextX.toFixed(1)},${nextY.toFixed(1)}`);
    if (nextTurn !== undefined) {
      const frame = sampleDealerHandPose(nextTurn, nextGrip);
      root.current?.setAttribute("data-hand-turn", nextTurn.toFixed(4));
      root.current?.setAttribute("data-hand-pose", frame.pose);
      root.current?.setAttribute("data-finger-curl", nextGrip.toFixed(4));
      fingers.current?.setAttribute("transform", skeletal ? "" : `scale(1 ${frame.flex.toFixed(4)})`);
      fingerRig.current?.seek(nextGrip, frame.weights[2] + frame.weights[3]);
      // Keep the wrist/cuff anchor on the forearm. Only its local profile rolls, never detaches.
      profile.current?.setAttribute("transform", `rotate(${((side ? -1 : 1) * frame.roll).toFixed(3)}) scale(${frame.width.toFixed(4)} 1)`);
      frame.weights.forEach((opacity, index) => poseRefs.current[index]?.setAttribute("opacity", opacity.toFixed(4)));
    }
  }, [character, side, skeletal, details]);
  useImperativeHandle(ref, () => ({ seek }), [seek]);
  useLayoutEffect(() => {
    const previous = lastProps.current;
    const changed = previous.x !== x || previous.y !== y || previous.gesture !== gesture || previous.turn !== turn || previous.grip !== grip || previous.id !== character.id;
    lastProps.current = { x, y, gesture, turn, grip, id: character.id };
    const sample = changed ? { x, y, gesture, turn, grip } : last.current;
    seek(sample.x, sample.y, sample.gesture, sample.turn, sample.grip);
  }, [x, y, gesture, turn, grip, seek, character.id]);
  // Loading a skin/atlas must keep the imperatively sampled position.
  useLayoutEffect(() => { seek(last.current.x, last.current.y, last.current.gesture, last.current.turn, last.current.grip); }, [loaded, seek, details]);
  function croppedSprite(part: DealerPart, bx: number, by: number, width: number, height: number, portion = 1, sideProfile = false) {
    return <LimbSprite character={character} part={part} x={bx} y={by} width={width} height={height} portion={portion} legacy={legacy} sideProfile={sideProfile} />;
  }
  const initial = dealerArmRig(character, [x, y], side, gesture);
  const part: DealerPart = pose === "support" ? side ? "rightSupport" : "leftSupport"
    : pose === "grip" ? side ? "rightGrip" : "leftGrip" : side ? "rightHand" : "leftHand";
  const turning = turn === undefined ? null : sampleDealerHandPose(turn, grip);
  const turnParts: DealerPart[] = side ? ["rightHand", "rightGrip", "rightSupport", "rightGrip"] : ["leftHand", "leftGrip", "leftSupport", "leftGrip"];
  const splitCuff = Boolean(character.rig && !legacy);
  return <g ref={root} data-hand={side ? "right" : "left"} data-hand-pose={turning?.pose ?? pose} data-hand-turn={turn?.toFixed(4)} data-finger-curl={turn === undefined ? undefined : grip.toFixed(4)} data-contact-packet={packet ?? ""}
    data-grip={`${x.toFixed(1)},${y.toFixed(1)}`} data-arm-rig="joined" data-finger-asset-state={skeletal ? "loaded" : "fallback"}>
    <defs>
      <linearGradient id={`arm-blend-${uid}`} x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="white" stopOpacity="0" /><stop offset=".07" stopColor="white" /><stop offset=".93" stopColor="white" /><stop offset="1" stopColor="white" stopOpacity="0" />
      </linearGradient>
      <linearGradient id={`cuff-feather-${uid}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="7"><stop stopColor="white" /><stop offset="1" stopColor="black" /></linearGradient>
      <linearGradient id={`fingers-feather-${uid}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="7"><stop stopColor="black" /><stop offset="1" stopColor="white" /></linearGradient>
      <mask id={`cuff-${uid}`} maskUnits="userSpaceOnUse" x={handBox.x - 2} y={handBox.y - 2} width={handBox.width + 4} height={handBox.height + 4}>
        <rect {...handBox} fill={`url(#cuff-feather-${uid})`} />
      </mask>
      <mask id={`fingers-${uid}`} maskUnits="userSpaceOnUse" x={handBox.x - 2} y={handBox.y - 2} width={handBox.width + 4} height={handBox.height + 4}>
        <rect {...handBox} fill={`url(#fingers-feather-${uid})`} />
      </mask>
      {initial.segments.map((segment, index) => <mask key={index} ref={node => { sleeveBounds.current[index] = node; }} id={`sleeve-mask-${uid}-${index}`} maskUnits="userSpaceOnUse" x={-sleeveWidths[index] / 2 - 4} y={-20} width={sleeveWidths[index] + 8} height={segment.length + 43}>
        <rect ref={node => { sleeveMasks.current[index] = node; }} x={-sleeveWidths[index] / 2} y={-18} width={sleeveWidths[index]} height={segment.length + 39} rx={index ? 22 : 27} fill={`url(#arm-blend-${uid})`} />
      </mask>)}
    </defs>
    {[upper, lower].map((node, index) => <g key={index} ref={node} data-sleeve={index ? "forearm" : "upper"}
      data-bone-length={initial.segments[index].length} data-sleeve-width={sleeveWidths[index]}
      transform={transform(...initial.segments[index].origin, initial.segments[index].angle)} mask={`url(#sleeve-mask-${uid}-${index})`}>
      {loaded ? clothDetailed ? <ClothMesh ref={node => { clothMeshes.current[index] = node; }} character={character}
        part={index ? side ? "rightLower" : "leftLower" : side ? "rightUpper" : "leftUpper"} width={sleeveWidths[index]} length={initial.segments[index].length} portion={index ? appearance.forearmCrop : appearance.upperCrop} />
        : <g ref={index ? cloth : undefined}>{croppedSprite(index ? side ? "rightLower" : "leftLower" : side ? "rightUpper" : "leftUpper", -sleeveWidths[index] / 2, -18, sleeveWidths[index], initial.segments[index].length + 39, index ? appearance.forearmCrop : appearance.upperCrop)}</g>
        : <rect x={-sleeveWidths[index] * .38} y={-18} width={sleeveWidths[index] * .76} height={initial.segments[index].length + 39} rx={22} fill="#24483d" />}
    </g>)}
    {showHand ? <g ref={hand} data-cuff="integrated" transform={transform(x, y, initial.handAngle)}>
      {loaded ? turning ? <g ref={profile} data-wrist-turn="true"
        transform={`rotate(${(side ? -1 : 1) * turning.roll}) scale(${turning.width} 1)`}>
        {splitCuff ? <g data-stable-cuff="true" mask={`url(#cuff-${uid})`}>{croppedSprite(side ? "rightHand" : "leftHand", handBox.x, handBox.y, handBox.width, handBox.height)}</g> : null}
        <g ref={fingers} transform={`scale(1 ${turning.flex})`} mask={splitCuff ? `url(#fingers-${uid})` : undefined}>{turnParts.map((part, index) => <g key={index} ref={node => { poseRefs.current[index] = node; }}
          data-key-pose={["back", "side", "palm", "grip"][index]} opacity={turning.weights[index]}>
          {!skeletal || index < 2 ? croppedSprite(part, handBox.x, handBox.y, handBox.width, handBox.height, 1, index === 1) : null}
        </g>)}{hasSkeleton ? <FingerRig ref={fingerRig} character={character} side={side} box={handBox} curl={grip} opacity={turning.weights[2] + turning.weights[3]} ready={skeletal} onAvailability={onFingerAvailability} /> : null}</g>
      </g> : croppedSprite(part, handBox.x, handBox.y, handBox.width, handBox.height)
        : <ellipse cy={15 * appearance.handHeight / 74} rx={23 * appearance.handWidth / 76} ry={27 * appearance.handHeight / 74} fill={character.kind === "cat" ? "#b8a485" : "#dcc1a4"} />}
    </g> : null}
  </g>;
});
