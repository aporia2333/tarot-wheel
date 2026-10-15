import type { User } from "@supabase/supabase-js";

export type AiAccess = { mode: "local" | "guest" | "member" | "blocked" | "unconfigured" | "unauthenticated"; allowed: boolean; message: string };

export function isAllowedAiUser(email: string | undefined): boolean {
  return Boolean(email && (process.env.AI_ALLOWED_EMAILS || "").split(",")
    .map((value) => value.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase()));
}

export function aiAccessForUser(user: Pick<User, "email" | "is_anonymous"> | null): AiAccess {
  if (!user) return { mode: "unauthenticated", allowed: false, message: "登录具有解读权限的账号后，可以生成完整 AI 解读。" };
  if (user.is_anonymous) return { mode: "guest", allowed: false, message: "访客可以查看本次牌面的参考牌义。完整 AI 解读与追问需要具有解读权限的正式账号。" };
  if (!isAllowedAiUser(user.email)) return { mode: "blocked", allowed: false, message: "当前账号尚未获得 AI 解读权限。你仍可阅读参考牌义；如需开通，请联系站点管理员。" };
  if (!process.env.DEEPSEEK_API_KEY) return { mode: "unconfigured", allowed: false, message: "AI 服务尚未配置。你可以先阅读参考牌义，稍后再生成完整解读。" };
  return { mode: "member", allowed: true, message: "生成时会将本次问题、背景、牌阵和牌面发送给 DeepSeek；追问继续使用这次的牌。" };
}
