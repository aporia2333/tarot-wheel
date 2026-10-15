import { test, expect, type Page } from "@playwright/test";
import { drawFromTable } from "../drawHelpers";
import { prepareDeck } from "../preparationHelpers";

async function flowState(page: Page) {
  return page.evaluate(() => JSON.parse(sessionStorage.getItem("tarot_reading_flow_v1")!).state);
}
async function startReading(page: Page, name = "通用牌阵", count = "3，推荐") {
  await page.goto("/question");
  await expect(page.getByRole("heading", { name: "输入问题" })).toBeVisible();
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  const card = page.locator(".spread-card").filter({ has: page.getByRole("heading", { name, exact: true }) });
  await card.getByRole("button", { name, exact: true }).click();
  await card.getByRole("button", { name: count, exact: true }).click();
  await page.getByRole("button", { name: "开始抽牌", exact: true }).click();
  await prepareDeck(page);
}

test("complete reading survives reloads, redraw and rapid clicks, saves once and resets", async ({ page }, testInfo) => {
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const account = page.locator(".site-header summary").filter({ hasText: "账号" });
  await account.click(); await expect(page.getByText("本地体验模式")).toBeVisible();
  await account.press("Escape");
  await expect(page.getByRole("button", { name: "与星月交谈", exact: true })).toBeVisible();
  await page.getByLabel("你的问题", { exact: true }).fill("如何推进现在的项目？");
  await page.getByText("补充背景", { exact: true }).click();
  await page.getByLabel("Context / 背景信息", { exact: true }).fill("正在计划下一阶段。");
  await page.reload();
  await expect(page.getByLabel("你的问题", { exact: true })).toHaveValue("如何推进现在的项目？");
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  const general = page.locator(".spread-card").filter({ has: page.getByRole("heading", { name: "通用牌阵", exact: true }) });
  await general.getByRole("button", { name: "通用牌阵", exact: true }).click();
  await general.getByRole("button", { name: "3，推荐", exact: true }).click();
  await page.getByRole("button", { name: "开始抽牌", exact: true }).click();
  await page.getByRole("button", { name: "我来决定", exact: true }).click();
  await page.getByRole("button", { name: "开始洗牌", exact: true }).evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await expect(page.getByRole("heading", { name: "水晶正在为你切牌" })).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".preparation-scene")).toHaveAttribute("data-action", /double|triple|free/);
  const shuffled = await flowState(page); expect(shuffled.shuffleCount).toBe(1);
  expect(Object.keys(shuffled.baseOrientationByCardId)).toHaveLength(78);
  await page.reload(); expect((await flowState(page)).shuffledDeck.map((card: { id: string }) => card.id)).toEqual(shuffled.shuffledDeck.map((card: { id: string }) => card.id));
  expect((await flowState(page)).preparation.pending).toEqual(shuffled.preparation.pending);
  await expect(page.getByRole("button", { name: "开始切牌", exact: true })).toHaveCount(0);
  await expect(page).toHaveURL(/\/draw$/, { timeout: 15_000 });
  const cut = await flowState(page); expect(cut.cutCount).toBe(1); expect(cut.shuffledDeck).not.toEqual(shuffled.shuffledDeck);
  expect(cut.baseOrientationByCardId).toEqual(shuffled.baseOrientationByCardId);
  await page.reload(); expect((await flowState(page)).cutCount).toBe(1);
  const wheel = page.locator("button.tarot-back"); await expect(wheel).toHaveCount(78);
  await expect(page.getByLabel("上排牌组", { exact: true }).locator("button.tarot-back")).toHaveCount(39);
  await expect(page.getByLabel("下排牌组", { exact: true }).locator("button.tarot-back")).toHaveCount(39);
  await expect(wheel.last()).toHaveCSS("opacity", "1");
  await page.screenshot({ path: `output/playwright/directional-table-${testInfo.project.name}.png`, fullPage: true });
  await drawFromTable(page, [0, 1, 2]);
  await expect(page.locator(".drawn-placement .placed-card")).toHaveCount(3);
  await expect(page.locator(".tarot-table img")).toHaveCount(0);
  await expect(page.getByText("已抽 3 / 3 张", { exact: true })).toBeVisible();
  const selected = (await flowState(page)).selectedCards;
  expect(new Set(selected.map((card: { card: { id: string } }) => card.card.id)).size).toBe(3);
  expect(selected.map((card: { position: string }) => card.position)).toEqual(["过去", "现在", "未来趋势"]);
  await page.reload(); await expect(page.getByText("已抽 3 / 3 张", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "全部重抽" }).click();
  await expect(page.getByText("已抽 0 / 3 张", { exact: true })).toBeVisible();
  expect((await flowState(page)).baseOrientationByCardId).toEqual(cut.baseOrientationByCardId);
  await drawFromTable(page, [0, 1, 2]);
  expect((await flowState(page)).selectedCards).toEqual(selected);
  await page.getByRole("button", { name: "一起翻牌" }).evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await expect(page).toHaveURL(/\/result\/[0-9a-f-]+$/); const resultUrl = page.url();
  await expect(page.getByRole("heading", { name: "抽牌结果", exact: true })).toBeVisible();
  await expect(page.locator(".reading-cards")).toHaveClass(/is-revealing/);
  await expect(page.getByRole("button", { name: "生成 AI 解读" })).toBeDisabled();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("tarot_readings_v1")!).length)).toBe(1);
  await page.reload(); await expect(page.getByRole("heading", { name: "抽牌结果", exact: true })).toBeVisible();
  await expect(page.locator(".reading-cards")).not.toHaveClass(/is-revealing/);
  await expect(page.locator("img")).toHaveCount(3);
  await page.getByRole("link", { name: "查看历史" }).click();
  await expect(page.getByText("如何推进现在的项目？", { exact: true })).toBeVisible();
  await page.goto(resultUrl); await page.getByRole("button", { name: "重新抽牌" }).click();
  await expect(page).toHaveURL(/\/question$/);
  expect((await flowState(page)).selectedCards).toEqual([]); expect((await flowState(page)).baseOrientationByCardId).toEqual({});
  expect((await flowState(page)).readingId).toBeNull(); expect(errors).toEqual([]);
});

