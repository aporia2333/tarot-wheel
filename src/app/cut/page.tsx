"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ReadingLayout } from "@/components/ReadingLayout";

/** Old bookmarks resume the single preparation room instead of creating a second stage page. */
export default function CutPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/shuffle"); }, [router]);
  return <ReadingLayout step={3}><p role="status">正在回到牌桌…</p></ReadingLayout>;
}
