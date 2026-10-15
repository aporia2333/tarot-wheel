"use client";
import { forwardRef, useId, useImperativeHandle, useRef } from "react";
import type { DealerManifest, DealerExpression } from "@/data/dealerCharacters";
import { dealerGazeOffset } from "@/lib/dealerArmRig";
import { actorAttention, actorEyeProfile, hairLocks, hairMotion } from "@/lib/actorDetailRig";

/** Connected face, neck and torso share a transform; blinking changes the eyes only. */
export interface DealerPortraitHandle { aim: (gaze: number[], lean: number, progress?: number) => void }
export const DealerPortrait = forwardRef<DealerPortraitHandle, { character: DealerManifest; expression: DealerExpression; blink: boolean }>(function DealerPortrait({ character, expression, blink }, ref) {
  const uid = useId().replace(/:/g, "");
  const portrait = character.portrait;
  const figure = useRef<SVGGElement>(null), eyeLayers = useRef<Array<SVGGElement | null>>([]), hairLayers = useRef<Array<SVGGElement | null>>([]);
  const attentionLayer = useRef<SVGGElement>(null);
  const locks = hairLocks(character);
  useImperativeHandle(ref, () => ({ aim(gaze, lean, progress = 1) {
    const offset = dealerGazeOffset(character, gaze);
    const attention = character.kind === "human" && expression === "focus" ? actorAttention(progress) : expression === "closed" ? 0 : 1;
    attentionLayer.current?.setAttribute("opacity", attention.toFixed(4));
    attentionLayer.current?.setAttribute("data-eye-attention", attention.toFixed(4));
    eyeLayers.current.forEach(eye => eye?.setAttribute("transform", `translate(${offset[0].toFixed(2)} ${offset[1].toFixed(2)})`));
    locks.forEach((lock, side) => {
      const bend = hairMotion(lean, gaze, progress, side);
      hairLayers.current[side]?.setAttribute("transform", `rotate(${bend.toFixed(4)} ${lock.pivot.join(" ")})`);
      hairLayers.current[side]?.setAttribute("data-strand-angle", bend.toFixed(4));
    });
    figure.current?.setAttribute("data-gaze", offset.map(value => value.toFixed(3)).join(","));
    figure.current?.setAttribute("transform", `rotate(${lean.toFixed(3)} ${character.anchors.body[0]} ${character.anchors.body[1] + 30})`);
  } }));
  if (!portrait) return null;
  const [x, y, width, height] = portrait.bounds;
  const [, , , radiusX, radiusY] = portrait.eyes;
  const eyeExpression = character.kind === "human" && expression === "focus" ? "normal" : expression;
  const eyes = actorEyeProfile(character, eyeExpression), closedEyes = actorEyeProfile(character, "closed");
  const eyesOpen = expression !== "closed" && !(character.kind === "human" && expression === "focus");
  function sprite(part: DealerExpression, offsetY = 0, offsetX = 0) {
    if (!portrait) return null;
    const [column, row, ix, iy, iw, ih] = portrait.parts[part];
    return <svg x={x + offsetX} y={y + offsetY} width={width} height={height} data-portrait-expression={part}
      viewBox={`${column + ix} ${row + iy} ${iw} ${ih}`} preserveAspectRatio="none" overflow="hidden">
      <image href={portrait.atlas} width={portrait.grid[0]} height={portrait.grid[1]} preserveAspectRatio="none" />
    </svg>;
  }
  return <g ref={figure} className="reader-upper-body" clipPath={portrait.torsoMask ? `url(#torso-${uid})` : undefined} data-connected-portrait={character.id}
    style={{ transformOrigin: `${character.anchors.body[0]}px ${character.anchors.body[1] + 30}px` }}>
    {portrait.torsoMask ? <defs><clipPath id={`torso-${uid}`}><path d={portrait.torsoMask} /></clipPath></defs> : null}
    <defs><mask id={`hair-base-${uid}`} maskUnits="userSpaceOnUse" x={x} y={y} width={width} height={height}>
      <rect x={x} y={y} width={width} height={height} fill="white" />{locks.map((lock, index) => <path key={index} d={lock.path} fill="black" />)}
    </mask>{locks.map((lock, index) => <clipPath id={`lock-${uid}-${index}`} key={index}><path d={lock.path} /></clipPath>)}</defs>
    {/* Dark rear hair/fur remains behind the extracted painted foreground locks. */}
    <g fill={character.kind === "cat" ? character.id === "quqi" ? "#a26b3b" : "#697779" : "#33251f"}>{locks.map((lock, index) => <path d={lock.path} key={index} />)}</g>
    <g data-painted-portrait="true" mask={`url(#hair-base-${uid})`}>{sprite(expression)}</g>
    <defs>
      <radialGradient id={`eyes-feather-${uid}`}><stop offset=".7" stopColor="white" /><stop offset="1" stopColor="white" stopOpacity="0" /></radialGradient>
      <mask id={`eyes-${uid}`} maskUnits="userSpaceOnUse" x={x} y={y} width={width} height={height}>
        {eyes.centers.map(([cx, cy], side) => <ellipse key={side} cx={cx} cy={cy} rx={radiusX} ry={radiusY} fill={`url(#eyes-feather-${uid})`} />)}
      </mask>
      <linearGradient id={`sclera-${uid}`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#635244" /><stop offset=".35" stopColor={eyes.sclera} /><stop offset="1" stopColor="#a38f78" /></linearGradient>
      {eyes.centers.map(([cx, cy], side) => <g key={side}>
        <mask id={`blink-eye-${uid}-${side}`} maskUnits="userSpaceOnUse" x={cx - radiusX} y={cy - radiusY} width={radiusX * 2} height={radiusY * 2}>
          <ellipse cx={cx} cy={cy} rx={radiusX} ry={radiusY} fill={`url(#eyes-feather-${uid})`} />
        </mask>
        <clipPath id={`eye-aperture-${uid}-${side}`}><ellipse cx={cx} cy={cy} rx={eyes.rx} ry={expression === "focus" ? eyes.ry * .62 : eyes.ry} /></clipPath>
        <clipPath id={`iris-texture-${uid}-${side}`}><ellipse cx={cx} cy={cy} rx={eyes.iris} ry={eyes.iris} /></clipPath>
      </g>)}
    </defs>
    <g ref={attentionLayer} opacity={eyesOpen ? 1 : 0} data-eye-attention={eyesOpen ? "1" : "0"}>
    {character.kind === "human" && expression === "focus" ? <g mask={`url(#eyes-${uid})`}>{sprite("normal")}</g> : null}
    <g data-gaze-layer="true" data-eye-expression={eyeExpression}>{eyes.centers.map(([cx, cy], side) => <g key={side} data-eye-socket={side} data-eye-center={`${cx},${cy}`} clipPath={`url(#eye-aperture-${uid}-${side})`}>
      <ellipse cx={cx} cy={cy} rx={eyes.rx} ry={eyes.ry} fill={`url(#sclera-${uid})`} />
      <g ref={node => { eyeLayers.current[side] = node; }} data-eyeball={side}>
        <g clipPath={`url(#iris-texture-${uid}-${side})`}>{sprite(eyeExpression)}</g>
      </g>
    </g>)}</g></g>
    {locks.map((lock, side) => <g key={side} ref={node => { hairLayers.current[side] = node; }} data-hair-strand={side} data-strand-angle="0"
      style={{ transformOrigin: `${lock.pivot[0]}px ${lock.pivot[1]}px` }}><g clipPath={`url(#lock-${uid}-${side})`}>{sprite(expression)}</g></g>)}
    {blink ? <g data-portrait-blink="true">{eyes.centers.map(([cx, cy], side) => <g key={side} mask={`url(#blink-eye-${uid}-${side})`}>
      {sprite("closed", cy - closedEyes.centers[side][1], cx - closedEyes.centers[side][0])}
    </g>)}</g> : null}
  </g>;
});
