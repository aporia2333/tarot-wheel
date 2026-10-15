import { NextResponse } from "next/server";
import { decryptReadingPayload, encryptReadingPayload } from "@/lib/crypto/readings";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TarotReading } from "@/types";
import { isRecord, normalizeNewReading, ReadingValidationError } from "@/lib/readings/validation";

export const runtime = "nodejs";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ message }, { status: error instanceof ReadingValidationError ? 400 : 500 });
}

function drawContents(reading: TarotReading): string {
  const normalized = normalizeNewReading(reading);
  // A legacy retry may now include directional metadata added by migration.
  // Compare the actual saved draw without overwriting its existing AI result.
  return JSON.stringify({ ...normalized, selectedCards: normalized.selectedCards.map(({ card, orientation, position }) => ({ card, orientation, position })) });
}

async function getAuthenticatedClient() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { supabase, user: null };
  return { supabase, user: data.user };
}

export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedClient();
    if (!user) return NextResponse.json({ message: "请先登录。" }, { status: 401 });

    const { data, error } = await supabase
      .from("tarot_readings")
      .select("encrypted_payload")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;

    const readings = (data ?? []).map((row) => decryptReadingPayload<TarotReading>(row.encrypted_payload));
    return NextResponse.json({ readings });
  } catch (error) {
    return errorResponse(error, "无法读取历史记录。");
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ message: "请求 JSON 无效。" }, { status: 400 }); }
  try {
    const reading = normalizeNewReading(isRecord(body) ? body.reading : null);

    const { supabase, user } = await getAuthenticatedClient();
    if (!user) return NextResponse.json({ message: "请先登录后再保存记录。" }, { status: 401 });

    const { error } = await supabase.from("tarot_readings").insert({
      id: reading.readingId,
      user_id: user.id,
      encrypted_payload: encryptReadingPayload(reading),
      created_at: reading.createdAt,
    });
    // A response can be lost after a successful insert. Retrying the same draw
    // acknowledges the original record without overwriting its AI result.
    if (error?.code === "23505") {
      const { data: existing, error: existingError } = await supabase.from("tarot_readings")
        .select("encrypted_payload").eq("id", reading.readingId).maybeSingle();
      if (existingError) throw existingError;
      if (existing && drawContents(decryptReadingPayload<TarotReading>(existing.encrypted_payload)) === drawContents(reading)) {
        return NextResponse.json({ readingId: reading.readingId });
      }
      return NextResponse.json({ message: "记录 ID 已被使用，请重新开始抽牌。" }, { status: 409 });
    }
    if (error) throw error;

    return NextResponse.json({ readingId: reading.readingId }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "无法保存历史记录。");
  }
}

/** Clear the authenticated owner's full history, including rows beyond the list limit. */
export async function DELETE() {
  try {
    const { supabase, user } = await getAuthenticatedClient();
    if (!user) return NextResponse.json({ message: "请先登录。" }, { status: 401 });
    const { error } = await supabase.from("tarot_readings").delete().eq("user_id", user.id);
    if (error) throw error;
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error, "无法清空历史记录。");
  }
}
