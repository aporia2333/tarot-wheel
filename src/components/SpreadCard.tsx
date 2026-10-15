"use client";

import { CardCountSelector } from "@/components/CardCountSelector";
import { SpreadTooltip } from "@/components/SpreadTooltip";
import type { SpreadDefinition } from "@/data/spreads";
import { useCallback, useEffect, useRef, useState } from "react";

interface SpreadCardProps {
  spread: SpreadDefinition;
  selected: boolean;
  selectedCount: number;
  onSelect: (spread: SpreadDefinition, count: number) => void;
  customName?: string;
  compact?: boolean;
  facsimile?: boolean;
}

export function SpreadCard({
  spread,
  selected,
  selectedCount,
  onSelect,
  customName,
  compact = false,
  facsimile = false,
}: SpreadCardProps) {
  const tooltipId = `spread-tooltip-${spread.id}`;
  const anchor = useRef<HTMLElement>(null), closeTimer = useRef<ReturnType<typeof setTimeout>>();
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const dismiss = useCallback(() => { clearTimeout(closeTimer.current); setDescriptionOpen(false); }, []);
  const reveal = () => {
    if (anchor.current?.closest("fieldset")?.disabled) return;
    clearTimeout(closeTimer.current); setDescriptionOpen(true);
  };
  const leave = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      if (!anchor.current?.contains(document.activeElement)) setDescriptionOpen(false);
    }, 150);
  };
  useEffect(() => () => clearTimeout(closeTimer.current), []);

  // Printed copies carry no IDs or controls, so page-turn decoration never
  // duplicates focus targets or selectable business state.
  if (facsimile) return <div className={`book-entry-print ${selected ? "is-selected" : ""}`}>
    <span className="spread-title">{spread.name}</span>
    <div className="spread-count-selector">{spread.id === "custom" ? <span className="book-count-print">1–13 张</span>
      : spread.countOptions.map(option => <span key={option.value} className={`book-count-print ${selectedCount === option.value ? "is-active" : ""}`}>{option.label}</span>)}</div>
  </div>;

  return (
    <article
      ref={anchor} data-spread-id={spread.id}
      className={`spread-card ${selected ? "is-selected" : ""} ${compact ? "book-spread-entry" : ""}`}
      onPointerEnter={event => { if (event.pointerType === "mouse" && matchMedia("(hover: hover)").matches) reveal(); }}
      onPointerLeave={leave} onFocusCapture={reveal} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) leave(); }}
      onClickCapture={reveal}
    >
      <h2><button type="button" className="spread-choice" aria-pressed={selected} aria-describedby={`${tooltipId}-text`} onClick={() => onSelect(spread, selectedCount)}>
        <span className="spread-title">{spread.name}</span>
        {selected ? (
          <span className="spread-selected-mark" aria-hidden="true">
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="m5 10.2 3.1 3.1L15.5 6" />
            </svg>
          </span>
        ) : null}
      </button></h2>
      <p id={`${tooltipId}-text`} className="ritual-sr-only">{spread.description}</p>
      <SpreadTooltip id={tooltipId} title={spread.name} description={spread.description} anchor={anchor} open={descriptionOpen}
        onClose={dismiss} onEnter={reveal} onLeave={leave} />

      <div className="spread-card-controls">
        {spread.id === "custom" ? <>
          {!compact && customName ? <p className="field-help">{customName} · {selectedCount} 张牌</p> : null}
          <button type="button" className="btn-secondary book-custom-count" aria-label="设置牌数与牌位" onClick={() => onSelect(spread, selectedCount)}>{compact ? customName ? `${selectedCount} 张` : "1–13 张" : "设置牌数与牌位"}</button>
        </> : <>
        <div className="spread-count-label">
          <span>选择牌数</span>
          <span className="recommended-label">
            推荐 {spread.recommendedCount}
          </span>
        </div>
        <CardCountSelector
          options={spread.countOptions}
          selectedCount={selectedCount}
          recommendedCount={spread.recommendedCount}
          onSelect={(count) => onSelect(spread, count)}
        />
        </>}
      </div>

    </article>
  );
}
