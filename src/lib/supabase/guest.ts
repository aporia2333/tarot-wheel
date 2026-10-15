import type { SupabaseClient, User } from "@supabase/supabase-js";

type GuestAuth = Pick<SupabaseClient["auth"], "getSession" | "getUser" | "signInAnonymously">;
const pendingSessions = new WeakMap<GuestAuth, Promise<User>>();

export function safeReturnPath(path: string | null | undefined, fallback = "/question") {
  if (!path?.startsWith("/") || path.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(path)) return fallback;
  return path;
}

async function startSession(auth: GuestAuth): Promise<User> {
  const current = await auth.getSession();
  if (current.error) throw current.error;
  if (current.data.session) {
    // Replacing an existing identity would orphan its user-scoped reading history.
    const verified = await auth.getUser();
    if (verified.error) throw verified.error;
    if (!verified.data.user) throw new Error("登录状态验证失败，请刷新页面重试。");
    return verified.data.user;
  }

  const created = await auth.signInAnonymously();
  if (created.error) throw created.error;
  if (!created.data.user || !created.data.session) throw new Error("访客登录未完成，请重试。");
  return created.data.user;
}

export function ensureGuestSession(auth: GuestAuth): Promise<User> {
  const pending = pendingSessions.get(auth);
  if (pending) return pending;
  const result = startSession(auth).finally(() => pendingSessions.delete(auth));
  pendingSessions.set(auth, result);
  return result;
}

export function guestErrorMessage(error: unknown): string {
  const details = error && typeof error === "object" ? error as { code?: string; status?: number; message?: string; name?: string } : {};
  const message = details.message?.toLowerCase() || "";
  if (details.code === "anonymous_provider_disabled" || message.includes("anonymous sign-ins are disabled")) {
    return "访客模式暂未开放。请稍后再试，或登录账号继续。";
  }
  if (details.status === 429 || details.code === "over_request_rate_limit") {
    return "访客登录请求过于频繁，请稍后重试。";
  }
  if (details.code === "captcha_failed") {
    return "访客登录需要完成验证，请联系站点管理员，或登录账号继续。";
  }
  if (details.name === "AuthRetryableFetchError" || details.code === "request_timeout" ||
      /fetch|network|timeout|timed out/.test(message)) {
    return "暂时无法连接登录服务，请检查网络后重试。";
  }
  return "暂时无法进入访客模式，请重试，或登录账号继续。";
}
