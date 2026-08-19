export type Orientation = "upright" | "reversed";

export interface TarotCard {
  id: string;
  name?: string;
  nameEn: string;
  nameCn: string;
  arcana: string;
  suit: string | null;
  number: string | number | null;
  img?: string;
  imageUrl?: string;
  backImageUrl?: string;
  uprightKeywords?: string[];
  reversedKeywords?: string[];
  uprightKeywordsCn?: string[];
  reversedKeywordsCn?: string[];
  meanings?: Record<string, string>;
  meaningsCn?: Record<string, string>;
}

export interface SelectedCard {
  card: TarotCard;
  orientation: Orientation;
  position: string;
}

export interface TarotSpread {
  id: string;
  name: string;
  count: number;
  description: string;
  suitableFor: string;
  positions: string[];
}

export interface TarotReading {
  readingId: string;
  question: string;
  contextInfo: string;
  spread: TarotSpread;
  selectedCards: SelectedCard[];
  createdAt: string;
  aiInterpretation?: string;
  aiStatus?: "not_started" | "pending" | "completed" | "failed";
}
