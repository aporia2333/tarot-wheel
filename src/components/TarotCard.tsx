"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { getCardImageSrc } from "@/data/tarotCards";
import type { Orientation, TarotCard as TarotCardType } from "@/types";

interface TarotCardProps {
  card?: TarotCardType;
  orientation?: Orientation;
  faceDown?: boolean;
  compact?: boolean;
  onClick?: () => void;
  label?: string;
}

export function TarotCard({
  card,
  orientation = "upright",
  faceDown = false,
  compact = false,
  onClick,
  label,
}: TarotCardProps) {
  const [failed, setFailed] = useState(false);
  const imageSrc = card ? getCardImageSrc(card) : "";

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      whileHover={onClick ? { y: -4 } : undefined}
      className={`relative overflow-hidden rounded-lg border border-white/15 bg-night text-left shadow-soft ${
        compact ? "h-40 w-24" : "h-72 w-44"
      } ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      {faceDown || !card || failed || !imageSrc ? (
        <div className="tarot-back flex h-full w-full flex-col items-center justify-center gap-3 p-4 text-center">
          <div className="h-16 w-16 rounded-full border border-ember/60" />
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-ember">Tarot</span>
          {label ? <span className="text-xs text-mist/80">{label}</span> : null}
        </div>
      ) : (
        <img
          src={imageSrc}
          alt={card.nameCn || card.nameEn}
          onError={() => setFailed(true)}
          className={`h-full w-full object-cover ${orientation === "reversed" ? "rotate-180" : ""}`}
        />
      )}
    </motion.button>
  );
}
