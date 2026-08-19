"use client";

import { CardCountSelector } from "@/components/CardCountSelector";
import { SpreadTooltip } from "@/components/SpreadTooltip";
import type { SpreadDefinition } from "@/data/spreads";

interface SpreadCardProps {
  spread: SpreadDefinition;
  index: number;
  selected: boolean;
  selectedCount: number;
  onSelect: (spread: SpreadDefinition, count: number) => void;
}

export function SpreadCard({
  spread,
  index,
  selected,
  selectedCount,
  onSelect,
}: SpreadCardProps) {
  const tooltipId = `spread-tooltip-${spread.id}`;

  return (
    <article
      className={`spread-card group ${selected ? "is-selected" : ""}`}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-describedby={tooltipId}
      onClick={() => onSelect(spread, selectedCount)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(spread, selectedCount);
        }
      }}
    >
      <div className="spread-card-glow" aria-hidden="true" />
      <div className="spread-card-heading">
        <span className="spread-card-index" aria-hidden="true">
          {String(index).padStart(2, "0")}
        </span>
        {selected ? (
          <span className="spread-selected-mark" aria-label="已选中">
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="m5 10.2 3.1 3.1L15.5 6" />
            </svg>
          </span>
        ) : null}
      </div>

      <h2>{spread.name}</h2>

      <div className="spread-card-controls">
        <div className="spread-count-label">
          <span>选择牌数</span>
          <span className="recommended-label">
            <span aria-hidden="true">✦</span> 推荐 {spread.recommendedCount}
          </span>
        </div>
        <CardCountSelector
          options={spread.countOptions}
          selectedCount={selectedCount}
          recommendedCount={spread.recommendedCount}
          onSelect={(count) => onSelect(spread, count)}
        />
      </div>

      <SpreadTooltip id={tooltipId} description={spread.description} />
    </article>
  );
}
