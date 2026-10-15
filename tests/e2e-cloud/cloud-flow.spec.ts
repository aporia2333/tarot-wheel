import { randomUUID } from "node:crypto";
import { drawFromTable } from "../drawHelpers";
import { prepareDeck } from "../preparationHelpers";
import { test, expect, type Page } from "@playwright/test";
import { readingFixture } from "../fixtures";

async function login(page: Page, email = "allowed@example.test") {
  await page.goto("/login?next=/question");
  await page.getByLabel("邮箱", { exact: true }).fill(email);
  await page.getByLabel("密码", { exact: true }).fill("test-password-only");
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page.getByRole("heading", { name: "输入问题" })).toBeVisible();
}
async function stats(page: Page) {
  return (await page.request.get("http://127.0.0.1:3102/mock/stats")).json();
}
function newReading(question?: string) {
  return { ...readingFixture(), readingId: randomUUID(), ...(question ? { question } : {}) };
}

test("cloud draw saves encrypted data, interprets once and restores its result and history", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  await login(page);
  await page.getByLabel("你的问题", { exact: true }).fill("如何推进现在的项目？");
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  const general = page.locator(".spread-card").filter({ has: page.getByRole("heading", { name: "通用牌阵", exact: true }) });
  await general.getByRole("button", { name: "通用牌阵", exact: true }).click();
  await general.getByRole("button", { name: "3，推荐", exact: true }).click();
  await page.getByRole("button", { name: "开始抽牌", exact: true }).click();
  await prepareDeck(page);
  await expect(page.locator("button.tarot-back")).toHaveCount(78);
  await expect(page.locator("button.tarot-back").first()).toBeEnabled();
  await drawFromTable(page, [0, 1, 2]);
  await page.getByRole("button", { name: "一起翻牌" }).click();
  await expect(page).toHaveURL(/\/result\/[0-9a-f-]+$/);
  const id = page.url().split("/").at(-1)!;
  await expect(page.getByRole("heading", { name: "抽牌结果", exact: true })).toBeVisible();
  const before = await stats(page);
  const stored = before.rows.find((row: { id: string }) => row.id === id);
  expect(stored.encrypted_payload).toBeTruthy();
  expect(JSON.stringify(stored)).not.toContain("如何推进现在的项目");
  await expect(page.getByRole("button", { name: "生成 AI 解读" })).toBeEnabled();
  await page.getByRole("button", { name: "生成 AI 解读" }).evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await expect(page.getByRole("button", { name: "已生成", exact: true })).toBeDisabled();
  await expect(page.getByText("测试综合总结：结合全部牌位与问题，先厘清可控的一步。", { exact: true })).toBeVisible();
  const after = await stats(page); expect(after.aiCalls).toBe(before.aiCalls + 1);
  expect(after.lastInput.cards.map((card: { positionContext: string }) => card.positionContext)).toEqual(["过去", "现在", "未来趋势"]);
  const response = await page.request.get(`/api/readings/${id}`);
  const saved = (await response.json()).reading;
  expect(saved.aiStatus).toBe("completed"); expect(saved.aiInterpretation.cards).toHaveLength(3);
  expect(saved.aiInterpretation.cards.map((card: { orientation: string }) => card.orientation))
    .toEqual(saved.selectedCards.map((card: { orientation: string }) => card.orientation));
  await page.reload(); await expect(page.getByRole("button", { name: "已生成", exact: true })).toBeDisabled();
  await page.getByRole("link", { name: "查看历史" }).click();
  await expect(page.getByText("如何推进现在的项目？", { exact: true })).toBeVisible();
  expect((await stats(page)).aiCalls).toBe(after.aiCalls); expect(errors).toEqual([]);
});

