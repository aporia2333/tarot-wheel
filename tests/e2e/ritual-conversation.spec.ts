import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";

test("opening conversation keeps the draft while dealer replies stay in one dialogue", async ({ page }, testInfo) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator(".conversation-dialogue")).toContainText("今晚，你想问些什么？");
  await expect(page.locator(".dealer-dialogue")).toHaveCount(1);
  await page.getByLabel("你的问题", { exact: true }).fill("如何安排接下来的创作？");
  await page.getByRole("button", { name: "与星月交谈", exact: true }).click();
  await expect(page.locator(".conversation-line")).toHaveText("不急，把此刻想到的写下来就好。");
  await expect(page.getByLabel("你的问题", { exact: true })).toHaveValue("如何安排接下来的创作？");
  await page.getByRole("button", { name: "与星月交谈", exact: true }).press("Enter");
  await expect(page.locator(".conversation-line")).toContainText("一个选择");
  await page.getByText("补充背景", { exact: true }).click();
  await page.getByLabel("Context / 背景信息", { exact: true }).fill("先整理现有想法。");
  await page.reload();
  await expect(page.getByLabel("你的问题", { exact: true })).toHaveValue("如何安排接下来的创作？");
  await expect(page.getByLabel("Context / 背景信息", { exact: true })).toHaveValue("先整理现有想法。");
  await mkdir("output/design", { recursive: true });
  await page.screenshot({ path: `output/design/xingyue-conversation-${testInfo.project.name}.png`, fullPage: true });
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await expect(page.locator(".spread-book")).toHaveAttribute("data-book-state", "open");
  const state = await page.evaluate(() => JSON.parse(sessionStorage.getItem("tarot_reading_flow_v1")!).state);
  expect(state.question).toBe("如何安排接下来的创作？");
  expect(state.contextInfo).toBe("先整理现有想法。");
  expect(errors).toEqual([]);
});

test("book opening and page turns gate selection and retain reading state", async ({ page }, testInfo) => {
  const time = new Date("2026-10-11T12:00:00Z");
  await page.clock.install({ time }); await page.clock.pauseAt(time);
  await page.goto("/spreads");
  const book = page.locator(".spread-book");
  await expect(book).toHaveAttribute("data-book-state", "opening");
  await expect(page.getByRole("button", { name: "通用牌阵", exact: true })).toBeDisabled();
  await page.clock.runFor(700);
  await expect(book).toHaveAttribute("data-book-state", "open");
  await expect(page.locator(".spread-card")).toHaveCount(8);
  await page.getByRole("button", { name: "通用牌阵", exact: true }).click();
  const before = await page.evaluate(() => JSON.parse(sessionStorage.getItem("tarot_reading_flow_v1")!).state);
  await page.getByRole("button", { name: "下一页", exact: true }).click();
  await expect(book).toHaveAttribute("data-book-state", "turning");
  await expect(page.getByRole("button", { name: "开始抽牌", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "前往第 2 页", exact: true }).evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await page.clock.runFor(700);
  await expect(book).toHaveAttribute("data-book-page", "2");
  await expect(book).toHaveAttribute("data-book-state", "open");
  await expect(page.getByRole("button", { name: "二选一", exact: true })).toBeVisible();
  await expect(page.locator(".spread-card")).toHaveCount(8);
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem("tarot_reading_flow_v1")!).state)).toEqual(before);
  await page.getByRole("button", { name: "二选一", exact: true }).click();
  await page.screenshot({ path: `output/design/xingyue-spread-book-${testInfo.project.name}.png`, fullPage: true });
  await page.getByRole("button", { name: "上一页", exact: true }).click(); await page.clock.runFor(700);
  await expect(book).toHaveAttribute("data-book-page", "1");
  await page.getByRole("button", { name: "下一页", exact: true }).click(); await page.clock.runFor(700);
  await expect(page.getByRole("button", { name: "二选一", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.clock.resume();
  await page.getByRole("button", { name: "开始抽牌", exact: true }).click();
  await expect(page).toHaveURL(/\/shuffle$/);
});

test("reduced motion and narrow books keep all spreads and custom editing reachable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [320, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 }); await page.goto("/spreads");
    await expect(page.locator(".spread-book")).toHaveAttribute("data-book-state", "open");
    await page.getByRole("button", { name: "下一页", exact: true }).click();
    await expect(page.getByRole("button", { name: "二选一", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.locator("#custom-spread-open").click();
    await expect(page.locator(".custom-spread-editor")).toBeVisible();
    await expect(page.getByRole("button", { name: "开始抽牌", exact: true })).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("button", { name: "取消编辑", exact: true }).click();
  }
});
