"use client";
import { forwardRef, useId, useImperativeHandle, useLayoutEffect, useRef } from "react";
import type { DealerManifest } from "@/data/dealerCharacters";
import { fingerDefinitions, fingerSkin, matrixText, polygonText } from "@/lib/actorDetailRig";
import { LimbSprite } from "./LimbSprite";
import { FingerTexture } from "./FingerTexture";

export interface FingerRigHandle { seek: (curl: number, opacity: number) => void }
export const FingerRig = forwardRef<FingerRigHandle, { character: DealerManifest; side: 0 | 1;
  box: { x: number; y: number; width: number; height: number }; curl: number; opacity: number; ready?: boolean; onAvailability?: (value: boolean) => void }>(function FingerRig({ character, side, box, curl, opacity, ready = true, onAvailability }, ref) {
  const uid = useId().replace(/:/g, ""), root = useRef<SVGGElement>(null), bones = useRef<Array<Array<SVGGElement | null>>>([]);
  const definitions = fingerDefinitions(character, side);
  const rest = definitions.map((finger, index) => fingerSkin(finger, box, 0, index, character.kind === "cat"));
  const part = side ? "rightSupport" : "leftSupport";
  const atlas = character.fingerAtlas, prefix = side ? "right" : "left";
  function seek(curl: number, opacity: number) {
    root.current?.setAttribute("opacity", (ready ? opacity : 0).toFixed(4));
    definitions.forEach((finger, index) => fingerSkin(finger, box, curl, index, character.kind === "cat").bones.forEach((bone, joint) => {
      const element = bones.current[index]?.[joint];
      element?.setAttribute("transform", matrixText(bone.matrix));
      element?.setAttribute("data-joint-angle", bone.angle.toFixed(3));
    }));
  }
  useImperativeHandle(ref, () => ({ seek }));
  useLayoutEffect(() => { seek(curl, opacity); });
  const texture = () => <LimbSprite character={character} part={part} {...box} />;
  return <g ref={root} opacity={ready ? opacity : 0} data-finger-rig={ready ? "skeletal" : "preloading"} data-digit-count={definitions.length}>
    {atlas ? <image href={atlas.atlas} width={1} height={1} opacity={0} onLoad={() => onAvailability?.(true)} onError={() => onAvailability?.(false)} /> : null}
    <defs>
      <mask id={`palm-${uid}`} maskUnits="userSpaceOnUse" {...box}><rect {...box} fill="white" />
        {rest.map((finger, index) => <polygon key={index} points={polygonText(finger.footprint)} fill="black" />)}
      </mask>
      {rest.flatMap((finger, index) => finger.bones.map((bone, joint) => <clipPath key={`${index}-${joint}`} id={`finger-${uid}-${index}-${joint}`}>
        <polygon points={polygonText(bone.clip)} />
      </clipPath>))}
    </defs>
    {!atlas ? <g mask={`url(#palm-${uid})`} data-palm-base="true">{texture()}</g> : null}
    {rest.map((finger, index) => <g key={index} data-digit={definitions[index].name}>
      {finger.bones.map((bone, joint) => <g key={joint} ref={node => { (bones.current[index] ??= [])[joint] = node; }}
        data-finger-bone={joint} data-joint-angle={0} transform={matrixText(bone.matrix)}>
        <g clipPath={`url(#finger-${uid}-${index}-${joint})`}>{atlas ? <g transform={`matrix(${(() => {
          const definition = definitions[index], dx = (definition.tip[0] - definition.root[0]) * box.width, dy = (definition.tip[1] - definition.root[1]) * box.height, length = Math.hypot(dx, dy);
          return [dy / length, -dx / length, dx / length, dy / length, finger.root[0], finger.root[1]].join(" ");
        })()})`}>
          <FingerTexture atlas={atlas} part={`${prefix}-${definitions[index].name}`} x={-definitions[index].width * box.width / 2} y={0}
            width={definitions[index].width * box.width} height={Math.hypot((definitions[index].tip[0] - definitions[index].root[0]) * box.width, (definitions[index].tip[1] - definitions[index].root[1]) * box.height)} />
        </g> : texture()}</g>
      </g>)}
    </g>)}
    {atlas ? <g data-palm-base="true"><FingerTexture atlas={atlas} part={`${prefix}-palm`} x={-box.width * .31} y={4} width={box.width * .62} height={box.height * .36} /></g> : null}
  </g>;
});
