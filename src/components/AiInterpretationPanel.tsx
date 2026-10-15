"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { isAiInterpretation, isRecord } from "@/lib/readings/validation";
import type { AiAccess } from "@/lib/ai/access";
import type { AuthChangeEvent } from "@supabase/supabase-js";
import { AiFollowUpPanel } from "@/components/AiFollowUpPanel";
import { ReadingProse } from "@/components/ReadingProse";
import type { TarotReading } from "@/types";

const localAccess: AiAccess = { mode: "local", allowed: false, message: "本地体验可查看参考牌义，暂不提供 AI 解读与追问。" };

export function AiInterpretationPanel({ reading, onUpdate }: { reading: TarotReading; onUpdate: (reading: TarotReading) => void }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [access, setAccess] = useState<AiAccess | null>(isSupabaseConfigured ? null : localAccess);
  const [accessError, setAccessError] = useState("");
  const [accessRevision, setAccessRevision] = useState(0);
  const busyRef = useRef(false);
  const interpretation = isAiInterpretation(reading.aiInterpretation, reading.selectedCards.length) ? reading.aiInterpretation : undefined;

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const { data } = getSupabaseBrowserClient().auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (["SIGNED_IN", "SIGNED_OUT", "USER_UPDATED", "TOKEN_REFRESHED"].includes(event)) setAccessRevision((value) => value + 1);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const controller = new AbortController();
    setAccess(null); setAccessError("");
    void fetch("/api/interpret/access", { cache: "no-store", signal: controller.signal }).then(async (response) => {
      const data: unknown = await response.json();
      if (!response.ok || !isRecord(data) || typeof data.allowed !== "boolean" || typeof data.message !== "string" ||
          !["local", "guest", "member", "blocked", "unconfigured", "unauthenticated"].includes(String(data.mode))) {
        throw new Error("暂时无法检查解读权限，请重试。");
      }
      if (!controller.signal.aborted) setAccess(data as AiAccess);
    }).catch(() => { if (!controller.signal.aborted) setAccessError("暂时无法检查解读权限，请重试。"); });
    return () => controller.abort();
  }, [reading.readingId, accessRevision]);

  async function generate() {
    if (busyRef.current || !access?.allowed || interpretation) return;
    busyRef.current = true; setLoading(true); setMessage(""); onUpdate({ ...reading, aiStatus: "pending" });
    try {
      const response = await fetch("/api/interpret", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ readingId: reading.readingId }) });
      let data: unknown;
      try { data = await response.json(); } catch { throw new Error("解读服务返回格式无效，请稍后重试。"); }
      if (!isRecord(data) || !response.ok || !isAiInterpretation(data.interpretation, reading.selectedCards.length)) {
        if (response.status === 401 || response.status === 403) setAccessRevision((value) => value + 1);
        throw new Error(isRecord(data) && typeof data.message === "string" ? data.message : "生成 AI 解读失败，请重试。");
      }
      onUpdate({ ...reading, aiInterpretation: data.interpretation, aiStatus: "completed" });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "生成 AI 解读失败。");
      onUpdate({ ...reading, aiStatus: "failed" });
    } finally { busyRef.current = false; setLoading(false); }
  }

  return <section className="interpretation-section" aria-busy={loading || undefined}>
    <div className="interpretation-heading"><div><h2>AI 解读</h2>
      <p>{interpretation ? "本次解读已保存。可以先看速览，再回到每一个牌位。" : access?.message || accessError || "正在检查解读权限…"}</p>
    </div><div className="interpretation-actions">
      <button type="button" className="btn-secondary" disabled={!access?.allowed || loading || Boolean(interpretation)} onClick={() => void generate()}>
        {loading ? "正在解读…" : interpretation ? "已生成" : "生成 AI 解读"}
      </button>
      {!interpretation && (access?.mode === "guest" || access?.mode === "unauthenticated") ?
        <Link className="text-link" href={`/login?next=${encodeURIComponent(`/result/${reading.readingId}`)}`}>登录账号解读</Link> : null}
      {accessError ? <button type="button" className="text-link" onClick={() => setAccessRevision((value) => value + 1)}>重新检查权限</button> : null}
    </div></div>
    {loading ? <div className="interpretation-loading" role="status"><span className="loading-line" aria-hidden="true" /><p>正在结合你的问题与牌位阅读，请稍候。</p></div>
      : interpretation ? <>
        {interpretation.overview ? <div className="reading-overview"><h3>本次速览</h3><dl>
          <div><dt>核心主题</dt><dd>{interpretation.overview.theme}</dd></div>
          <div><dt>当前张力</dt><dd>{interpretation.overview.tension}</dd></div>
          <div><dt>可以尝试的一步</dt><dd>{interpretation.overview.nextStep}</dd></div>
        </dl></div> : null}
        <div className="synthesis"><h3>综合总结</h3><ReadingProse text={interpretation.summary} /></div>
        <div className="card-interpretations"><h3>逐张牌解读</h3>{interpretation.cards.map((card, index) => <article key={`${card.position}-${index}`} className="card-interpretation">
          <div className="interpretation-card-title"><p className="position">{card.position}</p><h4><a href={`#reading-card-${index}`} aria-label={`回看${card.cardName}牌面`}>{card.cardName}</a></h4><span className={`orientation-label ${card.orientation === "reversed" ? "is-reversed" : ""}`}>{card.orientation === "upright" ? "正位" : "逆位"}</span></div>
          <ReadingProse text={card.interpretation} />
        </article>)}</div>
        <AiFollowUpPanel key={reading.readingId} reading={reading} allowed={Boolean(access?.allowed)} onUpdate={onUpdate} />
      </> : <p className="interpretation-empty">先留意最吸引你的牌面，再结合参考牌义与牌位提示观察。有权限的账号可以进一步生成整体解读。</p>}
    {message ? <p className="inline-message" role="alert">{message}</p> : null}
  </section>;
}
