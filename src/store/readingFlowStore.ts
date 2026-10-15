"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { tarotCards, tarotCardById } from "@/data/tarotCards";
import { createDeckOrientations, resolveDrawOrientation } from "@/lib/draw";
import { createReadingId } from "@/lib/ids";
import { migrateReadingFlow, restoreReadingFlow, type ReadingFlowSnapshot } from "@/lib/readingFlow";
import { normalizeSelectedSpread, sameSpreadSelection } from "@/lib/customSpreads";
import { applyPreparationOperation, choosePreparationAction, createMagicPreparationOperation, createPreparationOperation, emptyPreparation, validPreparationCount, type PreparationStage, type PreparationCountSource } from "@/lib/preparation";
import type { DrawDirection, DrawnCard, TarotCard, TarotSpread } from "@/types";

interface ReadingFlowState extends ReadingFlowSnapshot {
  setQuestionDraft: (question: string, contextInfo: string) => void;
  setQuestionInfo: (question: string, contextInfo: string) => void;
  setSelectedSpread: (spread: TarotSpread) => void;
  setShuffledDeck: (deck: TarotCard[], source?: "shuffle" | "cut") => void;
  startPreparationStage: (stage: PreparationStage, count: number, source?: PreparationCountSource) => boolean;
  commitPreparationOperation: (id: string) => boolean;
  setSelectedCards: (cards: DrawnCard[]) => void;
  addSelectedCard: (card: TarotCard, direction?: DrawDirection) => boolean;
  getReadingIdentity: () => { readingId: string; createdAt: string };
  resetFlow: () => void;
}

const initialState: ReadingFlowSnapshot = {
  question: "", contextInfo: "", selectedSpread: null, shuffledDeck: [], selectedCards: [],
  baseOrientationByCardId: {}, readingId: null, readingCreatedAt: null,
  shuffleCount: 0, cutCount: 0, preparation: emptyPreparation(),
};
const clearSelection = { selectedCards: [], readingId: null, readingCreatedAt: null };
const clearDeck = { shuffledDeck: [], baseOrientationByCardId: {}, shuffleCount: 0, cutCount: 0, preparation: emptyPreparation(), ...clearSelection };

