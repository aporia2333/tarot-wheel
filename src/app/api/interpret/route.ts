import { NextResponse } from "next/server";
import { decryptReadingPayload, encryptReadingPayload } from "@/lib/crypto/readings";
import { generateDeepSeekInterpretation } from "@/lib/ai/deepseek";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TarotReading } from "@/types";

export const runtime = "nodejs";

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(request: Request) {
  let reading: TarotReading | null = null;
  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>> | null = null;
  let readingId = "";

  try {
    const body = await request.json() as { readingId?: unknown };
    if (!isUuid(body.readingId)) return NextResponse.json({ message: "记录 ID 无效。" }, { status: 400 });
    readingId = body.readingId;
    supabase = await createSupabaseServerClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return NextResponse.json({ message: "请先登录。" }, { status: 401 });
    if (authData.user.is_anonymous) return NextResponse.json({ message: "为保护 AI 使用额度，请登录正式账号后再生成解读。" }, { status: 403 });

    const { data, error } = await supabase.from("tarot_readings").select("encrypted_payload").eq("id", readingId).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ message: "未找到该记录。" }, { status: 404 });
    reading = decryptReadingPayload<TarotReading>(data.encrypted_payload);

    if (reading.aiInterpretation && reading.aiStatus === "completed") {
      return NextResponse.json({ interpretation: reading.aiInterpretation, cached: true });
    }

    const pendingReading = { ...reading, aiStatus: "pending" as const };
    const { error: pendingError } = await supabase.from("tarot_readings").update({ encrypted_payload: encryptReadingPayload(pendingReading) }).eq("id", readingId);
    if (pendingError) throw pendingError;

    const interpretation = await generateDeepSeekInterpretation(pendingReading);
    const completedReading = { ...pendingReading, aiInterpretation: interpretation, aiStatus: "completed" as const };
    const { error: completedError } = await supabase.from("tarot_readings").update({ encrypted_payload: encryptReadingPayload(completedReading) }).eq("id", readingId);
    if (completedError) throw completedError;

    return NextResponse.json({ interpretation, cached: false });
  } catch (error) {
    if (supabase && reading && readingId) {
      const failedReading = { ...reading, aiStatus: "failed" as const };
      await supabase.from("tarot_readings").update({ encrypted_payload: encryptReadingPayload(failedReading) }).eq("id", readingId);
    }
    const message = error instanceof Error ? error.message : "生成 AI 解读失败。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
