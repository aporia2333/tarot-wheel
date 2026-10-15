"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import type { DealerManifest, DealerPart, DealerState, DealerExpression } from "@/data/dealerCharacters";
import { samplePose, type PreparationOperation } from "@/lib/preparation";
import { preparationDisplayY, preparationHands, preparationPlaybackMs } from "@/lib/preparationMotion";
import { isNaturalOverhand, sampleOverhand } from "@/lib/overhandMotion";
import { dealerArmRig, dealerLimbAppearance } from "@/lib/dealerArmRig";
import { getCardBackSrc } from "@/data/tarotCards";
import { useCardSkin } from "@/components/CardSkinProvider";
import { useDealerCharacter } from "@/components/DealerCharacterProvider";
import { CrystalBall } from "@/components/preparation/CrystalBall";
import { DealerArm } from "@/components/preparation/DealerArm";
import { LimbSprite } from "@/components/preparation/LimbSprite";
import { DealerPortrait, type DealerPortraitHandle } from "@/components/preparation/DealerPortrait";
import { StaffPortrait, type StaffPortraitHandle } from "@/components/preparation/StaffPortrait";
import { CardPacket } from "@/components/preparation/CardPacket";
import { MagicPreparationRig, type MagicRigHandle } from "@/components/preparation/MagicPreparationRig";
import { isCrystalMagic } from "@/lib/crystalMagicMotion";
import { ritualVariant } from "@/lib/ritualMotion";

