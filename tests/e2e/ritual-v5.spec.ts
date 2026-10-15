import { test, expect } from "@playwright/test";

test("leaving mid-motion retains the uncommitted plan and resuming commits it only once", async ({ page }) => {
  await page.goto("/spreads"); await page.getByRole("button", { name: "通用牌阵", exact: true }).click(); await page.getByRole("button", { name: "开始抽牌", exact: true }).click();
  await page.getByRole("button", { name: "我来决定", exact: true }).click(); await page.getByRole("button", { name: "开始洗牌", exact: true }).click();
  const read = () => page.evaluate(() => JSON.parse(sessionStorage.getItem("tarot_reading_flow_v1")!).state);
  const initial = await read(); await page.goto("/history");
  await expect(page.getByRole("button", { name: "占卜师选择", exact: true })).toBeEnabled();
  expect((await read()).preparation.pending).toEqual(initial.preparation.pending); expect((await read()).shuffleCount).toBe(0);
  await page.goto("/shuffle"); await expect(page.getByRole("heading", { name: "水晶正在为你切牌", exact: true })).toBeVisible({ timeout: 12000 });
  const resumed = await read(); expect(resumed.shuffleCount).toBe(1); expect(resumed.preparation.lastCommittedId).toBe(initial.preparation.pending.id);
  await page.reload(); expect((await read()).shuffleCount).toBe(1); await expect(page.locator("[data-card-id]")).toHaveCount(78);
});

test("fixed-seed developer inspection preserves card identity while seeking and never writes a reading", async ({ page }, info) => {
  await page.goto("/design-preview?view=motion&debug=1");
  await page.getByLabel("回放种子", { exact: true }).fill("31415");
  await page.getByLabel("回放动作", { exact: true }).selectOption("riffle");
  await page.getByRole("button", { name: "载入固定种子", exact: true }).click();
  const scene = page.locator(".preparation-scene");
  await expect(scene.locator("[data-card-id]")).toHaveCount(78);
  await page.getByLabel("回放进度", { exact: true }).fill("0.70");
  await expect(scene).toHaveAttribute("data-beat", "weave");
  const before = await scene.locator("[data-card-id]").evaluateAll(cards => cards.map(card => [card.getAttribute("data-card-id"), card.getAttribute("transform")]));
  await page.screenshot({ path: `output/design/xingyue-ritual-v5-inspection-${info.project.name}.png`, fullPage: true });
  await page.getByRole("button", { name: "载入固定种子", exact: true }).click();
  await page.getByLabel("回放进度", { exact: true }).fill("0.70");
  expect(await scene.locator("[data-card-id]").evaluateAll(cards => cards.map(card => [card.getAttribute("data-card-id"), card.getAttribute("transform")]))).toEqual(before);
  const store = await page.evaluate(() => sessionStorage.getItem("tarot_reading_flow_v1"));
  if (store) expect(JSON.parse(store).state.shuffleCount).toBe(0);
  await page.goto("/design-preview?view=motion"); await expect(page.locator(".ritual-debugger")).toHaveCount(0);
});

test("hidden scenes pause elapsed time and resume the same operation", async ({ page }) => {
  await page.goto("/spreads"); await page.getByRole("button", { name: "通用牌阵", exact: true }).click(); await page.getByRole("button", { name: "开始抽牌", exact: true }).click();
  await expect(page.getByRole("button", { name: "我来决定", exact: true })).toBeVisible();
  const time = new Date("2026-10-12T02:00:00Z"); await page.clock.install({ time }); await page.clock.pauseAt(time);
  await page.getByRole("button", { name: "我来决定", exact: true }).click(); await page.getByRole("button", { name: "开始洗牌", exact: true }).click();
  const scene = page.locator(".preparation-scene"), read = () => page.evaluate(() => JSON.parse(sessionStorage.getItem("tarot_reading_flow_v1")!).state);
  await page.clock.runFor(400); const before = await scene.getAttribute("data-progress"), plan = (await read()).preparation.pending;
  // Simulate the browser's visibility event; this is isolated to the test page.
  await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, get: () => true }); document.dispatchEvent(new Event("visibilitychange")); });
  await page.clock.runFor(6000); expect(await scene.getAttribute("data-progress")).toBe(before); expect((await read()).shuffleCount).toBe(0);
  await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, get: () => false }); document.dispatchEvent(new Event("visibilitychange")); });
  await page.clock.runFor(1000); expect(Number(await scene.getAttribute("data-progress"))).toBeGreaterThan(Number(before));
  expect((await read()).preparation.pending).toEqual(plan); expect((await read()).shuffleCount).toBe(0);
});

test("one transient animation failure preserves the plan and replay commits it once", async ({ page }) => {
  await page.goto("/spreads"); await page.getByRole("button", { name: "通用牌阵", exact: true }).click(); await page.getByRole("button", { name: "开始抽牌", exact: true }).click();
  await expect(page.getByRole("button", { name: "我来决定", exact: true })).toBeVisible();
  const time = new Date("2026-10-12T03:00:00Z"); await page.clock.install({ time }); await page.clock.pauseAt(time);
  await page.getByRole("button", { name: "我来决定", exact: true }).click(); await page.getByRole("button", { name: "开始洗牌", exact: true }).click();
  const read = () => page.evaluate(() => JSON.parse(sessionStorage.getItem("tarot_reading_flow_v1")!).state);
  await page.clock.runFor(200); const plan = (await read()).preparation.pending;
  // Fail a single visual write to exercise the actual RAF recovery handler.
  await page.evaluate(() => {
    const original = SVGElement.prototype.setAttribute; let once = true;
    SVGElement.prototype.setAttribute = function(name: string, value: string) {
      if (once && name === "transform" && this.hasAttribute("data-card-id")) { once = false; throw new Error("test transient visual fault"); }
      original.call(this, name, value);
    };
  });
  await page.clock.runFor(200); await expect(page.locator(".scene-recovery")).toContainText("播放中断");
  expect((await read()).preparation.pending).toEqual(plan); expect((await read()).shuffleCount).toBe(0);
  await page.getByRole("button", { name: "重新播放当前动作", exact: true }).click();
  await page.clock.runFor(6300); expect((await read()).shuffleCount).toBe(1); expect((await read()).preparation.lastCommittedId).toBe(plan.id);
  await page.clock.runFor(600); await page.clock.runFor(4500); await page.clock.resume(); await expect(page).toHaveURL(/\/draw$/);
  expect((await read()).shuffleCount).toBe(1); expect((await read()).cutCount).toBe(1);
});
