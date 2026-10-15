import { test, expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";

async function openBook(page: Page) {
  await page.goto("/spreads");
  await expect(page.locator(".spread-book")).toHaveAttribute("data-book-state", "open");
}
async function state(page: Page) {
  return page.evaluate(() => JSON.parse(sessionStorage.getItem("tarot_reading_flow_v1")!).state);
}
async function tooltipIsSafe(page: Page) {
  const geometry = await page.getByRole("tooltip").evaluate(element => {
    const rect = element.getBoundingClientRect();
    const controls = [...document.querySelectorAll("#start-reading,#custom-spread-open,.spread-pagination,.site-header")].map(node => node.getBoundingClientRect());
    return { outsideBook: !element.closest(".spread-book"), fixed: getComputedStyle(element).position === "fixed",
      inViewport: rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight,
      overlapsControl: controls.some(other => rect.left < other.right && rect.right > other.left && rect.top < other.bottom && rect.bottom > other.top) };
  });
  expect(geometry).toEqual({ outsideBook: true, fixed: true, inViewport: true, overlapsControl: false });
}

test("parchment catalogue shows counts, selects one spread and never reflows for descriptions", async ({ page }, info) => {
  await openBook(page);
  const book = page.locator(".spread-book"), entries = book.locator(".spread-card");
  await expect(entries).toHaveCount(8);
  await expect(book.locator(".spread-miniature")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "开始抽牌", exact: true })).toBeDisabled();
  const general = entries.filter({ has: page.getByRole("heading", { name: "通用牌阵", exact: true }) });
  await expect(general.locator(".spread-count-button")).toHaveCount(4);
  const before = await entries.evaluateAll(nodes => nodes.map(node => {
    const r = node.getBoundingClientRect(); return [r.x, r.y, r.width, r.height];
  }));
  if (info.project.name === "desktop") await general.hover();
  else await general.getByRole("button", { name: "通用牌阵", exact: true }).tap();
  await expect(page.getByRole("tooltip")).toContainText("从不同角度梳理当下问题");
  await tooltipIsSafe(page);
  await general.getByRole("button", { name: "5", exact: true }).click();
  await expect(general.getByRole("button", { name: "通用牌阵", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect((await state(page)).selectedSpread.count).toBe(5);
  await expect(page.getByRole("button", { name: "开始抽牌", exact: true })).toBeEnabled();
  expect(await entries.evaluateAll(nodes => nodes.map(node => {
    const r = node.getBoundingClientRect(); return [r.x, r.y, r.width, r.height];
  }))).toEqual(before);
  await page.keyboard.press("Escape"); await expect(page.getByRole("tooltip")).toHaveCount(0);
  const career = entries.filter({ has: page.getByRole("heading", { name: "事业牌阵", exact: true }) });
  await career.getByRole("button", { name: "7", exact: true }).press("Enter");
  expect((await state(page)).selectedSpread).toMatchObject({ id: "career", count: 7 });
  await expect(book.locator(".spread-choice[aria-pressed='true']")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await mkdir("output/design", { recursive: true });
  await page.screenshot({ path: `output/design/xingyue-book-refined-${info.project.name}.png`, fullPage: true });
});

test("paper turns carry real printed faces, reject rapid clicks, retain selection and restore focus", async ({ page }, info) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  const time = new Date("2026-10-12T12:00:00Z");
  await page.clock.install({ time }); await page.clock.pauseAt(time);
  await page.goto("/spreads"); await page.clock.runFor(700);
  const book = page.locator(".spread-book");
  await page.getByRole("button", { name: "通用牌阵", exact: true }).click();
  await page.keyboard.press("Escape");
  const before = await state(page);
  const next = page.getByRole("button", { name: "下一页", exact: true });
  await next.focus(); await next.press("Enter");
  await expect(book).toHaveAttribute("data-book-state", "turning");
  await expect(page.getByRole("button", { name: "开始抽牌", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "前往第 2 页", exact: true }).evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  if (await book.getAttribute("data-book-motion") === "full") {
    const paper = book.locator(".book-turning-leaf");
    await expect(paper.locator("button,[id]")).toHaveCount(0);
    await expect(paper.locator(".book-turn-face").first()).toContainText("事业牌阵");
    await expect(paper.locator(".book-turn-back").first()).toContainText("是非牌阵");
    for (const [name, progress] of [["front", .18], ["bend", .42], ["back", .72]] as const) {
      await book.evaluate((element, progress) => {
        element.getAnimations({ subtree: true }).filter(animation => "animationName" in animation && String(animation.animationName).startsWith("book-"))
          .forEach(animation => { animation.pause(); animation.currentTime = 680 * progress; });
      }, progress);
      await page.screenshot({ path: `output/design/xingyue-book-turn-${name}-${info.project.name}.png`, fullPage: true });
    }
  }
  await page.clock.runFor(700);
  await expect(book).toHaveAttribute("data-book-page", "2");
  await expect(book).toHaveAttribute("data-book-state", "open");
  await expect(page.getByRole("button", { name: "前往第 2 页", exact: true })).toBeFocused();
  expect(await state(page)).toEqual(before);
  await expect(book.locator(".spread-card")).toHaveCount(8);
  await page.getByRole("button", { name: "上一页", exact: true }).click(); await page.clock.runFor(700);
  await expect(page.getByRole("button", { name: "通用牌阵", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect(await state(page)).toEqual(before);
  expect(errors).toEqual([]);
});

test("book typography and description overlays fit large displays, tablets and narrow phones", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const [width, height] of [[2560, 1440], [1920, 1080], [1440, 900], [1280, 720], [768, 1024], [390, 844], [320, 900]]) {
    await page.setViewportSize({ width, height }); await openBook(page);
    const book = page.locator(".spread-book");
    await expect(book.locator(".spread-card")).toHaveCount(8);
    expect((await page.locator(".spread-book-room .ritual-stage").boundingBox())!.height).toBeLessThanOrEqual(520);
    const layout = await book.locator(".book-spread-list > .book-leaf").evaluateAll(leaves => leaves.map(leaf => {
      const bounds = leaf.getBoundingClientRect();
      return [...leaf.querySelectorAll(".spread-title,.spread-count-button")].every(node => {
        const rect = node.getBoundingClientRect(); return rect.left >= bounds.left && rect.right <= bounds.right + 1;
      });
    }));
    expect(layout).toEqual([true, true]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const title = page.getByRole("button", { name: "通用牌阵", exact: true });
    await title.focus(); await expect(page.getByRole("tooltip")).toBeVisible(); await tooltipIsSafe(page);
    await page.keyboard.press("Escape");
    if (width > 900) {
      const rows = await book.locator(".spread-card").evaluateAll(entries => new Set(entries.map(node => Math.round(node.getBoundingClientRect().top))).size);
      expect(rows).toBe(2);
      expect((await book.boundingBox())!.y + (await book.boundingBox())!.height).toBeLessThanOrEqual(height);
    }
    await page.getByRole("button", { name: "下一页", exact: true }).click();
    await expect(page.getByRole("button", { name: "二选一", exact: true })).toBeVisible();
    await expect(book.locator(".spread-card")).toHaveCount(8);
    if ([1440, 390].includes(width)) await page.screenshot({ path: `output/design/xingyue-book-page-two-${width}-${info.project.name}.png`, fullPage: true });
  }
});

test("constrained devices use a short transition and reduced motion never mounts 3D paper", async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(navigator, "hardwareConcurrency", { configurable: true, value: 2 }); });
  await openBook(page);
  await expect(page.locator(".spread-book")).toHaveAttribute("data-book-motion", "simple");
  await page.getByRole("button", { name: "下一页", exact: true }).click();
  await expect(page.locator(".book-turning-leaf")).toHaveCount(0);
  await expect(page.locator(".spread-book")).toHaveAttribute("data-book-page", "2");
  await page.emulateMedia({ reducedMotion: "reduce" }); await page.reload();
  await expect(page.locator(".spread-book")).toHaveAttribute("data-book-motion", "reduced");
  await page.getByRole("button", { name: "下一页", exact: true }).click();
  await expect(page.locator(".book-turning-leaf")).toHaveCount(0);
  await expect(page.locator(".spread-book")).toHaveAttribute("data-book-state", "open");
});
