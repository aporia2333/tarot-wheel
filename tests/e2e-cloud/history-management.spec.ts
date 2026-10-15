import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { readingFixture } from "../fixtures";
async function login(page: Page, email: string) {
  await page.goto("/login?next=/question");
  await page.getByLabel("邮箱", { exact: true }).fill(email); await page.getByLabel("密码", { exact: true }).fill("test-password-only");
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page.getByRole("heading", { name: "输入问题", exact: true })).toBeVisible();
}
test("cloud history clearing is authenticated, owner-scoped, atomic and includes rows beyond the list limit", async ({ page, browser }) => {
  test.setTimeout(180_000);
  expect((await page.request.delete("/api/readings")).status()).toBe(401);
  const otherContext = await browser.newContext(); const other = await otherContext.newPage();
  await login(page, `history-owner-${randomUUID()}@example.test`); await login(other, `history-other-${randomUUID()}@example.test`);
  const otherReading = { ...readingFixture(), readingId: randomUUID(), question: "另一个测试账号的阅读" };
  expect((await other.request.post("/api/readings", { data: { reading: otherReading } })).status()).toBe(201);
  const ids: string[] = [];
  for (let start = 0; start < 102; start += 12) {
    const responses = await Promise.all(Array.from({ length: Math.min(12, 102 - start) }, (_, index) => {
      const reading = { ...readingFixture(), readingId: randomUUID(), question: `清空测试 ${start + index}` }; ids.push(reading.readingId);
      return page.request.post("/api/readings", { data: { reading } });
    }));
    expect(responses.every(response => response.status() === 201)).toBe(true);
  }
  expect((await page.request.delete(`/api/readings/${otherReading.readingId}`)).status()).toBe(204);
  expect((await other.request.get(`/api/readings/${otherReading.readingId}`)).status()).toBe(200);
  expect((await page.request.delete(`/api/readings/${ids[0]}`)).status()).toBe(204);
  await page.goto("/history"); await expect(page.locator(".history-entry")).toHaveCount(100);
  await page.getByRole("button", { name: "清空历史", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("包括在其他设备保存的记录");
  await page.getByRole("button", { name: "取消", exact: true }).click();
  let fail = true;
  await page.route("**/api/readings", route => route.request().method() === "DELETE" && fail
    ? route.fulfill({ status: 503, json: { message: "测试删除暂时不可用" } }) : route.continue());
  await page.getByRole("button", { name: "清空历史", exact: true }).click();
  await page.getByRole("button", { name: "确认清空", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("暂时不可用"); await expect(page.locator(".history-entry")).toHaveCount(100);
  fail = false; await page.getByRole("button", { name: "确认清空", exact: true }).click();
  await expect(page.getByRole("heading", { name: "暂无抽牌记录", exact: true })).toBeVisible();
  const statistics = await (await page.request.get("http://127.0.0.1:3102/mock/stats")).json();
  expect(statistics.rows.filter((row: { id: string }) => ids.includes(row.id))).toHaveLength(0);
  expect((await other.request.get(`/api/readings/${otherReading.readingId}`)).status()).toBe(200);
  await otherContext.close();
});
