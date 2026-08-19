"use client";

import type { SpreadCountOption } from "@/data/spreads";

interface CardCountSelectorProps {
  options: SpreadCountOption[];
  selectedCount: number;
  recommendedCount: number;
  onSelect: (count: number) => void;
}

export function CardCountSelector({
  options,
  selectedCount,
  recommendedCount,
  onSelect,
}: CardCountSelectorProps) {
  return (
    <div className="spread-count-selector" aria-label="选择抽牌数量">
      {options.map((option) => {
        const active = option.value === selectedCount;
        return (
          <button
            key={`${option.value}-${option.label}`}
            type="button"
            className={`spread-count-button ${active ? "is-active" : ""}`}
            aria-pressed={active}
            aria-label={`${option.label}${option.value === recommendedCount ? "，推荐" : ""}`}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(option.value);
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
