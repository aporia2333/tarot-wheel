"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RequireCloudAuth } from "@/components/RequireCloudAuth";
import { getReadings } from "@/lib/readings/client";
import type { TarotReading } from "@/types";

export default function HistoryPage() {
  const [readings, setReadings] = useState<TarotReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void getReadings().then(setReadings).catch((error) => {
      setMessage(error instanceof Error ? error.message : "无法读取历史记录。");
    }).finally(() => setLoading(false));
  }, []);

  return <RequireCloudAuth><main className="page-shell"><div className="content-wrap">
    <div className="flex items-center justify-between gap-4"><h1 className="text-3xl font-semibold text-white">历史记录</h1><Link href="/" className="btn-secondary">首页</Link></div>
    {loading ? <section className="glass mt-6 rounded-lg p-8 text-center text-mist/72">正在读取历史记录…</section> : readings.length ? (
      <div className="mt-6 grid gap-4">{readings.map((reading) => <Link key={reading.readingId} href={`/result/${reading.readingId}`} className="glass rounded-lg p-5"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><h2 className="text-xl font-semibold text-white">{reading.spread.name}</h2><time className="text-sm text-mist/60">{new Date(reading.createdAt).toLocaleString("zh-CN")}</time></div><p className="mt-3 text-mist/78">{reading.question || "未填写问题"}</p></Link>)}</div>
    ) : <section className="glass mt-6 rounded-lg p-8 text-center text-mist/72">暂无抽牌记录</section>}
    {message ? <p className="mt-4 rounded-lg bg-white/[0.08] p-3 text-sm text-mist">{message}</p> : null}
  </div></main></RequireCloudAuth>;
}
