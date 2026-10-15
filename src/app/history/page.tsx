"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { RequireCloudAuth } from "@/components/RequireCloudAuth";
import { ReadingLayout } from "@/components/ReadingLayout";
import { PageNotice } from "@/components/PageNotice";
import { clearReadings, deleteReading, getReadings } from "@/lib/readings/client";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { TarotReading } from "@/types";
import { CardArtwork } from "@/components/CardArtwork";
import { useCardSkin } from "@/components/CardSkinProvider";
import { getDisplayImageSrc } from "@/components/ReadingCardsDisplay";

export default function HistoryPage() {
  const { skin } = useCardSkin();
  const [readings, setReadings] = useState<TarotReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [confirmation, setConfirmation] = useState<TarotReading | "all" | null>(null);
  const [deleting, setDeleting] = useState(false), [deleteError, setDeleteError] = useState(""), [status, setStatus] = useState("");
  const dialog = useRef<HTMLDialogElement>(null), cancelButton = useRef<HTMLButtonElement>(null), pending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!confirmation) return;
    dialog.current?.showModal(); cancelButton.current?.focus();
  }, [confirmation]);
  function dismiss() {
    if (pending.current) return;
    dialog.current?.close(); setConfirmation(null); setDeleteError("");
  }
  async function confirmDelete() {
    if (!confirmation || pending.current) return;
    pending.current = true; setDeleting(true); setDeleteError("");
    try {
      if (confirmation === "all") await clearReadings(); else await deleteReading(confirmation.readingId);
      if (!mounted.current) return;
      setReadings(current => confirmation === "all" ? [] : current.filter(reading => reading.readingId !== confirmation.readingId));
      setStatus(confirmation === "all" ? "历史记录已清空。" : "这次阅读已删除。");
      dialog.current?.close(); setConfirmation(null);
      document.getElementById("history-new-reading")?.focus();
    } catch (error) {
      if (mounted.current) setDeleteError(error instanceof Error ? error.message : "操作失败，请重试。");
    } finally {
      pending.current = false; if (mounted.current) setDeleting(false);
    }
  }
  useEffect(() => {
    let active = true;
    void getReadings().then((value) => { if (active) setReadings(value); }).catch((error) => {
      if (active) setMessage(error instanceof Error ? error.message : "无法读取历史记录。");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return <RequireCloudAuth><ReadingLayout title="历史记录" scene="history" description="把过去的阅读留在这里，在需要时重新看见。" actions={<>
    {readings.length && !loading && !message ? <button type="button" className="text-link history-clear" disabled={deleting}
      onClick={() => { setDeleteError(""); setConfirmation("all"); }}>清空历史</button> : null}
    <Link id="history-new-reading" href="/question" className="btn-primary">开始新的阅读</Link>
  </>}>
    <p className="ritual-sr-only" role="status">{status}</p>
    {loading ? <PageNotice title="正在读取历史记录…" loading /> : message ? <PageNotice title={message} error description="请刷新页面重试，或稍后回来看。" />
      : readings.length ? <div className="history-list">{readings.map((reading) => <div key={reading.readingId} className="history-record">
      <Link href={`/result/${reading.readingId}`} className="history-entry">
        <time dateTime={reading.createdAt}>{new Date(reading.createdAt).toLocaleString("zh-CN")}</time>
        <div className="history-entry-copy"><h2>{reading.spread.name}</h2><p>{reading.question || "一般自我观察"}</p><small>{reading.selectedCards.length} 张牌{reading.aiStatus === "completed" ? " · 含保存的解读" : ""}</small></div>
        <div className="history-card-preview" aria-hidden="true">{reading.selectedCards.slice(0, 3).map((selected, index) => <div key={index}>
          <CardArtwork src={getDisplayImageSrc(selected.card, skin)} fallbackSrc={getDisplayImageSrc(selected.card)} name={selected.card.nameCn || selected.card.name || selected.card.nameEn || "未知塔罗牌"}
            orientation={selected.orientation} sizes="48px" />
        </div>)}</div><span>查看阅读</span>
      </Link><button type="button" className="history-delete" disabled={deleting}
        aria-label={`删除记录：${(reading.question || reading.spread.name).slice(0, 40)}`}
        onClick={() => { setDeleteError(""); setConfirmation(reading); }}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13M10 10v7m4-7v7" /></svg><span>删除</span>
      </button></div>)}</div> : <PageNotice title="暂无抽牌记录" description="从一个问题开始。完成阅读后，牌面与解读会留在这里。" action={<Link href="/question" className="btn-secondary">开始抽牌</Link>} />}
    {confirmation ? <dialog ref={dialog} className="history-delete-dialog" aria-labelledby="history-delete-title" aria-describedby="history-delete-description"
      onCancel={event => { event.preventDefault(); dismiss(); }}
      onClick={event => { if (event.target !== event.currentTarget) return; const r = event.currentTarget.getBoundingClientRect();
        if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dismiss(); }}>
      <h2 id="history-delete-title">{confirmation === "all" ? "清空全部历史记录？" : "删除这次阅读？"}</h2>
      {confirmation !== "all" ? <p className="history-delete-question">{confirmation.question || confirmation.spread.name}</p> : null}
      <p id="history-delete-description">{confirmation === "all" ? isSupabaseConfigured
        ? "将删除当前账号的全部历史记录，包括在其他设备保存的记录。删除后无法恢复。"
        : `将删除当前浏览器保存的全部 ${readings.length} 条历史记录。删除后无法恢复。`
        : "牌面、解读和追问会一起删除。删除后无法恢复。"}</p>
      {deleteError ? <p role="alert" className="inline-message">{deleteError}</p> : null}
      <div className="history-dialog-actions"><button ref={cancelButton} type="button" className="btn-secondary" disabled={deleting} onClick={dismiss}>取消</button>
        <button type="button" className="btn-primary history-confirm-delete" disabled={deleting} onClick={() => void confirmDelete()}>{deleting ? "正在处理…" : confirmation === "all" ? "确认清空" : "确认删除"}</button></div>
    </dialog> : null}
  </ReadingLayout></RequireCloudAuth>;
}
