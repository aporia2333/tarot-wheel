import { test, expect, type CDPSession, type Page } from "@playwright/test";
import { drawFromTable } from "../drawHelpers";

async function dragCard(page: Page, cdp: CDPSession | null, index: number, distance: number) {
  const card = page.getByRole("button", { name: `选择第 ${index + 1} 张牌`, exact: true });
  await expect(card).toBeEnabled();
  await card.focus();
  await card.evaluate(element => element.scrollIntoView({ block: "center", inline: "center" }));
  const rect = (await card.boundingBox())!;
  const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2;
  if (cdp) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, id: 1 }] });
    for (let step = 1; step <= 8; step++) await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove", touchPoints: [{ x, y: y + distance * step / 8, id: 1 }],
    });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  } else {
    await page.mouse.move(x, y); await page.mouse.down();
    await page.mouse.move(x, y + distance, { steps: 8 }); await page.mouse.up();
  }
  await expect(page.getByLabel("双排抽牌牌桌", { exact: true })).toHaveAttribute("aria-busy", "false");
}

test("preview supports both drag directions, free placement, redraw and reveals the selected cards", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => {
    sessionStorage.setItem("tarot_table_placement_v1", JSON.stringify({ boardKey: "actual-reading", cards: { saved: { x: .3, y: .4, layer: 1 } } }));
  });
  await page.goto("/design-preview?view=draw");
  const placementBefore = await page.evaluate(() => sessionStorage.getItem("tarot_table_placement_v1"));
  const cdp = testInfo.project.use.isMobile ? await page.context().newCDPSession(page) : null;
  await expect(page.getByRole("heading", { name: "让直觉停留在一张牌上" })).toBeVisible();
  await expect(page.getByText("向上或向下抽出，牌面会在最后一起展开。", { exact: true })).toHaveCount(0);
  await expect(page.locator("button.tarot-back")).toHaveCount(78);
  await expect(page.locator(".tarot-table img")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "一起翻牌" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "撤回上一张" })).toHaveCount(0);
  await page.getByRole("button", { name: "选择第 39 张牌", exact: true }).click();
  await expect(page.getByText("已抽 0 / 3 张", { exact: true })).toBeVisible();
  await dragCard(page, cdp, 38, 22);
  await expect(page.getByText("已抽 0 / 3 张", { exact: true })).toBeVisible();

  if (cdp) {
    const row = page.getByLabel("上排牌组", { exact: true }).locator(".fan-viewport");
    await row.scrollIntoViewIfNeeded();
    const box = (await row.boundingBox())!;
    const x = box.x + box.width - 32, y = box.y + box.height / 2;
    const before = await row.evaluate(element => element.scrollLeft);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, id: 1 }] });
    for (let step = 1; step <= 8; step++) await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove", touchPoints: [{ x: x + 160 * step / 8, y, id: 1 }],
    });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(() => row.evaluate(element => element.scrollLeft)).toBeLessThan(before);
    await expect(page.locator(".placed-card")).toHaveCount(0);
  }

  await dragCard(page, cdp, 38, -90);
  await expect(page.getByText("已抽 1 / 3 张", { exact: true })).toBeVisible();
  await expect(page.locator(".placed-card").first()).not.toHaveClass(/is-turned/);
  await dragCard(page, cdp, 77, 90);
  await expect(page.getByText("已抽 2 / 3 张", { exact: true })).toBeVisible();
  await expect(page.locator(".placed-card").nth(1)).toHaveClass(/is-turned/);
  await drawFromTable(page, [0]);
  await expect(page.getByText("已抽 3 / 3 张", { exact: true })).toBeVisible();
  await expect(page.locator(".tarot-table img")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "一起翻牌" })).toBeEnabled();

  const placed = page.locator(".placed-card").first();
  const left = (await placed.boundingBox())!.x;
  await placed.press("ArrowLeft");
  expect((await placed.boundingBox())!.x).toBeCloseTo(left - 8, 0);
  expect(await page.locator(".drawn-placement").evaluate(element => {
    const bounds = element.getBoundingClientRect();
    return Array.from(element.querySelectorAll(".placed-card")).every(card => {
      const rect = card.getBoundingClientRect();
      return rect.left >= bounds.left && rect.top >= bounds.top && rect.right <= bounds.right && rect.bottom <= bounds.bottom;
    });
  })).toBe(true);
  expect(await page.evaluate(() => sessionStorage.getItem("tarot_table_placement_v1"))).toBe(placementBefore);

  await page.getByRole("button", { name: "一起翻牌" }).click();
  await expect(page).toHaveURL(/view=result$/);
  const firstCards = await page.locator(".vision-revealed-cards img").evaluateAll(images => images.map(image => ({
    src: image.getAttribute("src"), alt: image.getAttribute("alt"), transform: (image as HTMLElement).style.transform,
  })));
  expect(new Set(firstCards.map(card => card.src)).size).toBe(3);
  await page.getByRole("button", { name: "开始新的阅读" }).click();
  await expect(page.getByText("已抽 0 / 3 张", { exact: true })).toBeVisible();
  await dragCard(page, cdp, 38, 90);
  await dragCard(page, cdp, 77, -90);
  await drawFromTable(page, [0]);
  await page.getByRole("button", { name: "一起翻牌" }).click();
  const reversedCards = await page.locator(".vision-revealed-cards img").evaluateAll(images => images.map(image => ({
    src: image.getAttribute("src"), alt: image.getAttribute("alt"), transform: (image as HTMLElement).style.transform,
  })));
  for (let index = 0; index < 3; index++) {
    expect(reversedCards[index].src).toBe(firstCards[index].src);
    if (index < 2) {
      expect(reversedCards[index].alt).not.toBe(firstCards[index].alt);
      expect(reversedCards[index].transform).not.toBe(firstCards[index].transform);
    } else expect(reversedCards[index]).toEqual(firstCards[index]);
  }
  await page.getByRole("button", { name: "开始新的阅读" }).click();
  await drawFromTable(page, [38], "down");
  await page.getByRole("button", { name: "全部重抽" }).click();
  await expect(page.locator(".placed-card")).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem("tarot_preview_placement_v1")!).cards)).toEqual({});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  await cdp?.detach();
});
