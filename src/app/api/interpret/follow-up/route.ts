import { NextResponse } from "next/server";
import { aiAccessForUser } from "@/lib/ai/access";
import { answerFollowUp, normalizeFollowUpRequest } from "@/lib/ai/followUp";
import { AiRequestConflict } from "@/lib/ai/interpretReading";
import { generateDeepSeekFollowUp } from "@/lib/ai/deepseek";
import { decryptReadingPayload, encryptReadingPayload } from "@/lib/crypto/readings";
import { isStoredReading, ReadingValidationError } from "@/lib/readings/validation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ message: "请求 JSON 无效。" }, { status: 400 }); }
  try {
    const input = normalizeFollowUpRequest(body);
    const supabase = await createSupabaseServerClient();
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) return NextResponse.json({ message: "请先登录。" }, { status: 401 });
    const access = aiAccessForUser(auth.user);
    if (!access.allowed) return NextResponse.json({ message: access.message }, { status: access.mode === "unconfigured" ? 503 : 403 });
    const { data, error } = await supabase.from("tarot_readings").select("encrypted_payload,updated_at").eq("id", input.readingId).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ message: "未找到该记录。" }, { status: 404 });
    const reading = decryptReadingPayload<unknown>(data.encrypted_payload);
    if (!isStoredReading(reading)) throw new ReadingValidationError("历史记录格式不完整。");
    const result = await answerFollowUp(reading, data.updated_at, input, {
      save: async (next, expected) => {
        const { data: updated, error: updateError } = await supabase.from("tarot_readings")
          .update({ encrypted_payload: encryptReadingPayload(next) }).eq("id", input.readingId)
          .eq("updated_at", expected).select("updated_at").maybeSingle();
        if (updateError) throw updateError;
        return updated?.updated_at ?? null;
      },
    }, generateDeepSeekFollowUp);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "追问暂时无法完成，请重试。" },
      { status: error instanceof ReadingValidationError ? 400 : error instanceof AiRequestConflict ? 409 : 500 });
  }
}
