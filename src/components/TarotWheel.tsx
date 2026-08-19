"use client";

import { motion } from "framer-motion";
import type { TarotCard as TarotCardType } from "@/types";

interface TarotWheelProps {
  deck: TarotCardType[];
  selectedIds: string[];
  onSelect: (card: TarotCardType) => void;
  disabled: boolean;
}

export function TarotWheel({ deck, selectedIds, onSelect, disabled }: TarotWheelProps) {
  return (
    <div className="mx-auto aspect-square w-full max-w-[760px]">
      <div className="relative h-full w-full">
        {deck.map((card, index) => {
          const ring = index % 3;
          const itemIndex = Math.floor(index / 3);
          const itemsInRing = Math.ceil((deck.length - ring) / 3);
          const angle = (itemIndex / itemsInRing) * Math.PI * 2 - Math.PI / 2 + ring * 0.08;
          const radius = ring === 0 ? 23 : ring === 1 ? 34 : 45;
          const left = 50 + Math.cos(angle) * radius;
          const top = 50 + Math.sin(angle) * radius;
          const selected = selectedIds.includes(card.id);

          return (
            <motion.div
              key={card.id}
              className="absolute"
              style={{ left: `${left}%`, top: `${top}%` }}
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{
                opacity: 1,
                scale: selected ? 0.82 : 1,
                rotate: (angle * 180) / Math.PI + 90,
                x: "-50%",
                y: "-50%",
              }}
              transition={{ delay: Math.min(index * 0.004, 0.24), duration: 0.25 }}
            >
              <button
                type="button"
                aria-label={`选择第 ${index + 1} 张牌`}
                disabled={disabled || selected}
                onClick={() => onSelect(card)}
                className={`tarot-back relative h-10 w-6 rounded border shadow-soft transition sm:h-14 sm:w-9 ${
                  selected
                    ? "border-ember opacity-45"
                    : "border-white/20 hover:-translate-y-1 hover:border-ember"
                } ${disabled || selected ? "cursor-default" : "cursor-pointer"}`}
              >
                {selected ? (
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold text-ember sm:text-[10px]">
                    已选
                  </span>
                ) : null}
              </button>
            </motion.div>
          );
        })}
        <div className="absolute left-1/2 top-1/2 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-ember/50 bg-ink/80 p-4 text-center text-sm text-ember">
          78 张牌
          <br />
          全量抽取
        </div>
      </div>
    </div>
  );
}
