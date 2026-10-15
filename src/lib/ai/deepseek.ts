import type { AiInterpretation, TarotReading } from "@/types";
import { isRecord } from "@/lib/readings/validation";
import { formatReading, parseInterpretation, TAROT_SYSTEM_PROMPT } from "@/lib/ai/tarotInterpretation";
import { FOLLOW_UP_SYSTEM_PROMPT, formatFollowUp, parseFollowUp } from "@/lib/ai/followUp";

async function requestDeepSeekJson(system: string, input: unknown, maxTokens: number): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("AI 解读尚未配置，请联系网站管理员。");
  let response: Response;
  try {
    response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(55_000),
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || "deepseek-v4-flash", temperature: 0.7,
        max_tokens: maxTokens,
        thinking: { type: "disabled" }, response_format: { type: "json_object" },
        messages: [{ role: "system", content: system }, { role: "user", content: JSON.stringify(input) }],
      }),
    });
  } catch {
    throw new Error("AI 服务暂时无法连接或请求超时，请稍后重试。");
  }
  if (!response.ok) throw new Error(`AI 服务请求失败（${response.status}），请稍后重试。`);
  let data: unknown;
  try { data = await response.json(); } catch { throw new Error("AI 服务返回格式无效，请稍后重试。"); }
  if (!isRecord(data) || !Array.isArray(data.choices) || !isRecord(data.choices[0])) throw new Error("DeepSeek 没有返回有效解读。");
  const choice = data.choices[0];
  if (choice.finish_reason && choice.finish_reason !== "stop") throw new Error("AI 解读尚未完整生成，请重试。");
  if (!isRecord(choice.message) || typeof choice.message.content !== "string") throw new Error("DeepSeek 没有返回有效解读。");
  return choice.message.content;
}

export async function generateDeepSeekInterpretation(reading: TarotReading): Promise<AiInterpretation> {
  const raw = await requestDeepSeekJson(TAROT_SYSTEM_PROMPT, formatReading(reading),
    Math.min(6000, Math.max(2400, reading.selectedCards.length * 350 + 1300)));
  const result = parseInterpretation(raw, reading);
  if (!result.overview) throw new Error("DeepSeek 返回的速览内容不完整，请重试。");
  return result;
}

export async function generateDeepSeekFollowUp(reading: TarotReading, question: string) {
  return parseFollowUp(await requestDeepSeekJson(FOLLOW_UP_SYSTEM_PROMPT, formatFollowUp(reading, question), 1800), reading);
}
