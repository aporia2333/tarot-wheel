import { tarotCards } from "../src/data/tarotCards";
import { spreads, toTarotSpread } from "../src/data/spreads";
import type { AiInterpretation, TarotReading } from "../src/types";
import { normalizeCustomSpread } from "../src/lib/customSpreads";

export function readingFixture(count = 3, spreadId = "general"): TarotReading {
  const spread = toTarotSpread(spreads.find((item) => item.id === spreadId)!, count);
  return {
    readingId: "12345678-1234-4234-8234-123456789abc", question: "如何推进当前项目？", contextInfo: "正在准备下一阶段。",
    spread, selectedCards: tarotCards.slice(0, count).map((card, index) => ({ card,
      orientation: index % 2 ? "reversed" : "upright", position: spread.positions[index] })),
    createdAt: "2026-10-02T08:00:00.000Z", aiStatus: "not_started",
  };
}
export function aiFixture(reading = readingFixture()): AiInterpretation {
  return { cards: reading.selectedCards.map((card, index) => ({ position: card.position, cardName: card.card.nameCn,
    orientation: card.orientation, interpretation: `第 ${index + 1} 个牌位的独立情境分析。` })), summary: "结合牌阵变化，先厘清目标，再尝试可控的一步。" };
}
export function rawAiFixture(reading = readingFixture()) {
  return { overview: { theme: "本次牌面呈现的核心主题。", tension: "值得留意的变化与张力。", nextStep: "从可控的小行动开始观察。" },
    cards: reading.selectedCards.map((card, index) => ({ cardId: card.card.id, interpretation: `牌位 ${index + 1} 的独立解读。` })), summary: "牌阵共同主题与行动提醒。" };
}

export function customReadingFixture(count = 4): TarotReading {
  const positions = Array.from({ length: count }, (_, index) => ["我的期待", "现实限制", "可用资源", "下一步行动"][index] || `自定义位置 ${index + 1}`);
  const spread = normalizeCustomSpread({ id: "custom", name: "我的下一步", count, positions,
    positionMeanings: positions.map((position) => `围绕${position}观察当前项目，保留自己可以调整的空间。`) });
  return { ...readingFixture(), spread, selectedCards: tarotCards.slice(0, count).map((card, index) => ({ card,
    orientation: index % 2 ? "reversed" : "upright", position: positions[index] })) };
}
