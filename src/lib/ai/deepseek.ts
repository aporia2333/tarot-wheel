import type { AiInterpretation, TarotReading } from "@/types";

interface DeepSeekResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string };
}

interface DeepSeekJsonResponse {
  cards?: Array<{ interpretation?: unknown }>;
  summary?: unknown;
}

function cardName(reading: TarotReading, index: number) {
  const card = reading.selectedCards[index].card;
  return card.nameCn || card.name || card.nameEn;
}

function asText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 2400) : fallback;
}

function formatReading(reading: TarotReading) {
  return {
    question: reading.question || "未填写问题",
    context: reading.contextInfo || "未填写 Context",
    spread: { name: reading.spread.name, positions: reading.spread.positions },
    cards: reading.selectedCards.map((selected) => ({
      position: selected.position,
      name: selected.card.nameCn || selected.card.name || selected.card.nameEn,
      orientation: selected.orientation === "upright" ? "正位" : "逆位",
      keywords: selected.orientation === "upright"
        ? selected.card.uprightKeywordsCn ?? selected.card.uprightKeywords ?? []
        : selected.card.reversedKeywordsCn ?? selected.card.reversedKeywords ?? [],
    })),
  };
}

export async function generateDeepSeekInterpretation(reading: TarotReading): Promise<AiInterpretation> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("AI 解读尚未配置，请联系网站管理员。");

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(55_000),
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL || "deepseek-v4-flash",
      temperature: 0.7,
      max_tokens: 2400,
      thinking: { type: "disabled" },
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "你是一位克制、温和、尊重自由意志的中文塔罗解读助手。不得作出绝对预言，不得替用户作医疗、法律、财务或人生重大决定。请只输出有效 JSON，不要 Markdown。JSON 格式必须为：{\"cards\":[{\"interpretation\":\"逐张牌结合牌位、正逆位、问题和 Context 的解读\"}],\"summary\":\"综合所有牌与 Context 的温和总结和可行动提醒\"}。cards 数组顺序必须与输入 cards 完全一致。",
        },
        { role: "user", content: `请基于以下资料生成 JSON 塔罗解读：\n${JSON.stringify(formatReading(reading))}` },
      ],
    }),
  });

  const data = await response.json() as DeepSeekResponse;
  if (!response.ok) throw new Error(data.error?.message || `DeepSeek 请求失败（${response.status}）。`);
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error("DeepSeek 没有返回有效解读。");

  let parsed: DeepSeekJsonResponse;
  try {
    parsed = JSON.parse(raw) as DeepSeekJsonResponse;
  } catch {
    throw new Error("DeepSeek 返回格式无效，请稍后重试。");
  }
  if (!Array.isArray(parsed.cards) || parsed.cards.length !== reading.selectedCards.length || typeof parsed.summary !== "string") {
    throw new Error("DeepSeek 返回的解读不完整，请稍后重试。");
  }

  return {
    cards: reading.selectedCards.map((selected, index) => ({
      position: selected.position,
      cardName: cardName(reading, index),
      orientation: selected.orientation,
      interpretation: asText(parsed.cards?.[index]?.interpretation, "这张牌的解读暂未生成。"),
    })),
    summary: asText(parsed.summary, "暂未生成总结。"),
  };
}