test("simultaneous AI requests claim one job, cache the result and preserve it on save retry", async ({ page }) => {
  await login(page);
  const reading = newReading();
  expect((await page.request.post("/api/readings", { data: { reading } })).status()).toBe(201);
  const before = await stats(page);
  const responses = await Promise.all([1, 2].map(() => page.request.post("/api/interpret", { data: { readingId: reading.readingId } })));
  expect(responses.map((response) => response.status()).sort()).toEqual([200, 409]);
  const cached = await page.request.post("/api/interpret", { data: { readingId: reading.readingId } });
  expect(cached.status()).toBe(200); expect((await cached.json()).cached).toBe(true);
  expect((await stats(page)).aiCalls).toBe(before.aiCalls + 1);
  expect((await page.request.post("/api/readings", { data: { reading } })).status()).toBe(200);
  const migratedRetry = { ...reading, selectedCards: reading.selectedCards.map((selected) => ({ ...selected, baseOrientation: selected.orientation, drawDirection: "up" })) };
  expect((await page.request.post("/api/readings", { data: { reading: migratedRetry } })).status()).toBe(200);
  expect((await (await page.request.get(`/api/readings/${reading.readingId}`)).json()).reading.aiStatus).toBe("completed");
  expect((await page.request.post("/api/readings", { data: { reading: { ...reading, question: "另一问题" } } })).status()).toBe(409);
  expect((await page.request.delete(`/api/readings/${reading.readingId}`)).status()).toBe(204);
  expect((await page.request.get(`/api/readings/${reading.readingId}`)).status()).toBe(404);
});

test("provider errors and malformed AI responses persist a failed state and allow retries", async ({ page }) => {
  await login(page);
  for (const question of ["模拟AI失败", "模拟错误响应"]) {
    const reading = newReading(question);
    expect((await page.request.post("/api/readings", { data: { reading } })).status()).toBe(201);
    const before = await stats(page);
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await page.request.post("/api/interpret", { data: { readingId: reading.readingId } });
      expect(result.status()).toBe(500);
      const stored = (await (await page.request.get(`/api/readings/${reading.readingId}`)).json()).reading;
      expect(stored.aiStatus).toBe("failed"); expect(stored.aiInterpretation).toBeUndefined();
    }
    expect((await stats(page)).aiCalls).toBe(before.aiCalls + 2);
    await page.goto(`/result/${reading.readingId}`);
    await page.getByRole("button", { name: "生成 AI 解读" }).click();
    await expect(page.getByRole("button", { name: "生成 AI 解读" })).toBeEnabled();
    await expect(page.locator("section").filter({ has: page.getByRole("heading", { name: "AI 解读", exact: true }) }))
      .toContainText(question === "模拟AI失败" ? "AI 服务请求失败" : "解读牌数不完整");
  }
});

test("authentication and whitelist restrictions apply while histories stay user scoped", async ({ page, browser, request }) => {
  const reading = newReading();
  expect((await request.get("/api/readings")).status()).toBe(401);
  expect((await request.post("/api/readings", { data: { reading } })).status()).toBe(401);
  expect((await request.post("/api/interpret", { data: { readingId: reading.readingId } })).status()).toBe(401);
  await login(page);
  expect((await page.request.post("/api/readings", { data: { reading } })).status()).toBe(201);
  const otherContext = await browser.newContext({ baseURL: "http://127.0.0.1:3101" }); const other = await otherContext.newPage();
  try {
    await login(other, "blocked@example.test");
    const ownReading = newReading();
    expect((await other.request.post("http://127.0.0.1:3101/api/readings", { data: { reading: ownReading } })).status()).toBe(201);
    expect((await other.request.post("http://127.0.0.1:3101/api/interpret", { data: { readingId: ownReading.readingId } })).status()).toBe(403);
    expect((await other.request.get(`http://127.0.0.1:3101/api/readings/${reading.readingId}`)).status()).toBe(404);
    expect((await other.request.delete(`http://127.0.0.1:3101/api/readings/${reading.readingId}`)).status()).toBe(204);
    expect((await page.request.get(`/api/readings/${reading.readingId}`)).status()).toBe(200);
    const listed = (await (await other.request.get("http://127.0.0.1:3101/api/readings")).json()).readings;
    expect(listed.map((entry: { readingId: string }) => entry.readingId)).toEqual([ownReading.readingId]);
  } finally { await otherContext.close(); }
});

test("anonymous users can save but cannot call AI", async ({ page }) => {
  await page.goto("/login"); await page.getByRole("button", { name: "跳过登录，作为访客体验" }).click();
  await expect(page.getByRole("heading", { name: "输入问题" })).toBeVisible();
  const reading = newReading();
  expect((await page.request.post("/api/readings", { data: { reading } })).status()).toBe(201);
  const before = await stats(page);
  expect((await page.request.post("/api/interpret", { data: { readingId: reading.readingId } })).status()).toBe(403);
  expect((await page.request.get(`/api/readings/${reading.readingId}`)).status()).toBe(200);
  expect((await stats(page)).aiCalls).toBe(before.aiCalls);
});