test("vertical drag draws from either row, short drags return, and reverse extraction survives an interrupted animation", async ({ page }, testInfo) => {
  await startReading(page);
  const initial = await flowState(page);
  const touch = Boolean(testInfo.project.use.isMobile);
  const cdp = touch ? await page.context().newCDPSession(page) : null;
  if (cdp) {
    const row = page.getByLabel("上排牌组", { exact: true }).locator(".fan-viewport");
    await row.scrollIntoViewIfNeeded();
    const box = (await row.boundingBox())!;
    const x = box.x + box.width - 32; const y = box.y + box.height / 2;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, id: 1 }] });
    for (let step = 1; step <= 8; step++) await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove", touchPoints: [{ x: x - 160 * step / 8, y, id: 1 }],
    });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(() => row.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    expect((await flowState(page)).selectedCards).toHaveLength(0);
  }
  async function drag(index: number, distance: number) {
    const card = page.getByRole("button", { name: `选择第 ${index + 1} 张牌`, exact: true });
    await expect(card).toBeEnabled();
    await card.focus();
    await card.evaluate((element) => element.scrollIntoView({ block: "center", inline: "center" }));
    const rect = (await card.boundingBox())!;
    const x = rect.x + rect.width / 2; const y = rect.y + rect.height / 2;
    if (cdp) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, id: 1 }] });
      for (let step = 1; step <= 8; step++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y + distance * step / 8, id: 1 }] });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    } else {
      await page.mouse.move(x, y); await page.mouse.down();
      await page.mouse.move(x, y + distance, { steps: 8 }); await page.mouse.up();
    }
    await expect(page.getByLabel("双排抽牌牌桌", { exact: true })).toHaveAttribute("aria-busy", "false");
  }
  await drag(38, -90);
  await expect(page.getByText("已抽 1 / 3 张", { exact: true })).toBeVisible();
  expect((await flowState(page)).selectedCards[0].drawDirection).toBe("up");
  await drag(77, 22);
  expect((await flowState(page)).selectedCards).toHaveLength(1);
  await drag(77, 90);
  await expect(page.getByText("已抽 2 / 3 张", { exact: true })).toBeVisible();
  const downward = (await flowState(page)).selectedCards[1];
  expect(downward.drawDirection).toBe("down");
  expect(downward.orientation).not.toBe(downward.baseOrientation);
  await page.getByRole("button", { name: "全部重抽" }).click();
  await drawFromTable(page, [77], "up");
  expect((await flowState(page)).selectedCards[0].orientation).toBe(downward.baseOrientation);
  await page.getByRole("button", { name: "选择第 1 张牌", exact: true }).press("Enter");
  await page.getByRole("button", { name: "选择第 1 张牌", exact: true }).press("ArrowDown");
  await expect(page.getByLabel("双排抽牌牌桌", { exact: true })).toHaveAttribute("aria-busy", "false");
  await drawFromTable(page, [38]);
  const committed = (await flowState(page)).selectedCards;
  await page.reload();
  await expect(page.getByText("已抽 3 / 3 张", { exact: true })).toBeVisible();
  expect((await flowState(page)).selectedCards).toEqual(committed);
  expect((await flowState(page)).baseOrientationByCardId).toEqual(initial.baseOrientationByCardId);
  await expect(page.locator(".draw-flight")).toHaveCount(0);
  await expect(page.locator(".tarot-table img")).toHaveCount(0);
  await page.screenshot({ path: `output/playwright/directional-selected-${testInfo.project.name}.png`, fullPage: true });
  await cdp?.detach();
});

