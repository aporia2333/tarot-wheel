"use client";

import { useRef, useState } from "react";
import { createReadingId } from "@/lib/ids";
import { isRecord } from "@/lib/readings/validation";
import { isAiFollowUp, MAX_FOLLOW_UPS, MAX_FOLLOW_UP_ATTEMPTS } from "@/lib/ai/followUp";
import { ReadingProse } from "@/components/ReadingProse";
import { getCardKnowledge } from "@/data/tarotCards";
import type { TarotReading } from "@/types";

export function AiFollowUpPanel({ reading, allowed, onUpdate }: { reading: TarotReading; allowed: boolean; onUpdate: (reading: TarotReading) => void }) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const busy = useRef(false);
  const requestRef = useRef<{ requestId: string; question: string } | null>(null);
  const followUps = Array.isArray(reading.aiFollowUps) ? reading.aiFollowUps.filter(isAiFollowUp) : [];
  const remaining = MAX_FOLLOW_UPS - followUps.length;
  const exhausted = remaining <= 0 || (reading.aiFollowUpAttempts || 0) >= MAX_FOLLOW_UP_ATTEMPTS;

  async function submit() {
    const text = question.trim();
    if (!allowed || exhausted || busy.current || !text) return;
    busy.current = true; setLoading(true); setMessage("");
    const existing = reading.aiFollowUpJob;
    const request = requestRef.current?.question === text ? requestRef.current :
      existing?.question === text ? { requestId: existing.requestId, question: text } : { requestId: createReadingId(), question: text };
    requestRef.current = request;
    try {
      const response = await fetch("/api/interpret/follow-up", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readingId: reading.readingId, ...request }) });
      let data: unknown;
      try { data = await response.json(); } catch { throw new Error("追问服务返回格式无效，请重试。"); }
      if (!response.ok || !isRecord(data) || !Array.isArray(data.followUps) || !data.followUps.every(isAiFollowUp) ||
          data.followUps.length > MAX_FOLLOW_UPS || !isAiFollowUp(data.followUp) || data.followUp.requestId !== request.requestId ||
          data.followUp.question !== request.question || new Set(data.followUps.map((item) => item.requestId)).size !== data.followUps.length ||
          !data.followUps.some((item) => item.requestId === request.requestId) ||
          typeof data.attempts !== "number" || !Number.isSafeInteger(data.attempts) || data.attempts < 0 || data.attempts > MAX_FOLLOW_UP_ATTEMPTS) {
        throw new Error(isRecord(data) && typeof data.message === "string" ? data.message : "追问暂时无法完成，请重试。");
      }
      const next = { ...reading, aiFollowUps: data.followUps, aiFollowUpAttempts: data.attempts };
      delete next.aiFollowUpJob;
      onUpdate(next); setQuestion(""); requestRef.current = null;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "追问暂时无法完成，请重试。");
    } finally { busy.current = false; setLoading(false); }
  }

  return <section className="follow-up-section" aria-labelledby="follow-up-title" aria-busy={loading || undefined}>
    <div className="follow-up-heading"><h3 id="follow-up-title">继续理解这次牌面</h3><span>{followUps.length} / {MAX_FOLLOW_UPS} 次追问</span></div>
    <p className="field-help">沿用原来的问题、牌位与正逆位。每次阅读最多 3 次追问，回答会保存到这条记录。</p>
    {followUps.length > 0 ? <div className="follow-up-conversation">{followUps.map((item) => <article key={item.requestId}>
      <h4>{item.question}</h4><ReadingProse text={item.answer} />
      <div className="follow-up-references">{item.cardIds.map((id) => { const index = reading.selectedCards.findIndex((selected) => {
        try { return getCardKnowledge(selected.card).id === id; } catch { return false; }
      });
        return index >= 0 ? <a className="text-link" key={id} href={`#reading-card-${index}`}>回看{reading.selectedCards[index].card.nameCn}</a> : null; })}</div>
    </article>)}</div> : null}
    {allowed && !exhausted ? <form className="follow-up-form" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <label htmlFor="follow-up-question">想进一步理解什么？</label>
      <div className="follow-up-suggestions">{["这几张牌之间有什么联系？", "这个行动建议可以怎样落实？"].map((text) => <button key={text} className="text-link" type="button" disabled={loading}
        onClick={() => { setQuestion(text); document.getElementById("follow-up-question")?.focus(); }}>{text}</button>)}</div>
      <textarea id="follow-up-question" className="field" value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={800} rows={3} disabled={loading}
        placeholder="例如：现在与未来趋势的牌位，怎样共同理解？" aria-describedby="follow-up-hint" />
      <div className="follow-up-actions"><p id="follow-up-hint" className="field-help">还可追问 {remaining} 次。内容会随本次阅读发送给 DeepSeek。</p>
        <button className="btn-secondary" disabled={loading || !question.trim()} type="submit">{loading ? "正在回答…" : "发送追问"}</button></div>
    </form> : <p className="field-help">{exhausted ? "本次追问已结束，可以回看保存的回答。" : "具有解读权限的正式账号可以继续追问。"}</p>}
    {loading ? <p role="status" className="field-help">正在结合原牌面回答，请稍候。</p> : null}
    {message ? <p className="inline-message" role="alert">{message} <button type="button" className="text-link" onClick={() => window.location.reload()}>重新读取记录</button></p> : null}
  </section>;
}
