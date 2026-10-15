"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, useMotionValue, useReducedMotion } from "framer-motion";
import { getCardBackSrc } from "@/data/tarotCards";
import { useCardSkin } from "@/components/CardSkinProvider";
import { DrawnCardsArea, type DrawnCardsHandle } from "@/components/DrawnCardsArea";
import type { DrawDirection, DrawnCard, TarotCard } from "@/types";

interface TarotTableProps {
  title?: string;
  placementStorageKey?: string;
  fanDepthScale?: number;
  deck: TarotCard[];
  selectedCards: DrawnCard[];
  positions: string[];
  onSelect: (card: TarotCard, direction: DrawDirection) => boolean;
  onBusyChange: (busy: boolean) => void;
  onRedraw: () => void;
  isConfirming: boolean;
  onReveal: () => void;
  saveError?: string;
  saveErrorAction?: ReactNode;
  disabled: boolean;
}

interface CardRect { x: number; y: number; width: number; height: number; angle: number }
interface Flight {
  id: number;
  index: number;
  phase: "drag" | "draw" | "return";
  direction: DrawDirection;
  from: CardRect;
  to: CardRect;
}
interface Gesture {
  pointerId: number;
  index: number;
  x: number;
  y: number;
  source: CardRect;
  dragging: boolean;
}

function measureCard(element: HTMLElement, angle = 0): CardRect {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + (rect.width - element.offsetWidth) / 2,
    y: rect.top + (rect.height - element.offsetHeight) / 2,
    width: element.offsetWidth, height: element.offsetHeight, angle };
}

function fanAngle(index: number, count: number) {
  return (index / Math.max(1, count - 1) * 2 - 1) * 25;
}

function fanGeometry(viewportWidth: number, count: number, depthScale: number) {
  const mobile = viewportWidth < 600;
  const width = mobile ? 74 : 70;
  const height = mobile ? 128 : 121;
  const angle = 25 * Math.PI / 180;
  const padding = height * Math.sin(angle) / 2 + 14;
  // Keep exposed card edges usable when a phone needs horizontal browsing.
  const ribbonWidth = Math.max(viewportWidth, (count - 1) * (mobile ? 44 : 14) + width + padding * 2);
  const halfSpan = (ribbonWidth - width - padding * 2) / 2;
  const radius = halfSpan / Math.sin(angle);
  return { width, height, ribbonWidth, radius,
    ribbonHeight: Math.ceil(28 + radius * (1 - Math.cos(angle)) * depthScale + height + width * Math.sin(angle) / 2 + 14) };
}

