import type { AiInterpretation, TarotReading } from "@/types";
import { formatReading } from "@/lib/ai/tarotInterpretation";
import { isAiInterpretation } from "@/lib/readings/validation";

export class AiRequestConflict extends Error {}
export interface InterpretationRepository {
  // Atomic compare-and-set using the existing database updated_at column.
  save: (reading: TarotReading, expectedUpdatedAt: string) => Promise<string | null>;
}

export async function interpretReading(
  reading: TarotReading, updatedAt: string, repository: InterpretationRepository,
  generate: (reading: TarotReading) => Promise<AiInterpretation>, now = Date.now(),
) {
  if (reading.aiStatus === "completed" && isAiInterpretation(reading.aiInterpretation, reading.selectedCards.length)) {
    return { interpretation: reading.aiInterpretation, cached: true };
  }
  formatReading(reading);
  if (reading.aiStatus === "pending" && now - Date.parse(updatedAt) < 90_000) {
    throw new AiRequestConflict("这条记录正在生成解读，请稍后再试。");
  }
  const pending = { ...reading, aiStatus: "pending" as const };
  const pendingAt = await repository.save(pending, updatedAt);
  if (!pendingAt) throw new AiRequestConflict("记录状态已变化，请重新读取后再试。");
  try {
    const interpretation = await generate(pending);
    const completedAt = await repository.save({ ...pending, aiInterpretation: interpretation, aiStatus: "completed" }, pendingAt);
    if (!completedAt) throw new AiRequestConflict("记录已被其他请求更新，请重新读取结果。");
    return { interpretation, cached: false };
  } catch (error) {
    try { await repository.save({ ...reading, aiStatus: "failed" }, pendingAt); } catch { /* Preserve the original error; never overwrite a newer request. */ }
    throw error;
  }
}
