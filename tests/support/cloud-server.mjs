import { createServer } from "node:http";
import { randomUUID, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const users = new Map(); const rows = new Map();
let aiCalls = 0; let version = Date.now(); let lastInput = null; let lastFollowUpInput = null; let followUpCalls = 0;
const encoded = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
function session(user) {
  const seconds = Math.floor(Date.now() / 1000);
  return { access_token: `${encoded({ alg: "HS256", typ: "JWT" })}.${encoded({ sub: user.id, email: user.email, role: "authenticated", aud: "authenticated", exp: seconds + 3600, iat: seconds, is_anonymous: user.is_anonymous })}.test-signature`,
    token_type: "bearer", expires_in: 3600, expires_at: seconds + 3600, refresh_token: `test-refresh-${user.id}`, user };
}
function userFor(request) {
  try { const claims = JSON.parse(Buffer.from(String(request.headers.authorization).split(".")[1], "base64url")); return users.get(claims.sub); } catch { return null; }
}
const server = createServer(async (request, response) => {
  response.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:3101");
  response.setHeader("Access-Control-Allow-Headers", "authorization,apikey,content-type,x-client-info,x-supabase-api-version");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  if (request.method === "OPTIONS") { response.writeHead(204); response.end(); return; }
  const send = (data, status = 200) => { response.writeHead(status, { "Content-Type": "application/json" }); response.end(JSON.stringify(data)); };
  const url = new URL(request.url, "http://127.0.0.1:3102");
  let raw = ""; for await (const chunk of request) raw += chunk;
  let body = {}; try { body = raw ? JSON.parse(raw) : {}; } catch { send({ message: "Invalid JSON" }, 400); return; }
  if (url.pathname === "/mock/stats") { send({ aiCalls, rows: [...rows.values()], lastInput, lastFollowUpInput, followUpCalls, anonymousUsers: [...users.values()].filter((user) => user.is_anonymous).length }); return; }
  if (url.pathname === "/mock/deepseek") {
    const providerInput = JSON.parse(body.messages[1].content);
    aiCalls++; lastInput = providerInput;
    if (providerInput.task === "follow_up") {
      followUpCalls++; lastFollowUpInput = providerInput;
      if (providerInput.followUpQuestion === "模拟追问失败") { send({ error: { message: "test error" } }, 503); return; }
      await new Promise((done) => setTimeout(done, 100));
      send({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify({
        answer: `测试追问回答：结合${providerInput.cards[0].name}在${providerInput.cards[0].positionContext}的${providerInput.cards[0].orientation}状态，先把原行动建议拆成一件可观察的小事。\n\n继续沿用本次牌面。`,
        referencedCardIds: providerInput.followUpQuestion === "模拟错牌引用" ? ["not-drawn"] : [providerInput.cards[0].cardId],
      }) } }] }); return;
    }
    if (providerInput.question === "模拟AI失败") { send({ error: { message: "test error" } }, 503); return; }
    if (providerInput.question === "模拟错误响应") { send({ choices: [{ finish_reason: "stop", message: { content: "null" } }] }); return; }
    // A short delay makes the simultaneous-request race observable.
    await new Promise((done) => setTimeout(done, 100));
    send({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify({
      overview: { theme: "测试核心主题：从问题中辨认可控的方向。", tension: "测试当前张力：留意牌位之间的变化。", nextStep: "测试行动：先写下一个可以尝试的小步骤。" },
      cards: providerInput.cards.map((card, index) => ({ cardId: card.cardId, interpretation: `${card.positionContext}：测试解读 ${index + 1}，结合${card.name}的${card.orientation}参考。` })),
      summary: "测试综合总结：结合全部牌位与问题，先厘清可控的一步。",
    }) } }] }); return;
  }
  if (["/auth/v1/token", "/auth/v1/signup"].includes(url.pathname)) {
    const anonymous = url.pathname.endsWith("signup") && !body.email;
    const email = body.email || `guest-${randomUUID()}@example.test`;
    let user = [...users.values()].find((candidate) => candidate.email === email);
    if (!user) {
      user = { id: randomUUID(), email, is_anonymous: anonymous, aud: "authenticated", role: "authenticated",
        created_at: new Date().toISOString(), app_metadata: { provider: anonymous ? "anonymous" : "email", providers: [anonymous ? "anonymous" : "email"] }, user_metadata: {} };
      users.set(user.id, user);
    }
    send(session(user)); return;
  }
  const user = userFor(request);
  if (url.pathname === "/auth/v1/user") { send(user || { message: "Invalid token" }, user ? 200 : 401); return; }
  if (url.pathname === "/auth/v1/logout") { response.writeHead(204); response.end(); return; }
  if (url.pathname !== "/rest/v1/tarot_readings" || !user) { send({ message: "Not authorised" }, 401); return; }
  const matches = () => [...rows.values()].filter((row) => row.user_id === user.id &&
    (!url.searchParams.get("user_id") || url.searchParams.get("user_id") === `eq.${row.user_id}`) &&
    (!url.searchParams.get("id") || url.searchParams.get("id") === `eq.${row.id}`) &&
    (!url.searchParams.get("updated_at") || url.searchParams.get("updated_at") === `eq.${row.updated_at}`));
  if (request.method === "POST") {
    if (body.user_id !== user.id) { send({ code: "42501", message: "RLS" }, 403); return; }
    if (rows.has(body.id)) { send({ code: "23505", message: "Duplicate id" }, 409); return; }
    rows.set(body.id, { ...body, updated_at: new Date(++version).toISOString() });
    response.writeHead(201); response.end(); return;
  }
  if (request.method === "PATCH") {
    const updated = matches().map((row) => { Object.assign(row, body, { updated_at: new Date(++version).toISOString() }); return row; });
    send(updated); return;
  }
  if (request.method === "DELETE") { matches().forEach((row) => rows.delete(row.id)); response.writeHead(204); response.end(); return; }
  send(matches().sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, Number(url.searchParams.get("limit") || 100)));
});
await new Promise((done) => server.listen(3102, "127.0.0.1", done));
const next = spawn(process.execPath, ["--require", resolve("tests/support/mock-fetch.cjs"), resolve("node_modules/next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", "3101"], {
  windowsHide: true, stdio: "inherit", env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:3102", NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-only-public-key",
    READINGS_ENCRYPTION_KEY: randomBytes(32).toString("base64"), DEEPSEEK_API_KEY: "test-only-key", AI_ALLOWED_EMAILS: "allowed@example.test,other-allowed@example.test", NEXT_TELEMETRY_DISABLED: "1", NEXT_DEV_DIST_DIR: ".next-cloud" },
});
next.on("exit", (code) => { server.close(); process.exit(code ?? 0); });
let stopping = false;
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => {
  if (stopping) return; stopping = true;
  server.closeAllConnections?.(); server.close();
  if (process.platform === "win32") {
    // This PID is the child created above, never an unrelated user's server.
    const cleanup = spawn("taskkill.exe", ["/PID", String(next.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
    cleanup.once("exit", () => process.exit(0)); cleanup.once("error", () => { next.kill(); process.exit(0); });
  } else next.kill();
});
