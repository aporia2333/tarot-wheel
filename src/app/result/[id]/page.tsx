"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AiInterpretationPanel } from "@/components/AiInterpretationPanel";
import { ReadingCardsDisplay } from "@/components/ReadingCardsDisplay";
import { RequireCloudAuth } from "@/components/RequireCloudAuth";
import { ReadingLayout } from "@/components/ReadingLayout";
import { PageNotice } from "@/components/PageNotice";
import { getReadingById } from "@/lib/readings/client";
import { useReadingFlowStore } from "@/store/readingFlowStore";
import { ReferenceMeanings } from "@/components/ReferenceMeanings";
import { isAiInterpretation } from "@/lib/readings/validation";
import { consumeReadingReveal } from "@/lib/readingReveal";
import type { TarotReading } from "@/types";

export default function ResultPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const resetFlow = useReadingFlowStore((state) => state.resetFlow);
  const [reading, setReading] = useState<TarotReading | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [revealCards, setRevealCards] = useState(false);
  useEffect(() => {
    let active = true; setLoading(true); setMessage("");
    void getReadingById(params.id).then((value) => { if (active) { setReading(value); setRevealCards(Boolean(value) && consumeReadingReveal(params.id)); } }).catch((error) => {
      if (active) { setReading(null); setMessage(error instanceof Error ? error.message : "结果读取失败，请稍后重试。"); }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [params.id]);
  const hasInterpretation = Boolean(reading && isAiInterpretation(reading.aiInterpretation, reading.selectedCards.length));
  const interpretation = reading ? <AiInterpretationPanel reading={reading} onUpdate={setReading} /> : null;
  const references = reading ? <ReferenceMeanings reading={reading} hasInterpretation={hasInterpretation} /> : null;
  const actions = reading ? <><Link href="/history" className="btn-secondary">查看历史</Link><button type="button" className="btn-primary" onClick={() => { resetFlow(); router.push("/question"); }}>重新抽牌</button></> : undefined;
  return <RequireCloudAuth><ReadingLayout title="抽牌结果" step={5} scene="result" actions={actions}
    description={reading ? <div className="result-meta"><span>{reading.spread.name}</span><time dateTime={reading.createdAt}>{new Date(reading.createdAt).toLocaleString("zh-CN")}</time></div> : undefined}>
    {loading ? <PageNotice title="正在读取结果…" loading /> : !reading ? <PageNotice title={message || "没有找到这次抽牌记录。"} error={Boolean(message)} description="可以回到历史记录查找，或开始一次新的阅读。" action={<Link href="/history" className="btn-secondary">查看历史</Link>} />
      : <div className={`result-room-layout ${reading.selectedCards.length > 3 ? "has-many-cards" : ""}`}>
        <div className="result-card-table"><ReadingCardsDisplay selectedCards={reading.selectedCards} reveal={revealCards} /></div>
        <div className="result-reading">
        {(reading.question || reading.contextInfo) ? <section className="result-question" aria-label="本次问题">
          {reading.question ? <><p className="question-label">你的问题</p><p className="question-text">{reading.question}</p></> : null}
          {reading.contextInfo ? <details><summary>Context / 背景信息</summary><p>{reading.contextInfo}</p></details> : null}
        </section> : null}
        {hasInterpretation ? <>{interpretation}{references}</> : <>{references}{interpretation}</>}
        </div>
      </div>}
  </ReadingLayout></RequireCloudAuth>;
}
