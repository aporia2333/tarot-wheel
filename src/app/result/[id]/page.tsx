"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AiInterpretationPanel } from "@/components/AiInterpretationPanel";
import { ReadingCardsDisplay } from "@/components/ReadingCardsDisplay";
import { RequireCloudAuth } from "@/components/RequireCloudAuth";
import { getReadingById } from "@/lib/readings/client";
import { useReadingFlowStore } from "@/store/readingFlowStore";
import type { TarotReading } from "@/types";

export default function ResultPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const resetFlow = useReadingFlowStore((state) => state.resetFlow);
  const [reading, setReading] = useState<TarotReading | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void getReadingById(params.id).then(setReading).catch(() => setReading(null)).finally(() => setLoading(false));
  }, [params.id]);

  const content = loading ? <main className="page-shell"><div className="content-wrap text-center text-mist/70">正在读取结果…</div></main> : !reading ? (
    <main className="page-shell"><div className="content-wrap text-center"><p className="text-mist">没有找到这次抽牌记录。</p><Link href="/history" className="btn-primary mt-4">查看历史</Link></div></main>
  ) : <main className="page-shell"><div className="content-wrap">
    <section className="glass rounded-lg p-5"><div className="flex flex-col items-center gap-4 text-center md:flex-row md:items-start md:justify-between md:text-left"><div className="md:pt-1"><p className="text-sm text-ember">{reading.spread.name}</p><h1 className="mt-2 text-3xl font-semibold text-white">抽牌结果</h1><time className="mt-2 block text-sm text-mist/60">{new Date(reading.createdAt).toLocaleString("zh-CN")}</time></div><div className="flex flex-col gap-3 sm:flex-row"><Link href="/history" className="btn-secondary">查看历史</Link><button type="button" className="btn-primary" onClick={() => { resetFlow(); router.push("/question"); }}>重新抽牌</button></div></div></section>
    {(reading.question || reading.contextInfo) ? <section className="mx-auto mt-6 max-w-3xl text-center">{reading.question ? <><p className="text-sm text-mist/60">你的问题</p><p className="mt-2 text-lg leading-7 text-mist">{reading.question}</p></> : null}{reading.contextInfo ? <><p className="mt-5 text-sm text-mist/60">Context / 背景信息</p><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-mist/80">{reading.contextInfo}</p></> : null}</section> : null}
    <ReadingCardsDisplay selectedCards={reading.selectedCards} />
    <AiInterpretationPanel reading={reading} onUpdate={setReading} />
  </div></main>;

  return <RequireCloudAuth>{content}</RequireCloudAuth>;
}
