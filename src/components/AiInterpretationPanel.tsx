"use client";

import { useState } from "react";
import type { AiInterpretation, TarotReading } from "@/types";

interface Props {
  reading: TarotReading;
  onUpdate: (reading: TarotReading) => void;
}

export function AiInterpretationPanel({ reading, onUpdate }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function generate() {
    if (loading || reading.aiStatus === "completed") return;
    setLoading(true);
    setMessage("");
    onUpdate({ ...reading, aiStatus: "pending" });
    try {
      const response = await fetch("/api/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readingId: reading.readingId }),
      });
      const data = await response.json() as { interpretation?: AiInterpretation; message?: string };
      if (!response.ok || !data.interpretation) throw new Error(data.message || "生成 AI 解读失败。");
      onUpdate({ ...reading, aiInterpretation: data.interpretation, aiStatus: "completed" });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "生成 AI 解读失败。";
      setMessage(errorMessage);
      onUpdate({ ...reading, aiStatus: "failed" });
    } finally {
      setLoading(false);
    }
  }

  const interpretation = reading.aiInterpretation;
  return <section className="glass mt-8 rounded-lg p-5">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-semibold text-white">AI 解读</h2><p className="mt-2 text-sm leading-6 text-mist/70">生成时会将本次问题、Context、牌阵和抽到的牌发送给 DeepSeek。访客模式请登录后使用此功能。</p></div><button type="button" className="btn-secondary" disabled={loading || reading.aiStatus === "completed"} onClick={() => void generate()}>{loading ? "正在解读…" : interpretation ? "已生成" : "生成 AI 解读"}</button></div>
    {interpretation ? <div className="mt-6 space-y-5"><div><h3 className="text-base font-semibold text-ember">逐张牌解读</h3><div className="mt-3 grid gap-3">{interpretation.cards.map((card) => <article key={`${card.position}-${card.cardName}`} className="rounded-lg bg-white/[0.06] p-4"><p className="font-medium text-white">{card.position} · {card.cardName} · {card.orientation === "upright" ? "正位" : "逆位"}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-mist/85">{card.interpretation}</p></article>)}</div></div><div className="rounded-lg border border-ember/20 bg-ember/10 p-4"><h3 className="font-semibold text-ember">综合总结</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-mist">{interpretation.summary}</p></div></div> : null}
    {message ? <p className="mt-4 rounded-lg bg-white/[0.08] p-3 text-sm text-mist">{message}</p> : null}
  </section>;
}