export function PreparationScene({ character, state, operation, onComplete, round = 1, total = 1, deciding = false, onDealerClick, holding = false, deckIds = [], orientations, inspectionProgress }: {
  character: DealerManifest; state: DealerState; operation: PreparationOperation | null; onComplete: (id: string) => void;
  round?: number; total?: number; deciding?: boolean; onDealerClick?: () => void; holding?: boolean; deckIds?: string[]; orientations?: Record<string, string>; inspectionProgress?: number | null;
}) {
  const { skin } = useCardSkin();
  const { setBusy } = useDealerCharacter();
  useEffect(() => {
    setBusy(Boolean(operation) || deciding);
    return () => setBusy(false);
  }, [operation, deciding, setBusy]);
  const reduced = useReducedMotion();
  const held = useMemo<PreparationOperation | null>(() => holding && deckIds.length ? { id: "held-deck", stage: "shuffle", action: "packets", beforeIds: deckIds,
    packets: [{ ids: deckIds, flip: false, poses: [{ t: 0, x: 540, y: 320, rotation: 0 }, { t: 1, x: 540, y: 320, rotation: 0 }] }], collection: [0], durationMs: 0, motionVersion: 5 } : null, [holding, deckIds]);
  const shownOperation = operation ?? held;
  const magic = isCrystalMagic(shownOperation);
  const sceneRef = useRef<HTMLDivElement>(null);
  const magicRig = useRef<MagicRigHandle>(null);
  const portraitRig = useRef<DealerPortraitHandle>(null);
  const staffPortraitRig = useRef<StaffPortraitHandle>(null), staffForegroundRig = useRef<StaffPortraitHandle>(null);
  const [animationError, setAnimationError] = useState(false), [replay, setReplay] = useState(0);
  const [slow, setSlow] = useState(false);
  const uid = useId().replace(/:/g, "");
  const [playback, setPlayback] = useState({ id: operation?.id, progress: 0 });
  const progress = playback.id === operation?.id ? playback.progress : 0;
  const [loadedAtlas, setLoadedAtlas] = useState("");
  const [atlasFailed, setAtlasFailed] = useState(false);
  const [loadedPortrait, setLoadedPortrait] = useState("");
  const portraitAtlas = character.portrait?.atlas;
  const [failedPortrait, setFailedPortrait] = useState("");
  const [loadedStaff, setLoadedStaff] = useState(""), [failedStaff, setFailedStaff] = useState("");
  const staffAtlas = character.staff?.atlas;
  const actingAtlas = character.staff?.acting?.atlas;
  const [loadedActing, setLoadedActing] = useState("");
  const fallbackRequired = !staffAtlas || failedStaff === staffAtlas || Boolean(shownOperation && !magic);
  const [loadedRig, setLoadedRig] = useState("");
  const [failedRig, setFailedRig] = useState("");
  const rigAtlas = character.rig?.atlas;
  const [tableLoaded, setTableLoaded] = useState(false);
  const [blink, setBlink] = useState(false);
  const [mobile, setMobile] = useState(false);
  const completionRef = useRef(onComplete); completionRef.current = onComplete;
  useEffect(() => {
    let disposed = false; const image = new Image();
    image.onload = () => { if (!disposed) setTableLoaded(true); };
    image.onerror = () => { if (!disposed) setTableLoaded(false); };
    image.src = "/scenes/preparation/table-v1.png";
    return () => { disposed = true; };
  }, []);
  useEffect(() => {
    const query = matchMedia("(max-width: 767px)");
    const update = () => setMobile(query.matches); update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!fallbackRequired) return;
    let disposed = false; const image = new Image(); setAtlasFailed(false);
    image.onload = () => { if (!disposed) setLoadedAtlas(character.atlas); };
    image.onerror = () => { if (!disposed) setAtlasFailed(true); };
    image.src = character.atlas;
    return () => { disposed = true; };
  }, [character.atlas, fallbackRequired]);
  useEffect(() => {
    if (!portraitAtlas || !fallbackRequired) return;
    let disposed = false; const image = new Image();
    image.onload = () => { if (!disposed) setLoadedPortrait(portraitAtlas); };
    image.onerror = () => { if (!disposed) setFailedPortrait(portraitAtlas); };
    image.src = portraitAtlas;
    return () => { disposed = true; };
  }, [portraitAtlas, fallbackRequired]);
  useEffect(() => {
    if (!staffAtlas) return;
    let disposed = false; const image = new Image();
    image.onload = () => { if (!disposed) { setLoadedStaff(staffAtlas); setFailedStaff(""); } };
    image.onerror = () => { if (!disposed) setFailedStaff(staffAtlas); };
    image.src = staffAtlas;
    return () => { disposed = true; };
  }, [staffAtlas]);
  useEffect(() => {
    if (!actingAtlas) return;
    let disposed = false; const image = new Image();
    image.onload = () => { if (!disposed) setLoadedActing(actingAtlas); }; image.src = actingAtlas;
    return () => { disposed = true; };
  }, [actingAtlas]);
  useEffect(() => {
    if (!rigAtlas || !fallbackRequired) return;
    let disposed = false; const image = new Image();
    image.onload = () => { if (!disposed) { setLoadedRig(rigAtlas); setFailedRig(""); } };
    image.onerror = () => { if (!disposed) { setFailedRig(rigAtlas); setLoadedRig(""); } };
    image.src = rigAtlas;
    return () => { disposed = true; };
  }, [rigAtlas, fallbackRequired]);
  useEffect(() => {
    if (reduced) { setBlink(false); return; }
    let timer: ReturnType<typeof setTimeout>;
    let disposed = false;
    const schedule = () => { timer = setTimeout(() => {
      if (disposed) return;
      setBlink(true);
      timer = setTimeout(() => { setBlink(false); if (!disposed) schedule(); }, 140);
    }, 4400 + Math.random() * 2800); };
    schedule();
    return () => { disposed = true; clearTimeout(timer); };
  }, [character.id, reduced]);
  const duration = operation ? preparationPlaybackMs(operation, round, total, Boolean(reduced)) : 0;
  useEffect(() => {
    setPlayback({ id: operation?.id, progress: 0 });
    if (!operation) return;
    setAnimationError(false);
    if (inspectionProgress != null && process.env.NODE_ENV === "development") {
      const beat = magicRig.current?.seek(inspectionProgress);
      sceneRef.current?.setAttribute("data-progress", inspectionProgress.toFixed(3));
      sceneRef.current?.setAttribute("data-beat", beat ?? "");
      sceneRef.current?.setAttribute("data-ritual-phase", sceneRef.current.querySelector("[data-ritual-phase]")?.getAttribute("data-ritual-phase") ?? "");
      return;
    }
    let frame = 0; let stopped = false; let previous: number | null = null; let elapsed = 0; let slowFrames = 0; let frames = 0;
    const tick = (time: number) => {
      if (stopped || document.hidden) return;
      const delta = previous === null ? 0 : time - previous; previous = time; elapsed += delta;
      if (delta > 30) slowFrames++; frames++;
      if (frames === 90 && slowFrames > 30) setSlow(true);
      const next = Math.min(1, elapsed / duration);
      try { if (magic) {
        sceneRef.current?.setAttribute("data-progress", next.toFixed(3));
        const beat = magicRig.current?.seek(next) ?? "awakening";
        sceneRef.current?.setAttribute("data-beat", beat);
        sceneRef.current?.setAttribute("data-ritual-phase", sceneRef.current?.querySelector("[data-ritual-phase]")?.getAttribute("data-ritual-phase") ?? beat);
      } else setPlayback({ id: operation.id, progress: next });
      if (next < 1) frame = requestAnimationFrame(tick);
      else completionRef.current(operation.id);
      } catch { stopped = true; setAnimationError(true); }
    };
    const visibility = () => { cancelAnimationFrame(frame); previous = null; if (!document.hidden && !stopped) frame = requestAnimationFrame(tick); };
    document.addEventListener("visibilitychange", visibility);
    frame = requestAnimationFrame(tick);
    return () => { stopped = true; cancelAnimationFrame(frame); document.removeEventListener("visibilitychange", visibility); };
  }, [operation, duration, magic, replay, inspectionProgress]);

  const loaded = loadedAtlas === character.atlas && !atlasFailed;
  const rigLoaded = Boolean(rigAtlas && loadedRig === rigAtlas);
  const rigFailed = Boolean(rigAtlas && failedRig === rigAtlas);
  const legacyLimbs = !rigAtlas || rigFailed;
  const limbLoaded = legacyLimbs ? loaded : rigLoaded;
  const limbFailed = legacyLimbs ? atlasFailed : false;
  function sprite(part: DealerPart, x: number, y: number, width: number, height: number) {
    const region = character.parts[part];
    if (!region) return null;
    const [column, row, insetX, insetY, contentWidth, contentHeight] = region;
    return <svg x={x} y={y} width={width} height={height}
      viewBox={`${column + insetX} ${row + insetY} ${contentWidth} ${contentHeight}`}
      preserveAspectRatio="none" overflow="hidden">
      <image href={character.atlas} width={character.grid[0]} height={character.grid[1]} preserveAspectRatio="none" />
    </svg>;
  }
  // Representative cards retain collection order; invisible packets still drive hand contact.
  const natural = isNaturalOverhand(operation) ? sampleOverhand(operation, reduced ? 1 : progress) : null;
  const contacts = natural?.hands ?? preparationHands(operation, reduced ? 1 : progress);
  const movingIndices = contacts.map((hand) => hand.packet).filter((index): index is number => index !== null);
  const indices = operation ? [...new Set([...movingIndices, ...operation.packets.map((_, index) => index)
    .filter((index) => index % Math.max(1, Math.ceil(operation.packets.length / 10)) === 0)])].slice(0, 12) : [];
  const poses = natural ? natural.piles.map(pile => ({ ...pile, y: preparationDisplayY(pile.y) })) : operation ? indices.map((index) => {
    const pose = samplePose(operation.packets[index].poses, reduced ? 1 : progress);
    return { ...pose, y: preparationDisplayY(pose.y, operation.action), index, packet: operation.packets[index] };
  }) : [];
  const hands = contacts.map((hand, side) => natural ? { ...hand, y: hand.y + 70 } : !operation
    ? { ...hand, x: side ? character.anchors.rightRest[0] : character.anchors.leftRest[0], y: (side ? character.anchors.rightRest[1] : character.anchors.leftRest[1]) + 70 }
    : { ...hand, y: hand.packet !== null && hand.pose === "grip"
      ? preparationDisplayY(samplePose(operation.packets[hand.packet].poses, reduced ? 1 : progress).y, operation.action) - 34
      : operation.action === "table" && progress <= .45 && !reduced ? preparationDisplayY(hand.y + 6, "table") - 6 : hand.y + 70 });
  function handSprite(side: 0 | 1) {
    const hand = hands[side];
    const handPart: DealerPart = hand.pose === "support" ? side ? "rightSupport" : "leftSupport"
      : hand.pose === "grip" ? side ? "rightGrip" : "leftGrip" : side ? "rightHand" : "leftHand";
    const angle = dealerArmRig(character, [hand.x, hand.y], side, hand.rotation).handAngle;
    const appearance = dealerLimbAppearance(character);
    return <g transform={`translate(${hand.x.toFixed(3)} ${hand.y.toFixed(3)}) rotate(${angle.toFixed(3)})`}>
      {limbLoaded ? <LimbSprite character={character} part={handPart} legacy={legacyLimbs} x={-appearance.handWidth / 2} y={-24 * appearance.handHeight / 74} width={appearance.handWidth} height={appearance.handHeight} />
        : <ellipse cy={14 * appearance.handHeight / 74} rx={23 * appearance.handWidth / 76} ry={27 * appearance.handHeight / 74} fill={character.kind === "cat" ? "#b8a485" : "#dcc1a4"} />}
    </g>;
  }
  function arm(side: 0 | 1, drawHand = true) {
    const hand = hands[side];
    return <DealerArm key={side} character={character} side={side} loaded={limbLoaded} legacy={legacyLimbs}
      x={hand.x} y={hand.y} gesture={hand.rotation} pose={hand.pose} packet={hand.packet} showHand={drawHand} />;
  }
  const expression: DealerExpression = deciding ? "thinking" : character.states[state] ?? "normal";
  const portraitLoaded = Boolean(portraitAtlas && loadedPortrait === portraitAtlas);
  const staffLoaded = Boolean(character.staff && loadedStaff === staffAtlas && failedStaff !== staffAtlas);
  const staffActive = staffLoaded && (!shownOperation || magic);
  const effectiveStaff = character.staff && actingAtlas && loadedActing !== actingAtlas ? { ...character.staff, acting:undefined } : character.staff;
  const idle = !operation && !holding;
  const pulse = deciding || state === "finish" || (Boolean(operation) && progress > .90);
  const packets = poses.length ? poses : [{ x: character.anchors.deck[0], y: character.anchors.deck[1] + 70, rotation: 0, index: 0, packet: { ids: Array<string>(78), flip: false, poses: [] } }];
  return <div ref={sceneRef} className={`preparation-scene ${operation ? "scene-playing" : ""} ${magic ? "scene-magic" : ""} ${pulse ? "scene-settling" : ""}`}
    data-quality={reduced || slow ? "low" : mobile ? "compact" : "full"} data-ritual-phase={holding ? "awaitCutConfig" : operation ? "awakening" : state === "finish" ? "readyToDraw" : "awaitShuffleConfig"}
    data-variant={operation ? ritualVariant(operation.action) : ""}
    data-character={character.id} data-casting={staffActive ? "staff" : fallbackRequired ? "hands" : "loading"} data-staff-state={staffLoaded ? "loaded" : staffAtlas ? failedStaff === staffAtlas ? "fallback" : "loading" : "legacy"}
    data-portrait-state={staffActive || portraitLoaded ? "loaded" : portraitAtlas ? failedPortrait === portraitAtlas ? "fallback" : "loading" : "legacy"} data-dealer-state={state} data-action={operation?.action ?? "idle"}
    data-progress={progress.toFixed(3)} data-duration={duration} data-motion={magic ? "crystal-magic" : natural ? "supported-overhand" : "legacy"} data-beat={magic ? "attune" : natural?.beat ?? ""} data-transferred={natural?.taken ?? ""} data-asset-state={staffActive || limbLoaded ? "loaded" : limbFailed ? "error" : "loading"} data-rig-state={staffActive || rigLoaded ? "loaded" : rigFailed ? "fallback" : rigAtlas ? "loading" : "legacy"}>
    <div className="ritual-background" aria-hidden="true" />
    <div className="ritual-light ritual-light-warm" aria-hidden="true" />
    <div className="ritual-light ritual-light-cool" aria-hidden="true" />
    <div className="ritual-dust" aria-hidden="true">{[0,1,2,3,4,5].map((n) => <i key={n} style={{ left: `${9 + n * 13}%`, top: `${27 + n % 3 * 12}%`, animationDelay: `${n * -1.7}s` }} />)}</div>
    <svg className="ritual-stage" viewBox={mobile ? "150 0 720 650" : "0 0 1000 650"} role={onDealerClick ? "group" : "img"}
      aria-label={`${character.name}在牌桌后${state === "shuffle" ? "洗牌" : state === "cut" ? "切牌" : "准备牌组"}`}>
      <defs>
        <clipPath id={`body-${uid}`}><path transform={`translate(${character.anchors.body.join(" ")})`} d="M-45 -135Q0 -140 45 -135L50 -103Q55 -84 86 -71L105 135H-105L-86 -71Q-55 -84 -50 -103Z" /></clipPath>
        <radialGradient id={`shadow-${uid}`}><stop stopColor="#06140f" stopOpacity=".7" /><stop offset="1" stopColor="#06140f" stopOpacity="0" /></radialGradient>
        <radialGradient id={`magic-${uid}`}><stop stopColor="#efce8c" stopOpacity=".22" /><stop offset="1" stopColor="#efce8c" stopOpacity="0" /></radialGradient>
      </defs>
      <g className={`ritual-world ${idle ? "is-idle" : ""}`}>
        <g key={character.id} opacity={staffAtlas && !fallbackRequired && !staffActive ? 0 : 1} className={`reader-figure ${state === "finish" || deciding ? "reader-nods" : ""}`}>
          {staffActive && character.staff ? <StaffPortrait ref={staffPortraitRig} asset={character.staff} id={character.id} blink={blink}
            actingReady={Boolean(actingAtlas && loadedActing === actingAtlas)} running={Boolean(magic && shownOperation)} resting={state === "finish" ? "finish" : deciding ? "focus" : "idle"} /> : portraitLoaded ? <DealerPortrait ref={portraitRig} character={character} expression={expression} blink={blink} /> : <>
          {loaded ? <g clipPath={`url(#body-${uid})`}>{sprite("body", character.anchors.body[0] - 135, character.anchors.body[1] - 135, 270, 270)}</g> : <path d="M395 220 Q500 200 605 220 L620 425 L380 425Z" fill="#24483d" />}
          <g className="reader-head" style={{ transformOrigin: `${character.anchors.head[0]}px ${character.anchors.head[1] + 52}px` }}>
            {loaded ? sprite(blink ? "closed" : expression, character.anchors.head[0] - 107, character.anchors.head[1] - 113, 214, 226) : <g><ellipse cx={500} cy={145} rx={85} ry={96} fill={character.kind === "cat" ? "#b8a485" : "#dcc1a4"} /><path d="M470 185Q500 197 530 185" stroke="#574435" fill="none" /></g>}
          </g>
          </>}
        </g>
          {onDealerClick ? <g className="dealer-interaction" role="button" tabIndex={0} aria-label={`与${character.name}交谈`}
            onClick={onDealerClick} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onDealerClick(); } }}>
            <rect x={character.anchors.head[0] - 115} y={character.anchors.head[1] - 120} width={230} height={330} rx={65} fill="transparent" />
          </g> : null}

        <g className="ritual-table">
          {!tableLoaded ? <path d="M90 414Q500 390 910 414L990 633H10Z" fill="#183c31" /> : null}
          <image href="/scenes/preparation/table-v1.png" x={0} y={character.anchors.tableY} width={1000} height={270} preserveAspectRatio="none" onLoad={() => setTableLoaded(true)} onError={() => setTableLoaded(false)} />
        </g>
        {staffActive && character.staff ? <StaffPortrait ref={staffForegroundRig} asset={character.staff} id={character.id} foreground
          actingReady={Boolean(actingAtlas && loadedActing === actingAtlas)} running={Boolean(magic && shownOperation)} /> : null}
        {magic && shownOperation ? <MagicPreparationRig ref={magicRig} operation={shownOperation} character={character}
          staff={staffActive ? effectiveStaff : undefined}
          hideHands={!fallbackRequired}
          onStaffFrame={(frame) => { staffPortraitRig.current?.seek(frame); staffForegroundRig.current?.seek(frame); }}
          context={{ round, total, holding }} quality={reduced || slow ? "low" : mobile ? "compact" : "full"} orientations={orientations}
          onActorFrame={(gaze, lean, progress) => portraitRig.current?.aim(gaze, lean, progress)}
          loaded={limbLoaded} legacy={legacyLimbs} back={getCardBackSrc(undefined, skin)} reduced={Boolean(reduced)} /> : <>
        <CrystalBall />
        {!staffActive && fallbackRequired ? hands.map((hand, side) => <ellipse key={side} cx={hand.x} cy={hand.y + 23} rx={48} ry={18} fill={`url(#shadow-${uid})`} />) : null}
        {!staffActive && fallbackRequired ? hands.map((hand, side) => hand.behind ? arm(side as 0 | 1, !natural) : null) : null}
        {packets.slice().sort((a, b) => operation && !natural ? operation.collection.indexOf(b.index) - operation.collection.indexOf(a.index) : 0).map((p) => <g key={p.index} data-packet={p.index} data-card-count={p.packet.ids.length}
          transform={`translate(${p.x} ${p.y}) rotate(${p.rotation})`}>
          <ellipse cy={48} rx={46} ry={18} fill={`url(#shadow-${uid})`} />
          {idle ? <CardPacket count={p.packet.ids.length} back={getCardBackSrc(undefined, skin)} /> : <>
            {Array.from({ length: Math.min(3, Math.ceil(p.packet.ids.length / 5)) }, (_, layer) => <rect key={layer} x={-31 + layer * (natural ? .7 : 1.6)} y={-50 + layer * (natural ? 1 + p.packet.ids.length / 30 : 1.8)} width={62} height={102} rx={3} fill="#d1c5a0" stroke="#746948" />)}
            <image href={getCardBackSrc(undefined, skin)} x={-31} y={-50} width={62} height={102} preserveAspectRatio="none" />
          </>}
        </g>)}
        {!staffActive && fallbackRequired ? hands.map((hand, side) => !hand.behind ? arm(side as 0 | 1) : null) : null}
        {natural && !staffActive ? handSprite(0) : null}
        <g className="ritual-magic" opacity={pulse && !reduced ? 1 : 0} aria-hidden="true">
          <ellipse cx={500} cy={505} rx={95} ry={60} fill={`url(#magic-${uid})`} />
          {[0,1,2,3,4,5].map((n) => <circle className="gather-mote" key={n} cx={450 + n * 20} cy={478 + n % 2 * 45} r={1.3} fill="#edc987" style={{ animationDelay: `${n * 80}ms`, transformOrigin: "500px 500px" }} />)}
        </g>
        </>}
      </g>
    </svg>
    {limbFailed ? <p className="scene-fallback-note" role="status">角色素材暂未加载，继续用基础形象准备牌组。</p> : null}
    {animationError ? <div className="scene-recovery" role="alert"><p>动作播放中断，牌组仍保留在本轮开始时。</p>
      <button type="button" className="ritual-choice" onClick={() => setReplay(value => value + 1)}>重新播放当前动作</button></div> : null}
  </div>;
}
