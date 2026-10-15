import assert from "node:assert/strict";
import { test } from "node:test";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { ensureGuestSession, guestErrorMessage, safeReturnPath } from "../src/lib/supabase/guest";

type GuestAuth = Pick<SupabaseClient["auth"], "getSession" | "getUser" | "signInAnonymously">;
const guest = { id: "existing-guest", is_anonymous: true } as User;
const member = { id: "existing-member", is_anonymous: false } as User;

test("guest entry reuses verified anonymous and member identities without replacing their history owner", async () => {
  for (const user of [guest, member]) {
    let created = 0;
    const auth = {
      getSession: async () => ({ data: { session: { user } }, error: null }),
      getUser: async () => ({ data: { user }, error: null }),
      signInAnonymously: async () => { created++; return { data: { user: guest, session: { user: guest } }, error: null }; },
    } as GuestAuth;
    assert.equal(await ensureGuestSession(auth), user);
    assert.equal(created, 0);
  }
});

test("simultaneous guest starts create only one session and retry after a failed request", async () => {
  let created = 0;
  let failed = true;
  const error = { code: "anonymous_provider_disabled" };
  const auth = {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: guest }, error: null }),
    signInAnonymously: async () => { created++; return failed
      ? { data: { user: null, session: null }, error }
      : { data: { user: guest, session: { user: guest } }, error: null }; },
  } as GuestAuth;
  const first = ensureGuestSession(auth);
  assert.equal(ensureGuestSession(auth), first);
  await assert.rejects(first, (reason) => reason === error);
  failed = false;
  const users = await Promise.all([ensureGuestSession(auth), ensureGuestSession(auth)]);
  assert.deepEqual(users, [guest, guest]);
  assert.equal(created, 2);
});

test("session verification errors never replace an existing identity and incomplete signup cannot succeed", async () => {
  let created = 0;
  const error = new TypeError("Failed to fetch");
  const auth = {
    getSession: async () => ({ data: { session: { user: guest } }, error: null }),
    getUser: async () => ({ data: { user: null }, error }),
    signInAnonymously: async () => { created++; return { data: { user: null, session: null }, error: null }; },
  } as GuestAuth;
  await assert.rejects(ensureGuestSession(auth), (reason) => reason === error);
  assert.equal(created, 0);
  auth.getSession = (async () => ({ data: { session: null }, error: null })) as GuestAuth["getSession"];
  await assert.rejects(ensureGuestSession(auth), /访客登录未完成/);
});

test("guest errors distinguish disabled permissions from rate limits, captcha and network failures", () => {
  assert.match(guestErrorMessage({ code: "anonymous_provider_disabled" }), /暂未开放/);
  assert.match(guestErrorMessage({ status: 429 }), /过于频繁/);
  assert.match(guestErrorMessage({ code: "captcha_failed" }), /完成验证/);
  assert.match(guestErrorMessage(new TypeError("Failed to fetch")), /检查网络/);
  assert.match(guestErrorMessage({ code: "request_timeout" }), /检查网络/);
  assert.equal(guestErrorMessage(new Error("private provider diagnostic")), "暂时无法进入访客模式，请重试，或登录账号继续。");
});

test("login return paths preserve protected routes and reject external or ambiguous destinations", () => {
  assert.equal(safeReturnPath("/draw"), "/draw");
  assert.equal(safeReturnPath("/history?from=login"), "/history?from=login");
  for (const path of [null, "https://example.test", "//example.test", "/\\example.test", "/\n/evil"]) {
    assert.equal(safeReturnPath(path), "/question");
    assert.equal(safeReturnPath(path, "/"), "/");
  }
});
