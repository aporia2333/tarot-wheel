import { NextResponse } from "next/server";
import { decryptReadingPayload } from "@/lib/crypto/readings";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TarotReading } from "@/types";

export const runtime = "nodejs";

async function getAuthenticatedClient() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { supabase, user: null };
  return { supabase, user: data.user };
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const { supabase, user } = await getAuthenticatedClient();
    if (!user) return NextResponse.json({ message: "请先登录。" }, { status: 401 });

    const { data, error } = await supabase
      .from("tarot_readings")
      .select("encrypted_payload")
      .eq("id", params.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ message: "未找到该记录。" }, { status: 404 });

    return NextResponse.json({ reading: decryptReadingPayload<TarotReading>(data.encrypted_payload) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "无法读取历史记录。";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const { supabase, user } = await getAuthenticatedClient();
    if (!user) return NextResponse.json({ message: "请先登录。" }, { status: 401 });

    const { error } = await supabase.from("tarot_readings").delete().eq("id", params.id);
    if (error) throw error;
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "无法删除历史记录。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
