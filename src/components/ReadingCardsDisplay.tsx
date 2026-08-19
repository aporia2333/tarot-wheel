"use client";

import type { SelectedCard, TarotCard } from "@/types";

type LegacyTarotCard = Partial<TarotCard> & {
  src?: string;
  image?: string;
  imagePath?: string;
  imageSrc?: string;
};

type LegacySelectedCard = Partial<SelectedCard> & {
  card?: LegacyTarotCard;
  positionName?: string;
  positionLabel?: string;
};

interface ReadingCardsDisplayProps {
  selectedCards: LegacySelectedCard[];
}

function normalizeImagePath(path?: string): string {
  if (!path) return "";
  if (path.startsWith("/") || path.startsWith("http://") || path.startsWith("https://")) return path;
  return `/cards/${path}`;
}

function getDisplayImageSrc(card?: LegacyTarotCard): string {
  return normalizeImagePath(card?.imageUrl || card?.img || card?.imageSrc || card?.imagePath || card?.image || card?.src);
}

function getDisplayCardName(card?: LegacyTarotCard): string {
  return card?.nameCn || card?.name || card?.nameEn || "未知塔罗牌";
}

function getDisplayPosition(selectedCard: LegacySelectedCard, index: number): string {
  return selectedCard.position || selectedCard.positionName || selectedCard.positionLabel || `位置 ${index + 1}`;
}

function chunkCards(cards: LegacySelectedCard[]): LegacySelectedCard[][] {
  if (cards.length <= 4) return cards.length ? [cards] : [];

  const firstRowCount = Math.floor(cards.length / 2);
  return [cards.slice(0, firstRowCount), cards.slice(firstRowCount)];
}

export function ReadingCardsDisplay({ selectedCards }: ReadingCardsDisplayProps) {
  const rows = chunkCards(selectedCards ?? []);

  return (
    <section className="mx-auto mt-8 flex w-full max-w-4xl flex-col items-center gap-8">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="flex w-full justify-center gap-3 sm:gap-6 md:gap-8">
          {row.map((selectedCard, index) => {
            const card = selectedCard.card;
            const globalIndex = rows.slice(0, rowIndex).reduce((count, previousRow) => count + previousRow.length, 0) + index;
            const imageSrc = getDisplayImageSrc(card);
            const cardName = getDisplayCardName(card);
            const position = getDisplayPosition(selectedCard, globalIndex);
            const isReversed = selectedCard.orientation === "reversed";

            return (
              <article
                key={`${card?.id || cardName}-${globalIndex}`}
                className="flex w-[clamp(76px,26vw,168px)] shrink-0 flex-col items-center text-center"
              >
                <p className="mb-3 min-h-5 text-sm font-medium leading-5 text-mist/70">{position}</p>
                <div className="flex aspect-[5/8] w-full items-center justify-center rounded-lg border border-white/12 bg-night/70 p-2 shadow-soft">
                  {imageSrc ? (
                    <img
                      src={imageSrc}
                      alt={cardName}
                      className={`h-full w-full object-contain ${isReversed ? "rotate-180" : ""}`}
                    />
                  ) : (
                    <div className="h-full w-full rounded-md border border-dashed border-white/20 bg-white/[0.03]" />
                  )}
                </div>
                <h2 className="mt-3 min-h-6 text-base font-semibold leading-6 text-white">{cardName}</h2>
              </article>
            );
          })}
        </div>
      ))}
    </section>
  );
}