test("13-card reading accepts an empty question and fits mobile width", async ({ page }) => {
  await startReading(page, "年度牌阵", "13");
  await expect(page.locator("button.tarot-back")).toHaveCount(78);
  await expect(page.locator("button.tarot-back").first()).toBeEnabled();
  await drawFromTable(page, Array.from({ length: 13 }, (_, index) => index));
  await expect.poll(() => page.locator(".drawn-placement").evaluate((area) => {
    const viewport = area.getBoundingClientRect();
    return Array.from(area.querySelectorAll(".placed-card")).every((card) => {
      const bounds = card.getBoundingClientRect();
      return bounds.left >= viewport.left && bounds.right <= viewport.right && bounds.top >= viewport.top && bounds.bottom <= viewport.bottom;
    });
  })).toBe(true);
  await page.getByRole("button", { name: "一起翻牌" }).click();
  await expect(page.getByRole("heading", { name: "抽牌结果", exact: true })).toBeVisible();
  await expect(page.locator("img")).toHaveCount(13);
  await expect(page.getByText("年度主题", { exact: true })).toBeVisible();
  await expect(page.getByText("第 12 个月", { exact: true })).toBeVisible();
  await expect.poll(() => page.locator("img").evaluateAll((images) => images.every((image) => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("placed cards overlap, stay inside the table and restore without changing the reading", async ({ page }, testInfo) => {
  await startReading(page);
  await drawFromTable(page, [0], "down"); await drawFromTable(page, [1, 2]);
  const before = await flowState(page);
  const placed = page.locator(".drawn-placement .placed-card");
  await expect(placed).toHaveCount(3);
  await expect(page.getByRole("button", { name: "撤回上一张" })).toHaveCount(0);
  await expect(page.locator(".fan-row-heading, .tray-position")).toHaveCount(0);
  expect(await page.locator(".fan-card").first().evaluate((card) => getComputedStyle(card).rotate)).toBe("-25deg");
  expect(await page.locator(".fan-card").last().evaluate((card) => getComputedStyle(card).rotate)).toBe("25deg");
  const first = placed.first();
  const touch = Boolean(testInfo.project.use.isMobile);
  const cdp = touch ? await page.context().newCDPSession(page) : null;

  async function moveFirst(toX: number, toY: number) {
    await first.focus(); await first.scrollIntoViewIfNeeded();
    const rect = (await first.boundingBox())!;
    const x = rect.x + rect.width / 2; const y = rect.y + rect.height / 2;
    if (cdp) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, id: 1 }] });
      for (let step = 1; step <= 8; step++) await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove", touchPoints: [{ x: x + (toX - x) * step / 8, y: y + (toY - y) * step / 8, id: 1 }],
      });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    } else {
      await page.mouse.move(x, y); await page.mouse.down();
      await page.mouse.move(toX, toY, { steps: 8 }); await page.mouse.up();
    }
    await expect(page.getByLabel("双排抽牌牌桌", { exact: true })).toHaveAttribute("aria-busy", "false");
  }

  await first.scrollIntoViewIfNeeded();
  const secondBounds = (await placed.nth(1).boundingBox())!;
  await moveFirst(secondBounds.x + secondBounds.width / 2, secondBounds.y + secondBounds.height / 2);
  const overlap = (await first.boundingBox())!;
  expect(Math.abs(overlap.x + overlap.width / 2 - secondBounds.x - secondBounds.width / 2)).toBeLessThan(2);
  const layers = await page.locator(".placed-card-slot:has(.placed-card)").evaluateAll((slots) => slots.map((slot) => Number((slot as HTMLElement).style.zIndex)));
  expect(layers[0]).toBeGreaterThan(layers[1]);
  expect((await flowState(page)).selectedCards).toEqual(before.selectedCards);

  const area = (await page.locator(".drawn-placement").boundingBox())!;
  const viewport = page.viewportSize()!;
  await moveFirst(Math.min(viewport.width - 1, area.x + area.width + 40), area.y + area.height + 45);
  async function cardsFit() {
    return page.locator(".drawn-placement").evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return Array.from(element.querySelectorAll(".placed-card")).every((card) => {
        const rect = card.getBoundingClientRect();
        return rect.left >= bounds.left && rect.top >= bounds.top && rect.right <= bounds.right && rect.bottom <= bounds.bottom;
      });
    });
  }
  expect(await cardsFit()).toBe(true);
  const leftBeforeKey = (await first.boundingBox())!.x;
  await first.press("ArrowLeft");
  expect((await first.boundingBox())!.x).toBeCloseTo(leftBeforeKey - 8, 0);
  const savedLeft = await first.evaluate((button) => (button.parentElement as HTMLElement).style.left);
  await page.reload();
  await expect(page.getByText("已抽 3 / 3 张", { exact: true })).toBeVisible();
  await expect.poll(() => first.evaluate((button) => (button.parentElement as HTMLElement).style.left)).toBe(savedLeft);
  expect((await flowState(page)).selectedCards).toEqual(before.selectedCards);
  await page.setViewportSize({ width: 320, height: 900 });
  await expect.poll(cardsFit).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: `output/playwright/free-placement-${testInfo.project.name}.png`, fullPage: true });

  await page.getByRole("button", { name: "全部重抽" }).click();
  await expect(placed).toHaveCount(0);
  const cleared = await flowState(page);
  expect(cleared.selectedCards).toEqual([]);
  expect(cleared.shuffledDeck).toEqual(before.shuffledDeck);
  expect(cleared.baseOrientationByCardId).toEqual(before.baseOrientationByCardId);
  expect(cleared.shuffleCount).toBe(before.shuffleCount);
  expect(cleared.cutCount).toBe(before.cutCount);
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem("tarot_table_placement_v1")!).cards)).toEqual({});
  await drawFromTable(page, [0], "down");
  expect((await flowState(page)).selectedCards[0]).toEqual(before.selectedCards[0]);
  await cdp?.detach();
});

