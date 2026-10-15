import { randomUUID } from "node:crypto";
import { drawFromTable } from "../drawHelpers";
import { prepareDeck } from "../preparationHelpers";
import { test, expect, type Page } from "@playwright/test";
import { readingFixture } from "../fixtures";

async function anonymousUsers(page: Page) {
  return (await (await page.request.get("http://127.0.0.1:3102/mock/stats")).json()).anonymousUsers;
}

test("guest entry survives repeated clicks, draws, refreshes and returns to the same history", async ({ page }) => {
  await page.goto("/");
  const before = await anonymousUsers(page);
  await page.getByRole("button", { name: "跳过登录，作为访客体验" }).evaluate((button: HTMLButtonElement) => { button.click(); button.click(); button.click(); });
  await expect(page.getByRole("heading", { name: "输入问题", exact: true })).toBeVisible();
  expect(await anonymousUsers(page)).toBe(before + 1);
  await page.getByLabel("你的问题", { exact: true }).fill("访客完整阅读测试");
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
  await page.reload();
  await expect(page.getByRole("heading", { name: "抽牌结果", exact: true })).toBeVisible();
  await page.goto("/");
  await page.getByRole("button", { name: "跳过登录，作为访客体验" }).click();
  await expect(page).toHaveURL(/\/question$/);
  expect(await anonymousUsers(page)).toBe(before + 1);
  expect((await page.request.get(`/api/readings/${id}`)).status()).toBe(200);
  await page.goto("/history");
  await expect(page.getByText("访客完整阅读测试", { exact: true })).toBeVisible();
});

test("guest login returns to a protected result and preserves its existing identity", async ({ page }) => {
  await page.goto("/login?next=/history");
  await page.getByRole("button", { name: "跳过登录，作为访客体验" }).click();
  await expect(page.getByRole("heading", { name: "历史记录", exact: true })).toBeVisible();
  const reading = { ...readingFixture(), readingId: randomUUID() };
  expect((await page.request.post("/api/readings", { data: { reading } })).status()).toBe(201);
  const before = await anonymousUsers(page);
  await page.goto(`/login?next=${encodeURIComponent(`/result/${reading.readingId}`)}`);
  await page.getByRole("button", { name: "跳过登录，作为访客体验" }).click();
  await expect(page).toHaveURL(new RegExp(`/result/${reading.readingId}$`));
  await expect(page.getByRole("heading", { name: "抽牌结果", exact: true })).toBeVisible();
  expect(await anonymousUsers(page)).toBe(before);
});

test("an authenticated member using guest entry keeps their account and AI permission", async ({ page }) => {
  await page.goto("/login?next=/question");
  await page.getByLabel("邮箱", { exact: true }).fill("allowed@example.test");
  await page.getByLabel("密码", { exact: true }).fill("test-password-only");
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page.getByRole("heading", { name: "输入问题", exact: true })).toBeVisible();
  const reading = { ...readingFixture(), readingId: randomUUID() };
  expect((await page.request.post("/api/readings", { data: { reading } })).status()).toBe(201);
  const before = await anonymousUsers(page);
  await page.goto("/");
  await page.getByRole("button", { name: "跳过登录，作为访客体验" }).click();
  await expect(page).toHaveURL(/\/question$/);
  expect(await anonymousUsers(page)).toBe(before);
  expect((await page.request.get(`/api/readings/${reading.readingId}`)).status()).toBe(200);
  expect((await page.request.post("/api/interpret", { data: { readingId: reading.readingId } })).status()).toBe(200);
});

test("guest errors are classified, release the button and permit retry", async ({ page }) => {
  let failure: { code: string; msg: string; status: number } | null = { code: "anonymous_provider_disabled", msg: "Anonymous sign-ins are disabled", status: 422 };
  await page.route("http://127.0.0.1:3102/auth/v1/signup*", async (route) => {
    if (!failure) return route.continue();
    await route.fulfill({ status: failure.status, contentType: "application/json", body: JSON.stringify({ code: failure.code, msg: failure.msg }) });
  });
  await page.goto("/login?next=/history");
  const button = page.getByRole("button", { name: "跳过登录，作为访客体验" });
  await button.click();
  await expect(page.locator(".auth-guest").getByRole("alert")).toContainText("访客模式暂未开放");
  await expect(button).toBeEnabled();
  failure = { code: "over_request_rate_limit", msg: "Rate limit exceeded", status: 429 };
  await button.click();
  await expect(page.locator(".auth-guest").getByRole("alert")).toContainText("请求过于频繁");
  await expect(button).toBeEnabled();
  failure = null;
  await button.click();
  await expect(page.getByRole("heading", { name: "历史记录", exact: true })).toBeVisible();
});
