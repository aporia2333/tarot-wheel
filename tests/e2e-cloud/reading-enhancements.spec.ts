import { randomUUID } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";
import { readingFixture } from "../fixtures";
import { getCardMeaning } from "../../src/data/tarotCards";

async function login(page: Page, email = "allowed@example.test") {
  await page.goto("/login?next=/question");
  await page.getByLabel("邮箱", { exact: true }).fill(email);
  await page.getByLabel("密码", { exact: true }).fill("test-password-only");
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page.getByRole("heading", { name: "输入问题", exact: true })).toBeVisible();
}
async function stats(page: Page) { return (await (await page.request.get("http://127.0.0.1:3102/mock/stats")).json()); }
async function saveReading(page: Page) {
  const reading = { ...readingFixture(), readingId: randomUUID() };
  expect((await page.request.post("/api/readings", { data: { reading } })).status()).toBe(201);
  return reading;
}

test("guest and blocked accounts read orientation-specific references and see AI restrictions before requesting", async ({ page, browser }) => {
  await page.goto("/login"); await page.getByRole("button", { name: "跳过登录，作为访客体验" }).click();
  await expect(page).toHaveURL(/\/question$/);
  const reading = await saveReading(page); const before = await stats(page);
  const access = await page.request.get("/api/interpret/access");
  expect((await access.json()).mode).toBe("guest"); expect(access.headers()["cache-control"]).toContain("no-store");
  await page.goto(`/result/${reading.readingId}`);
  await expect(page.getByRole("heading", { name: "牌义参考", exact: true })).toBeVisible();
  await expect(page.locator(".reference-meaning")).toHaveCount(3);
  await expect(page.locator(".reference-meaning").nth(1)).toContainText(getCardMeaning(reading.selectedCards[1].card, "reversed"));
  await expect(page.getByRole("link", { name: "登录账号解读" })).toBeVisible();
  await expect(page.getByRole("button", { name: "生成 AI 解读" })).toBeDisabled();
  expect((await page.request.post("/api/interpret/follow-up", { data: { readingId: reading.readingId, requestId: randomUUID(), question: "怎样理解？" } })).status()).toBe(403);
  expect((await stats(page)).aiCalls).toBe(before.aiCalls);
  const context = await browser.newContext({ baseURL: "http://127.0.0.1:3101" });
  try {
    const other = await context.newPage(); await login(other, "blocked@example.test");
    const own = await saveReading(other); await other.goto(`/result/${own.readingId}`);
    await expect(other.getByText(/当前账号尚未获得 AI 解读权限/)).toBeVisible();
    await expect(other.getByRole("button", { name: "生成 AI 解读" })).toBeDisabled();
    expect((await (await other.request.get("/api/interpret/access")).json()).allowed).toBe(false);
    expect((await other.request.post("/api/interpret/follow-up", { data: { readingId: reading.readingId, requestId: randomUUID(), question: "怎样理解？" } })).status()).toBe(403);
  } finally { await context.close(); }
});

