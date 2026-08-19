import { NextResponse } from "next/server";
import { decryptReadingPayload, encryptReadingPayload } from "@/lib/crypto/readings";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TarotReading } from "@/types";

export const runtime = "nodejs";

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ message }, { status: 500 });
}

function isValidReading(value: unknown): value is TarotReading {
  if (!value || typeof value !== "object") return false;
  const reading = value as Partial<TarotReading>;
  return Boolean(
    typeof reading.readingId === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(reading.readingId) &&
      typeof reading.createdAt === "string" &&
      reading.spread &&
      Array.isArray(reading.selectedCards) &&
      typeof reading.question === "string" &&
      typeof reading.contextInfo === "string"
  );
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
  try {
    const body = (await request.json()) as { reading?: unknown };
    if (!isValidReading(body.reading)) {
      return NextResponse.json({ message: "历史记录格式无效。" }, { status: 400 });
    }
    if (body.reading.question.length > 2000 || body.reading.contextInfo.length > 5000 || body.reading.selectedCards.length > 20) {
      return NextResponse.json({ message: "历史记录内容超过允许范围。" }, { status: 400 });
    }

    const { supabase, user } = await getAuthenticatedClient();
    if (!user) return NextResponse.json({ message: "请先登录后再保存记录。" }, { status: 401 });

    const { error } = await supabase.from("tarot_readings").insert({
      id: body.reading.readingId,
      user_id: user.id,
      encrypted_payload: encryptReadingPayload(body.reading),
      created_at: body.reading.createdAt,
    });
    if (error) throw error;

    return NextResponse.json({ readingId: body.reading.readingId }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "无法保存历史记录。");
  }
}
