import { randomUUID } from "node:crypto";
import { drawFromTable } from "../drawHelpers";
import { prepareDeck } from "../preparationHelpers";
import { test, expect, type Page } from "@playwright/test";
import { customReadingFixture, readingFixture } from "../fixtures";

async function login(page: Page) {
  await page.goto("/login?next=/spreads"); await page.getByLabel("邮箱", { exact: true }).fill("allowed@example.test");
  await page.getByLabel("密码", { exact: true }).fill("test-password-only"); await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page.getByRole("heading", { name: "选择你的牌阵", exact: true })).toBeVisible();
}
test("cloud custom reading saves ordered meanings and sends them to both interpretation and follow-up", async ({ page }) => {
  await login(page); const fixture = customReadingFixture();
  await page.getByRole("button", { name: "自定义牌阵", exact: true }).click();
  await page.getByLabel("牌阵名称", { exact: true }).fill(fixture.spread.name); await page.getByLabel("抽牌数量", { exact: true }).selectOption("4");
  for (let index = 0; index < 4; index++) {
    await page.getByLabel(`牌位 ${index + 1} 名称`, { exact: true }).fill(fixture.spread.positions[index]);
    await page.getByLabel(`牌位 ${index + 1} 含义`, { exact: false }).fill(fixture.spread.positionMeanings![index]);
  }
  await page.getByRole("button", { name: "使用此牌阵", exact: true }).click();
  await page.getByRole("button", { name: "开始抽牌", exact: true }).click(); await prepareDeck(page);
  await expect(page.locator("button.tarot-back").first()).toBeEnabled();
  await drawFromTable(page, [0, 1, 2, 3]);
  await page.getByRole("button", { name: "一起翻牌", exact: true }).click();
  await expect(page.getByRole("heading", { name: "抽牌结果", exact: true })).toBeVisible();
  const id = page.url().split("/").at(-1)!;
  const saved = (await (await page.request.get(`/api/readings/${id}`)).json()).reading;
  expect(saved.spread.positionMeanings).toEqual(fixture.spread.positionMeanings);
  await page.getByRole("button", { name: "生成 AI 解读", exact: true }).click(); await expect(page.getByRole("button", { name: "已生成", exact: true })).toBeDisabled();
  const stats = (await (await page.request.get("http://127.0.0.1:3102/mock/stats")).json());
  expect(stats.lastInput.cards.map((card: { positionMeaning: string }) => card.positionMeaning)).toEqual(fixture.spread.positionMeanings);
  expect(stats.lastInput.cards.map((card: { positionContext: string }) => card.positionContext)).toEqual(fixture.spread.positions);
  await page.getByLabel("想进一步理解什么？", { exact: true }).fill("现实限制与可用资源可以怎样一起理解？");
  await page.getByRole("button", { name: "发送追问", exact: true }).click(); await expect(page.locator(".follow-up-conversation article")).toHaveCount(1);
  const after = (await (await page.request.get("http://127.0.0.1:3102/mock/stats")).json());
  expect(after.lastFollowUpInput.cards).toEqual(stats.lastInput.cards);
  await page.reload(); await expect(page.locator(".follow-up-conversation article")).toHaveCount(1);
  await page.getByRole("link", { name: "查看历史", exact: true }).click(); await expect(page.getByRole("heading", { name: fixture.spread.name, exact: true })).toBeVisible();
});

test("custom save API enforces boundaries and retains legacy three-card data and completed reads on retries", async ({ page }) => {
  await login(page);
  for (const count of [1, 13]) {
    const reading = { ...customReadingFixture(count), readingId: randomUUID() };
    expect((await page.request.post("/api/readings", { data: { reading } })).status()).toBe(201);
    const saved = (await (await page.request.get(`/api/readings/${reading.readingId}`)).json()).reading;
    expect(saved.spread).toEqual(reading.spread); expect(saved.selectedCards.map((card: { position: string }) => card.position)).toEqual(reading.spread.positions);
    expect((await page.request.post("/api/readings", { data: { reading } })).status()).toBe(200);
    expect((await page.request.post("/api/readings", { data: { reading: { ...reading, spread: { ...reading.spread, name: "不同定义" } } } })).status()).toBe(409);
  }
  const reading = { ...customReadingFixture(), readingId: randomUUID() };
  for (const spread of [{ ...reading.spread, count: 14 }, { ...reading.spread, count: 0 }, { ...reading.spread, name: " " },
    { ...reading.spread, positions: ["重复", "重复", "资源", "行动"] }, { ...reading.spread, positionMeanings: ["缺失"] }]) {
    expect((await page.request.post("/api/readings", { data: { reading: { ...reading, spread } } })).status()).toBe(400);
  }
  const legacy = { ...readingFixture(3, "custom"), readingId: randomUUID() };
  expect((await page.request.post("/api/readings", { data: { reading: legacy } })).status()).toBe(201);
  expect((await page.request.post("/api/interpret", { data: { readingId: legacy.readingId } })).status()).toBe(200);
  expect((await page.request.post("/api/readings", { data: { reading: legacy } })).status()).toBe(200);
  expect((await (await page.request.get(`/api/readings/${legacy.readingId}`)).json()).reading.aiStatus).toBe("completed");
});