export const useReadingFlowStore = create<ReadingFlowState>()(persist((set, get) => ({
  ...initialState,
  setQuestionDraft: (question, contextInfo) => set({ question, contextInfo, readingId: null, readingCreatedAt: null }),
  setQuestionInfo: (question, contextInfo) => set({ question, contextInfo, ...clearDeck }),
  setSelectedSpread: (input) => {
    const selectedSpread = normalizeSelectedSpread(input);
    set((state) => sameSpreadSelection(state.selectedSpread, selectedSpread)
      ? { selectedSpread } : { selectedSpread, ...clearDeck });
  },
  setShuffledDeck: (input, source = "shuffle") => set((state) => {
    if (input.length !== tarotCards.length || new Set(input.map((card) => card.id)).size !== tarotCards.length ||
      !input.every((card) => tarotCardById.has(card.id))) return state;
    const shuffledDeck = input.map((card) => tarotCardById.get(card.id)!);
    if (source === "cut" && !shuffledDeck.every((card) => state.baseOrientationByCardId[card.id])) return state;
    const shuffleCount = state.shuffleCount + (source === "shuffle" ? 1 : 0);
    const cutCount = source === "cut" ? state.cutCount + 1 : 0;
    return { shuffledDeck, ...clearSelection,
      baseOrientationByCardId: source === "cut" ? state.baseOrientationByCardId : createDeckOrientations(shuffledDeck),
      shuffleCount, cutCount, preparation: { ...emptyPreparation(), phase: "ready", shuffleTarget: shuffleCount, cutTarget: cutCount, legacyReady: true } };
  }),
  startPreparationStage: (stage, count, source = "manual") => {
    let started = false;
    set((state) => {
      if (!state.selectedSpread || !validPreparationCount(count) || (source !== "manual" && source !== "tarotReader") || state.preparation.phase !== `choose-${stage}`) return state;
      const deck = stage === "shuffle" ? [...tarotCards] : state.shuffledDeck;
      const action = choosePreparationAction(stage, state.preparation.lastAction);
      const pending = createMagicPreparationOperation(deck.map((card) => card.id), stage, action);
      started = true;
      return { ...clearSelection, shuffledDeck: deck,
        baseOrientationByCardId: stage === "shuffle" ? createDeckOrientations(deck) : state.baseOrientationByCardId,
        preparation: { ...state.preparation, phase: stage === "shuffle" ? "shuffling" : "cutting",
          [stage === "shuffle" ? "shuffleTarget" : "cutTarget"]: count, pending,
          countSource: { ...(state.preparation.countSource ?? { shuffle: null, cut: null }), [stage]: source } } };
    });
    return started;
  },
  commitPreparationOperation: (id) => {
    let committed = false;
    set((state) => {
      const { preparation } = state; const op = preparation.pending;
      if (!op || op.id !== id || preparation.lastCommittedId === id ||
        (preparation.phase !== "shuffling" && preparation.phase !== "cutting") ||
        op.beforeIds.some((cardId, index) => state.shuffledDeck[index]?.id !== cardId)) return state;
      const result = applyPreparationOperation(op, state.baseOrientationByCardId);
      const shuffleCount = state.shuffleCount + (op.stage === "shuffle" ? 1 : 0);
      const cutCount = state.cutCount + (op.stage === "cut" ? 1 : 0);
      const finished = (op.stage === "shuffle" ? shuffleCount === preparation.shuffleTarget : cutCount === preparation.cutTarget);
      const pending = finished ? null : (op.motionVersion === 3 || op.motionVersion === 4 || op.motionVersion === 5 ? createMagicPreparationOperation : createPreparationOperation)(result.ids, op.stage, choosePreparationAction(op.stage, op.action));
      committed = true;
      return { shuffledDeck: result.ids.map((cardId) => tarotCardById.get(cardId)!), baseOrientationByCardId: result.orientations,
        shuffleCount, cutCount, preparation: { ...preparation, pending, lastAction: op.action, lastCommittedId: id,
          [op.stage === "shuffle" ? "shuffleMethods" : "cutMethods"]: [...(preparation[op.stage === "shuffle" ? "shuffleMethods" : "cutMethods"] ?? []), op.action],
          phase: finished ? op.stage === "shuffle" ? "choose-cut" : "ready" : preparation.phase } };
    });
    return committed;
  },
  setSelectedCards: (selectedCards) => set({ selectedCards, readingId: null, readingCreatedAt: null }),
  addSelectedCard: (input, drawDirection = "up") => {
    let added = false;
    set((state) => {
      const spread = state.selectedSpread;
      const card = tarotCardById.get(input.id);
      if (!spread || !card || state.preparation.phase !== "ready" || !state.shuffledDeck.some((item) => item.id === card.id) ||
        state.selectedCards.some((item) => item.card.id === card.id) || state.selectedCards.length >= spread.count ||
        (drawDirection !== "up" && drawDirection !== "down")) return state;
      const baseOrientation = state.baseOrientationByCardId[card.id];
      if (!baseOrientation) return state;
      const orientation = resolveDrawOrientation(baseOrientation, drawDirection);
      added = true;
      return {
        selectedCards: [...state.selectedCards, { card, baseOrientation, drawDirection, orientation, position: spread.positions[state.selectedCards.length] }],
        readingId: null, readingCreatedAt: null,
      };
    });
    return added;
  },
  getReadingIdentity: () => {
    const state = get();
    if (state.readingId && state.readingCreatedAt) return { readingId: state.readingId, createdAt: state.readingCreatedAt };
    const readingId = createReadingId();
    const createdAt = new Date().toISOString();
    set({ readingId, readingCreatedAt: createdAt });
    return { readingId, createdAt };
  },
  resetFlow: () => set(initialState),
}), {
  name: "tarot_reading_flow_v1", version: 3, skipHydration: true,
  migrate: (persisted, version) => version === 1 ? migrateReadingFlow(persisted) ?? initialState : version === 2 ? restoreReadingFlow(persisted) ?? initialState : initialState,
  storage: createJSONStorage(() => ({
    getItem: (name) => { try { return sessionStorage.getItem(name); } catch { return null; } },
    setItem: (name, value) => { try { sessionStorage.setItem(name, value); } catch { /* Keep working in memory when browser storage is unavailable. */ } },
    removeItem: (name) => { try { sessionStorage.removeItem(name); } catch { /* Storage may be disabled. */ } },
  })),
  partialize: (state) => ({ question: state.question, contextInfo: state.contextInfo, selectedSpread: state.selectedSpread,
    shuffledDeck: state.shuffledDeck, selectedCards: state.selectedCards, baseOrientationByCardId: state.baseOrientationByCardId,
    readingId: state.readingId, readingCreatedAt: state.readingCreatedAt, shuffleCount: state.shuffleCount, cutCount: state.cutCount, preparation: state.preparation }),
  merge: (persisted, current) => ({ ...current, ...(restoreReadingFlow(persisted) ?? initialState) }),
}));