test("failed local writes stay on the draw page and retry the same reading identity", async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "tarot_readings_v1" && !sessionStorage.getItem("allowSave")) throw new Error("QuotaExceededError");
      return original.call(this, key, value);
    };
  });
  await startReading(page);
  await expect(page.locator("button.tarot-back")).toHaveCount(78);
  await expect(page.locator("button.tarot-back").first()).toBeEnabled();
  await drawFromTable(page, [0, 1, 2]);
  await page.getByRole("button", { name: "一起翻牌" }).click();
  await expect(page.getByText("本地历史保存失败，浏览器存储空间可能不足。", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/draw$/); const first = await flowState(page);
  await page.reload(); await expect(page.getByText("已抽 3 / 3 张", { exact: true })).toBeVisible();
  await page.evaluate(() => sessionStorage.setItem("allowSave", "1"));
  await page.getByRole("button", { name: "一起翻牌" }).click();
  await expect(page).toHaveURL(new RegExp(`/result/${first.readingId}$`));
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("tarot_readings_v1")!)[0].createdAt)).toBe(first.readingCreatedAt);
});

test("corrupt browser state recovers safely and malformed API requests return 400", async ({ page, request }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("tarot_reading_flow_v1", JSON.stringify({ version: 1, state: { selectedSpread: { id: "unknown" }, selectedCards: [null] } }));
    localStorage.setItem("tarot_readings_v1", "{}");
  });
  await page.goto("/draw"); await expect(page.getByText("请先选择牌阵。", { exact: true })).toBeVisible();
  await page.goto("/history"); await expect(page.getByText("暂无抽牌记录", { exact: true })).toBeVisible();
  for (const endpoint of ["/api/readings", "/api/interpret"]) {
    expect((await request.post(endpoint, { data: "{", headers: { "Content-Type": "application/json" } })).status()).toBe(400);
    expect((await request.post(endpoint, { data: null })).status()).toBe(400);
  }
});
