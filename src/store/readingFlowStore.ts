"use client";

import { create } from "zustand";
import type { SelectedCard, TarotCard, TarotSpread } from "@/types";

interface ReadingFlowState {
  question: string;
  contextInfo: string;
  selectedSpread: TarotSpread | null;
  shuffledDeck: TarotCard[];
  selectedCards: SelectedCard[];
  setQuestionInfo: (question: string, contextInfo: string) => void;
  setSelectedSpread: (spread: TarotSpread) => void;
  setShuffledDeck: (deck: TarotCard[]) => void;
  setSelectedCards: (cards: SelectedCard[]) => void;
  addSelectedCard: (card: SelectedCard) => void;
  resetFlow: () => void;
}

const initialState = {
  question: "",
  contextInfo: "",
  selectedSpread: null,
  shuffledDeck: [],
  selectedCards: [],
};

export const useReadingFlowStore = create<ReadingFlowState>((set) => ({
  ...initialState,
  setQuestionInfo: (question, contextInfo) => set({ question, contextInfo }),
  setSelectedSpread: (selectedSpread) => set({ selectedSpread, selectedCards: [] }),
  setShuffledDeck: (shuffledDeck) => set({ shuffledDeck, selectedCards: [] }),
  setSelectedCards: (selectedCards) => set({ selectedCards }),
  addSelectedCard: (card) =>
    set((state) => {
      if (state.selectedCards.some((selected) => selected.card.id === card.card.id)) return state;
      if (state.selectedSpread && state.selectedCards.length >= state.selectedSpread.count) return state;
      return { selectedCards: [...state.selectedCards, card] };
    }),
  resetFlow: () => set(initialState),
}));
