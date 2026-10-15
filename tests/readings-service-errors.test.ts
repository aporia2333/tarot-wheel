import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { readingFixture } from "./fixtures";

async function withClient(run: (client: typeof import("../src/lib/readings/client"), reply: (response: Response) => void) => Promise<void>) {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL, previousKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:3102";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-only-key";
  const client = await import("../src/lib/readings/client");
  const stub = mock.method(globalThis, "fetch", async () => Response.json({}));
  try {
    await run(client, response => stub.mock.mockImplementation(async () => response.clone()));
  } finally {
    stub.mock.restore();
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = previousKey;
  }
}

test("HTML browser challenges retain a distinct recovery signal without exposing the checkpoint body", async () => {
  await withClient(async (client, reply) => {
    for (const response of [
      new Response("private checkpoint content", { status: 403, headers: { "x-vercel-mitigated": "challenge" } }),
      new Response("<!doctype html><title>Vercel Security Checkpoint</title><script>private challenge token</script>", { status: 403 }),
    ]) {
      reply(response);
      await assert.rejects(client.saveReading(readingFixture()), error => error instanceof client.HistoryServiceError &&
        error.code === "verification" && error.status === 403 && /验证当前浏览器/.test(error.message) && !/private/.test(error.message));
    }
    reply(Response.json({ message: "当前账号没有访问权限。" }, { status: 403 }));
    await assert.rejects(client.getReadings(), error => error instanceof client.HistoryServiceError && error.code === "http" && /没有访问权限/.test(error.message));
  });
});

test("non-JSON platform failures keep HTTP meaning and never masquerade as successful history responses", async () => {
  await withClient(async (client, reply) => {
    for (const [status, message] of [[401, "重新登录"], [403, "拒绝"], [404, "接口"], [413, "超过"], [429, "频繁"], [502, "暂时不可用"], [504, "暂时不可用"]] as const) {
      reply(new Response("<html>private upstream failure</html>", { status }));
      await assert.rejects(client.getReadings(), error => error instanceof client.HistoryServiceError && error.status === status &&
        error.message.includes(message) && !error.message.includes("private"));
    }
    for (const response of [Response.json({ readings: {} }), Response.json({ readings: [null] }), Response.json({}), new Response(null, { status: 204 })]) {
      reply(response);
      await assert.rejects(client.getReadings(), /格式无效/);
    }
    reply(Response.json({ reading: "invalid" }));
    await assert.rejects(client.getReadingById(readingFixture().readingId), /格式无效/);
    reply(Response.json({ readings: [] })); assert.deepEqual(await client.getReadings(), []);
    reply(Response.json({ reading: readingFixture() })); assert.deepEqual(await client.getReadingById(readingFixture().readingId), readingFixture());
  });
});

test("saving requires acknowledgement of the same reading and sends same-origin credentials with JSON negotiation", async () => {
  await withClient(async (client, reply) => {
    reply(Response.json({})); await assert.rejects(client.saveReading(readingFixture()), /格式无效/);
    reply(Response.json({ readingId: "different-reading" })); await assert.rejects(client.saveReading(readingFixture()), /格式无效/);
    const reading = readingFixture();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (_url, options) => {
      assert.equal(options?.credentials, "same-origin");
      assert.equal(new Headers(options?.headers).get("Accept"), "application/json");
      assert.equal(new Headers(options?.headers).get("Content-Type"), "application/json");
      assert.deepEqual(JSON.parse(String(options?.body)), { reading });
      return Response.json({ readingId: reading.readingId }, { status: 201 });
    };
    try { await client.saveReading(reading); } finally { globalThis.fetch = originalFetch; }
  });
});