export function TarotTable({ title, placementStorageKey, fanDepthScale = 1, deck, selectedCards, positions, onSelect, onBusyChange, onRedraw, onReveal, saveError, saveErrorAction, isConfirming, disabled }: TarotTableProps) {
  const { skin } = useCardSkin();
  const reduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);
  const [fanWidth, setFanWidth] = useState(800);
  const cardsRef = useRef(new Map<string, HTMLButtonElement>());
  const placementRef = useRef<DrawnCardsHandle>(null);
  const rowsRef = useRef<Array<HTMLDivElement | null>>([]);
  const gestureRef = useRef<Gesture | null>(null);
  const busyRef = useRef(false);
  const suppressClickRef = useRef(false);
  const flightId = useRef(0);
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const midpoint = Math.ceil(deck.length / 2);
  const rows = [deck.slice(0, midpoint), deck.slice(midpoint)];
  const selectedIds = new Set(selectedCards.map((selected) => selected.card.id));
  const backStyle = { backgroundImage: `url("${getCardBackSrc(undefined, skin)}"), url("${getCardBackSrc()}")` };
  const boardKey = `${deck.map((card) => card.id).join(",")}:${JSON.stringify(positions)}`;
  const geometry = fanGeometry(fanWidth, rows[0].length, fanDepthScale);
  const handlePlacementBusy = useCallback((busy: boolean) => {
    busyRef.current = busy;
    setIsPlacing(busy);
    onBusyChange(busy);
  }, [onBusyChange]);

  function angleFor(index: number) {
    const rowIndex = index < midpoint ? 0 : 1;
    return fanAngle(index - (rowIndex ? midpoint : 0), rows[rowIndex].length);
  }

  function finishFlight() {
    busyRef.current = false;
    setFlight(null);
    setActiveIndex(null);
    onBusyChange(false);
  }

  useEffect(() => {
    const row = rowsRef.current[0];
    if (!row) return;
    const measure = () => { if (row.clientWidth > 0) setFanWidth(row.clientWidth); };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => onBusyChange(false), [onBusyChange]);

  function drawCard(index: number, direction: DrawDirection, from?: CardRect) {
    const card = deck[index];
    const source = card && cardsRef.current.get(card.id);
    const target = placementRef.current?.landingRect(selectedCards.length, direction);
    if (!card || !source || !target || disabled || busyRef.current || selectedIds.has(card.id)) return;
    busyRef.current = true;
    const accepted = onSelect(card, direction);
    if (!accepted) { busyRef.current = false; setFlight(null); return; }
    placementRef.current?.rememberCard(card.id, selectedCards.length);
    gestureRef.current = null;
    setActiveIndex(null);
    if (reduceMotion) { busyRef.current = false; setFlight(null); return; }
    onBusyChange(true);
    setFlight({ id: ++flightId.current, index, phase: "draw", direction,
      from: from ?? measureCard(source, angleFor(index)),
      to: target });
  }

  function beginGesture(event: PointerEvent<HTMLButtonElement>, index: number) {
    if (event.button !== 0 || !event.isPrimary || disabled || busyRef.current || selectedIds.has(deck[index].id)) return;
    suppressClickRef.current = false;
    setActiveIndex(index);
    gestureRef.current = { pointerId: event.pointerId, index, x: event.clientX, y: event.clientY,
      source: measureCard(event.currentTarget, angleFor(index)), dragging: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveGesture(event: PointerEvent<HTMLButtonElement>) {
    const gesture = gestureRef.current;
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    // Horizontal touch gestures remain native scrolling; vertical gestures draw.
    if (!gesture.dragging && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      gestureRef.current = null;
      suppressClickRef.current = true;
      setActiveIndex(null);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      return;
    }
    if (!gesture.dragging && Math.abs(dy) > 7 && Math.abs(dy) >= Math.abs(dx)) {
      gesture.dragging = true;
      dragX.set(gesture.source.x);
      dragY.set(gesture.source.y);
      setFlight({ id: ++flightId.current, index: gesture.index, phase: "drag", direction: dy < 0 ? "up" : "down",
        from: gesture.source, to: gesture.source });
    }
    if (gesture.dragging) {
      dragX.set(gesture.source.x + Math.max(-22, Math.min(22, dx)));
      dragY.set(gesture.source.y + dy);
    }
  }

  function endGesture(event: PointerEvent<HTMLButtonElement>, cancelled = false) {
    const gesture = gestureRef.current;
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    gestureRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (!gesture.dragging) { if (cancelled) setActiveIndex(null); return; }
    suppressClickRef.current = true;
    const dy = event.clientY - gesture.y;
    const from = { ...gesture.source, x: dragX.get(), y: dragY.get() };
    if (!cancelled && Math.abs(dy) >= 48) {
      drawCard(gesture.index, dy < 0 ? "up" : "down", from);
    } else if (reduceMotion) {
      setFlight(null);
      setActiveIndex(null);
    } else {
      busyRef.current = true;
      onBusyChange(true);
      setFlight({ id: ++flightId.current, index: gesture.index, phase: "return", direction: dy < 0 ? "up" : "down",
        from, to: gesture.source });
    }
  }

  function moveFocus(index: number, step: number) {
    for (let next = index + step; next >= 0 && next < deck.length; next += step) {
      if (!selectedIds.has(deck[next].id)) {
        cardsRef.current.get(deck[next].id)?.focus();
        cardsRef.current.get(deck[next].id)?.scrollIntoView({ block: "nearest", inline: "nearest" });
        setActiveIndex(next);
        return;
      }
    }
  }

  const heldIndex = activeIndex !== null && !selectedIds.has(deck[activeIndex]?.id) ? activeIndex : null;
  const flightAnimation = flight && flight.phase !== "drag" ? {
    x: [flight.from.x, flight.from.x, flight.to.x, flight.to.x],
    y: [flight.from.y, flight.from.y + (flight.phase === "draw" ? (flight.direction === "up" ? -88 : 88) : -24), flight.to.y - 12, flight.to.y],
    rotate: [flight.from.angle, flight.from.angle, flight.to.angle, flight.to.angle],
    width: [flight.from.width, flight.from.width, flight.to.width, flight.to.width],
    height: [flight.from.height, flight.from.height, flight.to.height, flight.to.height],
  } : undefined;

  return <div className="tarot-table" aria-label="双排抽牌牌桌" aria-busy={isPlacing || (flight?.phase !== "drag" && Boolean(flight))}>
    <div className="table-toolbar">
      {title ? <h1 className="table-title">{title}</h1>
        : <p className="draw-count" role="status" aria-live="polite">已抽 {selectedCards.length} / {positions.length} 张</p>}
      <div className="table-toolbar-actions">
        {title ? <p className="draw-count" role="status" aria-live="polite">已抽 {selectedCards.length} / {positions.length} 张</p> : null}
        {selectedCards.length === positions.length ? <button type="button" className="btn-primary" disabled={isConfirming || Boolean(flight) || isPlacing}
          onClick={onReveal}>{isConfirming ? "正在保存…" : "一起翻牌"}</button> : null}
        <button type="button" className="draw-redraw" disabled={!selectedCards.length || isConfirming || Boolean(flight) || isPlacing}
          onClick={() => { setActiveIndex(null); gestureRef.current = null; onRedraw(); }}>全部重抽</button>
      </div>
    </div>
    {saveError ? <div className="inline-message" role="alert"><p>{saveError}</p>{saveErrorAction}</div> : null}
    <div className="table-surface">
      <DrawnCardsArea ref={placementRef} boardKey={boardKey} storageKey={placementStorageKey} selectedCards={selectedCards} positions={positions} backStyle={backStyle}
        landingCardId={flight?.phase === "draw" ? deck[flight.index]?.id : undefined}
        disabled={isConfirming || Boolean(flight)} onBusyChange={handlePlacementBusy} />
      <div className="card-fans">
        {rows.map((row, rowIndex) => <section className="fan-row" key={rowIndex} aria-label={rowIndex ? "下排牌组" : "上排牌组"}>
          <div className="fan-viewport" ref={(element) => { rowsRef.current[rowIndex] = element; }}>
            <div className="fan-ribbon" style={{ width: geometry.ribbonWidth, height: geometry.ribbonHeight }}>
              {row.map((card, slot) => {
                const index = slot + (rowIndex ? midpoint : 0);
                const picked = selectedIds.has(card.id);
                const active = heldIndex === index;
                const inFlight = flight?.index === index;
                const angle = fanAngle(slot, row.length);
                const theta = angle * Math.PI / 180;
                return <div key={card.id} className={`fan-card ${picked ? "is-picked" : ""} ${active ? "is-active" : ""} ${inFlight ? "is-in-flight" : ""}`}
                  style={{ left: geometry.ribbonWidth / 2 + geometry.radius * Math.sin(theta) - geometry.width / 2,
                    top: 28 + geometry.radius * (1 - Math.cos(theta)) * fanDepthScale, rotate: `${angle}deg`, zIndex: active ? 90 : slot + 1 }}>
                  <motion.button type="button" ref={(element) => { if (element) cardsRef.current.set(card.id, element); else cardsRef.current.delete(card.id); }}
                    className="tarot-back table-card-back" style={{ ...backStyle, width: geometry.width, height: geometry.height }}
                    initial={reduceMotion ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.3, delay: reduceMotion ? 0 : rowIndex * 0.12 + slot * 0.008 }}
                    aria-label={`${picked ? "已抽出" : "选择"}第 ${index + 1} 张牌`} aria-pressed={active || picked}
                    disabled={disabled || picked || isPlacing || (Boolean(flight) && flight?.phase !== "drag")}
                    onPointerDown={(event) => beginGesture(event, index)} onPointerMove={moveGesture}
                    onPointerUp={(event) => endGesture(event)} onPointerCancel={(event) => endGesture(event, true)}
                    onLostPointerCapture={(event) => endGesture(event, true)}
                    onClick={(event) => {
                      if (suppressClickRef.current && event.detail !== 0) { suppressClickRef.current = false; return; }
                      suppressClickRef.current = false;
                      if (!disabled && !busyRef.current) setActiveIndex(index);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); moveFocus(index, event.key === "ArrowLeft" ? -1 : 1); }
                      else if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); drawCard(index, event.key === "ArrowUp" ? "up" : "down"); }
                      else if (event.key === "Escape") setActiveIndex(null);
                    }} />
                </div>;
              })}
            </div>
          </div>
        </section>)}
      </div>
    </div>
    {flight && createPortal(<motion.div key={flight.id} className="draw-flight table-card-back" aria-hidden="true" style={{ ...backStyle,
      ...(flight.phase === "drag" ? { x: dragX, y: dragY, width: flight.from.width, height: flight.from.height, rotate: flight.from.angle } : {}) }}
      initial={flight.phase === "drag" ? false : { x: flight.from.x, y: flight.from.y, width: flight.from.width, height: flight.from.height, rotate: flight.from.angle }}
      animate={flightAnimation} transition={{ duration: reduceMotion ? 0 : flight.phase === "return" ? 0.42 : 0.78, times: [0, 0.28, 0.84, 1], ease: [0.22, 0.61, 0.36, 1] }}
      onAnimationComplete={flight.phase === "drag" ? undefined : finishFlight} />, document.body)}
  </div>;
}
