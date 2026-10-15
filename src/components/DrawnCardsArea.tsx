"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import type { DrawDirection, DrawnCard } from "@/types";

interface Placement { x: number; y: number; layer: number }
export interface PlacedCardRect { x: number; y: number; width: number; height: number; angle: number }
export interface DrawnCardsHandle {
  landingRect: (index: number, direction: DrawDirection) => PlacedCardRect | null;
  rememberCard: (id: string, index: number) => void;
}
interface Props {
  boardKey: string;
  storageKey?: string;
  selectedCards: DrawnCard[];
  positions: string[];
  backStyle: CSSProperties;
  landingCardId?: string;
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
}
interface PlacementGesture { pointerId: number; id: string; index: number; clientX: number; clientY: number; x: number; y: number }

const STORAGE_KEY = "tarot_table_placement_v1";
const tilts = [-4, 3, -2, 4, -3, 2];

function readPlacements(boardKey: string, storageKey: string): Record<string, Placement> {
  try {
    const stored = JSON.parse(sessionStorage.getItem(storageKey) || "null");
    if (stored?.boardKey !== boardKey || !stored.cards || typeof stored.cards !== "object") return {};
    return Object.fromEntries(Object.entries(stored.cards).filter((entry): entry is [string, Placement] => {
      const point = entry[1] as Placement | null;
      return Boolean(point && Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.layer));
    }).map(([id, point]) => [id, { x: Math.max(0, Math.min(1, point.x)), y: Math.max(0, Math.min(1, point.y)),
      layer: Math.max(0, Math.min(10_000, point.layer)) }]));
  } catch { return {}; }
}

