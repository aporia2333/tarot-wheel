import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { readingFixture } from "./fixtures";

test("history client accepts DELETE 204 and rejects malformed or failed service responses", async () => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:3102";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-only-key";
  const client = await import("../src/lib/readings/client");
  const fetchStub = mock.method(globalThis, "fetch", async () => new Response(null, { status: 204 }));
  try {
    await client.deleteReading(readingFixture().readingId);
    await client.clearReadings();
    assert.equal(fetchStub.mock.calls[1].arguments[0], "/api/readings");
    assert.equal(fetchStub.mock.calls[1].arguments[1]?.method, "DELETE");
    for (const response of [Response.json(null), new Response("invalid-json")]) {
      fetchStub.mock.mockImplementation(async () => response);
      await assert.rejects(client.getReadings(), /格式无效/);
    }
    fetchStub.mock.mockImplementation(async () => Response.json({ message: "请先登录。" }, { status: 401 }));
    await assert.rejects(client.getReadings(), /请先登录/);
    await assert.rejects(client.clearReadings(), /请先登录/);
    fetchStub.mock.mockImplementation(async () => Response.json({ readings: [readingFixture()] }));
    assert.equal((await client.getReadings()).length, 1);
  } finally {
    fetchStub.mock.restore();
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = previousKey;
  }
});