test("new readings show a concise overview and three saved follow-ups reuse the original spread", async ({ page }) => {
  await login(page); const reading = await saveReading(page);
  await page.goto(`/result/${reading.readingId}`);
  await expect(page.getByRole("button", { name: "生成 AI 解读" })).toBeEnabled();
  await page.getByRole("button", { name: "生成 AI 解读" }).click();
  await expect(page.locator(".reading-overview dt")).toHaveText(["核心主题", "当前张力", "可以尝试的一步"]);
  await expect(page.locator(".reading-overview")).toContainText("测试核心主题");
  expect(await page.locator(".reading-overview").evaluate((element) => element.getBoundingClientRect().top))
    .toBeLessThan(await page.locator(".synthesis").evaluate((element) => element.getBoundingClientRect().top));
  const before = await stats(page);
  await page.getByRole("button", { name: "这几张牌之间有什么联系？", exact: true }).click();
  await page.getByRole("button", { name: "发送追问", exact: true }).evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await expect(page.locator(".follow-up-conversation article")).toHaveCount(1);
  const after = await stats(page); expect(after.followUpCalls).toBe(before.followUpCalls + 1);
  expect(after.lastFollowUpInput.cards.map((card: { cardId: string }) => card.cardId)).toEqual(reading.selectedCards.map((card) => card.card.id));
  expect(after.lastFollowUpInput.cards[1].orientation).toBe("逆位");
  expect(after.lastFollowUpInput.question).toBe(reading.question); expect(after.lastFollowUpInput.context).toBe(reading.contextInfo);
  await page.reload(); await expect(page.locator(".follow-up-conversation article")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "发送追问", exact: true })).toBeVisible();
  for (const width of [320, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await page.getByRole("button", { name: "发送追问", exact: true }).boundingBox())!.height).toBeGreaterThanOrEqual(44);
    if (width !== 768) await page.locator(".follow-up-section").screenshot({ path: `.audit/ui-enhancements/follow-up-${width}.png` });
  }
  for (const question of ["当前的挑战可以怎样面对？", "怎样观察行动后的变化？"]) {
    await page.getByLabel("想进一步理解什么？", { exact: true }).fill(question);
    await page.getByRole("button", { name: "发送追问", exact: true }).click();
    await expect(page.getByRole("heading", { name: question, exact: true })).toBeVisible();
  }
  await expect(page.locator(".follow-up-heading")).toContainText("3 / 3 次追问");
  await expect(page.getByLabel("想进一步理解什么？", { exact: true })).toHaveCount(0);
  const stored = (await (await page.request.get(`/api/readings/${reading.readingId}`)).json()).reading;
  expect(stored.aiFollowUps).toHaveLength(3);
  expect(stored.selectedCards.map((item: { card: { id: string } }) => item.card.id)).toEqual(reading.selectedCards.map((item) => item.card.id));
  const last = stored.aiFollowUps.at(-1);
  const calls = (await stats(page)).aiCalls;
  const cached = await page.request.post("/api/interpret/follow-up", { data: { readingId: reading.readingId, requestId: last.requestId, question: last.question } });
  expect(cached.status()).toBe(200); expect((await cached.json()).cached).toBe(true);
  expect((await page.request.post("/api/interpret/follow-up", { data: { readingId: reading.readingId, requestId: randomUUID(), question: "第四个问题" } })).status()).toBe(400);
  expect((await stats(page)).aiCalls).toBe(calls);
});

test("follow-up API enforces authentication, scope, input validation, concurrency and failed-response recovery", async ({ page, request, browser }) => {
  const anonymousRequest = { readingId: randomUUID(), requestId: randomUUID(), question: "怎样理解？" };
  expect((await request.post("/api/interpret/follow-up", { data: anonymousRequest })).status()).toBe(401);
  await login(page); const reading = await saveReading(page);
  const input = { ...anonymousRequest, readingId: reading.readingId };
  expect((await page.request.post("/api/interpret/follow-up", { data: input })).status()).toBe(400);
  expect((await page.request.post("/api/interpret", { data: { readingId: reading.readingId } })).status()).toBe(200);
  for (const question of ["", " ", "x".repeat(801)]) expect((await page.request.post("/api/interpret/follow-up", { data: { ...input, question } })).status()).toBe(400);
  const before = await stats(page);
  const responses = await Promise.all([1, 2].map(() => page.request.post("/api/interpret/follow-up", { data: input })));
  expect(responses.map((item) => item.status()).sort()).toEqual([200, 409]);
  expect((await stats(page)).followUpCalls).toBe(before.followUpCalls + 1);
  expect((await page.request.post("/api/interpret/follow-up", { data: { ...input, question: "不同问题" } })).status()).toBe(409);
  for (const question of ["模拟追问失败", "模拟错牌引用"]) {
    const failure = { ...input, requestId: randomUUID(), question };
    expect((await page.request.post("/api/interpret/follow-up", { data: failure })).status()).toBe(500);
    const stored = (await (await page.request.get(`/api/readings/${reading.readingId}`)).json()).reading;
    expect(stored.aiFollowUps).toHaveLength(1); expect(stored.aiStatus).toBe("completed"); expect(stored.aiFollowUpJob.status).toBe("failed");
  }
  const context = await browser.newContext({ baseURL: "http://127.0.0.1:3101" });
  try {
    const other = await context.newPage(); await login(other, "other-allowed@example.test");
    expect((await other.request.get(`/api/readings/${reading.readingId}`)).status()).toBe(404);
    expect((await other.request.post("/api/interpret/follow-up", { data: input })).status()).toBe(404);
  } finally { await context.close(); }
});
