export type Orientation = "upright" | "reversed";
export type DrawDirection = "up" | "down";
export type TarotElement = "Air" | "Water" | "Fire" | "Earth";

export interface TarotCard {
  id: string;
  name?: string;
  nameEn: string;
  nameCn: string;
  arcana: string;
  suit: string | null;
  number: string | number | null;
  cardNumber?: number;
  rank?: string;
  element?: TarotElement;
  zodiacSign?: string | null;
  astrologicalCorrespondence?: string | null;
  uprightMeaningCn?: string;
  reversedMeaningCn?: string;
  guideUrl?: string;
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
  // Older readings predate directional drawing.
  baseOrientation?: Orientation;
  drawDirection?: DrawDirection;
}

export interface DrawnCard extends SelectedCard {
  baseOrientation: Orientation;
  drawDirection: DrawDirection;
}

export interface TarotSpread {
  id: string;
  name: string;
  count: number;
  description: string;
  suitableFor: string;
  positions: string[];
  positionMeanings?: string[];
}

export interface AiCardInterpretation {
  position: string;
  cardName: string;
  orientation: Orientation;
  interpretation: string;
}

export interface AiInterpretation {
  cards: AiCardInterpretation[];
  summary: string;
  overview?: { theme: string; tension: string; nextStep: string };
}

export interface AiFollowUp {
  requestId: string;
  question: string;
  answer: string;
  cardIds: string[];
  createdAt: string;
}

export interface TarotReading {
  readingId: string;
  question: string;
  contextInfo: string;
  spread: TarotSpread;
  selectedCards: SelectedCard[];
  createdAt: string;
  aiInterpretation?: AiInterpretation;
  aiStatus?: "not_started" | "pending" | "completed" | "failed";
  aiFollowUps?: AiFollowUp[];
  aiFollowUpAttempts?: number;
  aiFollowUpJob?: { requestId: string; question: string; status: "pending" | "failed" };
}
