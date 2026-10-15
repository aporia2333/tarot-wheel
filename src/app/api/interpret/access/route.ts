import { NextResponse } from "next/server";
import { aiAccessForUser } from "@/lib/ai/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const headers = { "Cache-Control": "private, no-store" };
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ mode: "local", allowed: false, message: "本地体验可查看参考牌义，暂不提供 AI 解读与追问。" }, { headers });
  }
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error && error.name !== "AuthSessionMissingError") return NextResponse.json({ message: "暂时无法检查解读权限，请重试。" }, { status: 503, headers });
    return NextResponse.json(aiAccessForUser(data.user), { headers });
  } catch {
    return NextResponse.json({ message: "暂时无法检查解读权限，请重试。" }, { status: 503, headers });
  }
}
