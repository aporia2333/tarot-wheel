"use client";

import { TarotCard } from "@/components/TarotCard";
import { getKeywords } from "@/data/tarotCards";
import type { SelectedCard } from "@/types";

export function ResultCard({ selectedCard, index }: { selectedCard: SelectedCard; index: number }) {
  const { card, orientation, position } = selectedCard;
  const meanings = card.meaningsCn ?? card.meanings ?? {};

  return (
    <article className="glass grid gap-5 rounded-lg p-4 md:grid-cols-[180px_1fr]">
      <div className="flex justify-center md:block">
        <TarotCard card={card} orientation={orientation} />
      </div>
      <div>
        <p className="text-sm text-ember">位置 {index + 1}：{position}</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">
          {card.nameCn} <span className="text-base font-normal text-mist/65">{card.nameEn}</span>
        </h2>
        <p className="mt-2 text-sm text-mist/80">{orientation === "upright" ? "正位" : "逆位"}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {getKeywords(card, orientation).map((keyword) => (
            <span key={keyword} className="rounded-full bg-ember/12 px-3 py-1 text-sm text-ember">
              {keyword}
            </span>
          ))}
        </div>
        {Object.keys(meanings).length ? (
          <div className="mt-5 grid gap-3 text-sm leading-6 text-mist/78">
            {Object.entries(meanings).map(([key, value]) => (
              <p key={key}>
                <span className="text-mist">{key}：</span>
                {value}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}
