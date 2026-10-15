import { test, expect } from "@playwright/test";

test.use({ video: { mode: process.env.RECORD_BOOK_REVIEW === "1" ? "on" : "off", size: { width: 1440, height: 900 } } });
test("book real-time opening, printed turns and final selection reach the original preparation room", async ({ page, context }, info) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  if (info.project.name === "desktop") await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/spreads");
  const book = page.locator(".spread-book");
  await expect(book).toHaveAttribute("data-book-state", "open");
  await expect(page.locator(".preparation-scene")).toHaveAttribute("data-asset-state", "loaded");
  const general = page.locator(".spread-card[data-spread-id='general']");
  await general.getByRole("button", { name: "通用牌阵", exact: true }).click();
  await expect(page.getByRole("tooltip")).toBeVisible();
  await general.getByRole("button", { name: "5", exact: true }).click();
  await page.keyboard.press("Escape"); await page.mouse.move(0, 0);
  await page.getByRole("button", { name: "下一页", exact: true }).click();
  await expect(book).toHaveAttribute("data-book-page", "2");
  await expect(book).toHaveAttribute("data-book-state", "open");
  await page.getByRole("button", { name: "上一页", exact: true }).click();
  await expect(book).toHaveAttribute("data-book-page", "1");
  await expect(book).toHaveAttribute("data-book-state", "open");
  await expect(general.getByRole("button", { name: "通用牌阵", exact: true })).toHaveAttribute("aria-pressed", "true");
  // Reset the scroll origin before a full-page capture; Chromium otherwise
  // composites offscreen fixed layers at their previous scrolled position.
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await page.screenshot({ path: `output/design/xingyue-book-final-${info.project.name}.png`, fullPage: true });
  await page.getByRole("button", { name: "开始抽牌", exact: true }).click();
  await expect(page).toHaveURL(/\/shuffle$/);
  await expect(page.getByRole("button", { name: "我来决定", exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  const video = page.video(); await context.close();
  await video?.saveAs(`output/design/xingyue-book-refined-${info.project.name}.webm`);
});
