import { NextResponse } from "next/server";
import { decryptReadingPayload, encryptReadingPayload } from "@/lib/crypto/readings";
import { generateDeepSeekInterpretation } from "@/lib/ai/deepseek";
import { AiRequestConflict, interpretReading } from "@/lib/ai/interpretReading";
import { isRecord, isStoredReading, isUuid } from "@/lib/readings/validation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAllowedAiUser } from "@/lib/ai/access";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ message: "请求 JSON 无效。" }, { status: 400 }); }
  if (!isRecord(body) || !isUuid(body.readingId)) return NextResponse.json({ message: "记录 ID 无效。" }, { status: 400 });
  const readingId = body.readingId;
  try {
    const supabase = await createSupabaseServerClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return NextResponse.json({ message: "请先登录。" }, { status: 401 });
    if (authData.user.is_anonymous) return NextResponse.json({ message: "为保护 AI 使用额度，请登录正式账号后再生成解读。" }, { status: 403 });
    if (!isAllowedAiUser(authData.user.email)) return NextResponse.json({ message: "当前账号没有 AI 解读权限。" }, { status: 403 });
    const { data, error } = await supabase.from("tarot_readings").select("encrypted_payload,updated_at").eq("id", readingId).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ message: "未找到该记录。" }, { status: 404 });
    const reading = decryptReadingPayload<unknown>(data.encrypted_payload);
    if (!isStoredReading(reading)) throw new Error("历史记录格式不完整，无法生成解读。");
    const result = await interpretReading(reading, data.updated_at, {
      save: async (next, expectedUpdatedAt) => {
        const { data: updated, error: updateError } = await supabase.from("tarot_readings")
          .update({ encrypted_payload: encryptReadingPayload(next) }).eq("id", readingId)
          .eq("updated_at", expectedUpdatedAt).select("updated_at").maybeSingle();
        if (updateError) throw updateError;
        return updated?.updated_at ?? null;
      },
    }, generateDeepSeekInterpretation);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "生成 AI 解读失败。";
    return NextResponse.json({ message }, { status: error instanceof AiRequestConflict ? 409 : 500 });
  }
}