export const DrawnCardsArea = forwardRef<DrawnCardsHandle, Props>(function DrawnCardsArea({
  boardKey, storageKey = STORAGE_KEY, selectedCards, positions, backStyle, landingCardId, disabled, onBusyChange,
}, ref) {
  const areaRef = useRef<HTMLDivElement>(null);
  const slotsRef = useRef<Array<HTMLDivElement | null>>([]);
  const pointsRef = useRef<Record<string, Placement>>({});
  const gestureRef = useRef<PlacementGesture | null>(null);
  const previousBoard = useRef<string | null>(null);
  const previousCount = useRef(selectedCards.length);
  const topLayer = useRef(positions.length);
  const [width, setWidth] = useState(700);
  const [, refresh] = useState(0);
  const [heldId, setHeldId] = useState<string | null>(null);
  const cardWidth = width < 500 ? 64 : 82;
  const cardHeight = cardWidth * 1428 / 828;
  const columns = Math.max(1, Math.min(positions.length, 6, Math.floor((width - 24) / (cardWidth + 18))));
  const rows = Math.ceil(positions.length / columns);
  const rowStep = cardHeight * .8;
  const height = Math.max(width < 500 ? 210 : 240, Math.ceil(cardHeight + (rows - 1) * rowStep + 48));

  function clampPoint(index: number, x: number, y: number, layer: number): Placement {
    const angle = tilts[index % tilts.length] * Math.PI / 180;
    const marginX = (cardWidth * Math.abs(Math.cos(angle)) + cardHeight * Math.abs(Math.sin(angle))) / 2 + 8;
    const marginY = (cardHeight * Math.abs(Math.cos(angle)) + cardWidth * Math.abs(Math.sin(angle))) / 2 + 8;
    return { x: Math.max(marginX, Math.min(width - marginX, x * width)) / width,
      y: Math.max(marginY, Math.min(height - marginY, y * height)) / height, layer };
  }

  function pointFor(index: number, id?: string): Placement {
    const saved = id ? pointsRef.current[id] : undefined;
    if (saved) return clampPoint(index, saved.x, saved.y, saved.layer);
    const column = index % columns;
    const row = Math.floor(index / columns);
    const rowColumns = Math.min(columns, positions.length - row * columns);
    const x = width / 2 + (column - (rowColumns - 1) / 2) * (cardWidth + 22) + (row % 2 ? 5 : -3);
    const y = rows === 1 ? height / 2 + (index % 2 ? -6 : 6) : cardHeight / 2 + 24 + row * rowStep + (index % 2 ? -4 : 4);
    return clampPoint(index, x / width, y / height, index + 1);
  }

  function persist() {
    try { sessionStorage.setItem(storageKey, JSON.stringify({ boardKey, cards: pointsRef.current })); }
    catch { /* Placement remains usable when browser storage is unavailable. */ }
  }

  function update(id: string, point: Placement) {
    pointsRef.current = { ...pointsRef.current, [id]: point };
    refresh((value) => value + 1);
  }

  useEffect(() => {
    const placementIdentity = `${storageKey}:${boardKey}`;
    const changedBoard = previousBoard.current !== placementIdentity;
    if (changedBoard) pointsRef.current = readPlacements(boardKey, storageKey);
    const selectedIds = new Set(selectedCards.map((selected) => selected.card.id));
    pointsRef.current = Object.fromEntries(Object.entries(pointsRef.current).filter(([id]) => selectedIds.has(id)));
    topLayer.current = Math.max(positions.length, ...Object.values(pointsRef.current).map((point) => point.layer));
    if (previousCount.current > 0 && selectedCards.length === 0) persist();
    previousBoard.current = placementIdentity;
    previousCount.current = selectedCards.length;
    refresh((value) => value + 1);
    // Visual placement is independent of the reading state and its card order.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardKey, storageKey, selectedCards, positions.length]);

  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    const measure = () => { if (area.clientWidth > 0) setWidth(area.clientWidth); };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(area);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => onBusyChange(false), [onBusyChange]);

  useImperativeHandle(ref, () => ({
    landingRect(index, direction) {
      const slot = slotsRef.current[index];
      if (!slot) return null;
      const rect = slot.getBoundingClientRect();
      return { x: rect.left + (rect.width - slot.offsetWidth) / 2, y: rect.top + (rect.height - slot.offsetHeight) / 2,
        width: slot.offsetWidth, height: slot.offsetHeight, angle: tilts[index % tilts.length] + (direction === "down" ? 180 : 0) };
    },
    rememberCard(id, index) { update(id, pointFor(index, id)); persist(); },
  }));

  function begin(event: PointerEvent<HTMLButtonElement>, index: number, id: string) {
    if (disabled || event.button !== 0 || !event.isPrimary || gestureRef.current) return;
    const point = pointFor(index, id);
    update(id, { ...point, layer: ++topLayer.current });
    gestureRef.current = { pointerId: event.pointerId, id, index, clientX: event.clientX, clientY: event.clientY,
      x: point.x * width, y: point.y * height };
    event.currentTarget.setPointerCapture(event.pointerId);
    setHeldId(id);
    onBusyChange(true);
  }

  function move(event: PointerEvent<HTMLButtonElement>) {
    const gesture = gestureRef.current;
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    event.preventDefault();
    update(gesture.id, clampPoint(gesture.index, (gesture.x + event.clientX - gesture.clientX) / width,
      (gesture.y + event.clientY - gesture.clientY) / height, topLayer.current));
  }

  function finish(event: PointerEvent<HTMLButtonElement>) {
    const gesture = gestureRef.current;
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    gestureRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setHeldId(null);
    onBusyChange(false);
    persist();
  }

  function moveWithKey(event: KeyboardEvent<HTMLButtonElement>, index: number, id: string) {
    const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (!direction || disabled) return;
    event.preventDefault();
    const point = pointFor(index, id);
    const step = event.shiftKey ? 24 : 8;
    update(id, clampPoint(index, point.x + direction[0] * step / width, point.y + direction[1] * step / height, ++topLayer.current));
    persist();
  }

  return <div ref={areaRef} className="drawn-placement" role="group" aria-label="已抽牌自由摆放区域"
    style={{ height, "--placed-card-width": `${cardWidth}px`, "--placed-card-height": `${cardHeight}px` } as CSSProperties}>
    {positions.map((position, index) => {
      const selected = selectedCards[index];
      const point = pointFor(index, selected?.card.id);
      return <div key={index} ref={(element) => { slotsRef.current[index] = element; }}
        className={`placed-card-slot ${selected?.card.id === heldId ? "is-held" : ""} ${selected?.card.id === landingCardId ? "is-landing" : ""}`}
        aria-hidden={selected ? undefined : true}
        style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%`, zIndex: point.layer,
          transform: `translate(-50%, -50%) rotate(${tilts[index % tilts.length]}deg)` }}>
        {selected ? <button type="button" className={`placed-card table-card-back ${selected.drawDirection === "down" ? "is-turned" : ""}`}
          style={backStyle} aria-label={`第 ${index + 1} 张已抽牌，${position}，拖动或用方向键摆放`} disabled={disabled}
          onPointerDown={(event) => begin(event, index, selected.card.id)} onPointerMove={move}
          onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish}
          onFocus={() => update(selected.card.id, { ...pointFor(index, selected.card.id), layer: ++topLayer.current })}
          onKeyDown={(event) => moveWithKey(event, index, selected.card.id)} /> : null}
      </div>;
    })}
  </div>;
});
