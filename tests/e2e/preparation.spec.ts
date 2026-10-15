import { expect, test, type Page } from "@playwright/test";
import { prepareDeck } from "../preparationHelpers";
import { drawFromTable } from "../drawHelpers";

async function state(page: Page) { return page.evaluate(() => JSON.parse(sessionStorage.getItem("tarot_reading_flow_v1")!).state); }
async function chooseSpread(page: Page) {
  await page.goto("/spreads");
  await expect(page.locator(".spread-guides")).toHaveCount(0);
  await expect(page.getByText("从一个方向开始", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "通用牌阵", exact: true }).click();
}
test("pending actions survive reloads and skin changes, count inputs reject fractions and repeated starts commit once", async ({ page }, info) => {
  test.setTimeout(80_000);
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  await chooseSpread(page); await page.getByRole("button", { name: "开始抽牌", exact: true }).click();
  await expect(page.locator("#preparation-count")).toHaveCount(0);
  await expect(page.locator(".dealer-picker")).toHaveCount(0);
  await page.getByRole("button", { name: "我来决定", exact: true }).click();
  const input = page.getByLabel("自己指定洗牌次数", { exact: true });
  for (const value of ["0", "1.5", "11", ""]) {
    await input.fill(value); await page.getByRole("button", { name: "开始洗牌", exact: true }).click();
    await expect(page.locator(".dealer-dialogue").getByRole("alert")).toContainText("之间的整数");
    expect((await state(page)).preparation.phase).toBe("choose-shuffle");
  }
  for (const name of ["学者", "曲奇猫", "星帽猫", "星月"]) {
    await page.getByRole("button", { name: "占卜师选择", exact: true }).click();
    await page.getByRole("button", { name, exact: true }).click();
    await expect(page.locator(".preparation-scene")).toHaveAttribute("data-asset-state", "loaded");
  }
  await page.getByRole("button", { name: "重新选择", exact: true }).click();
  await page.screenshot({ path: `output/playwright/r05-preparation-${info.project.name}.png`, fullPage: true });
  await page.getByRole("button", { name: "我来决定", exact: true }).click();
  await page.getByRole("button", { name: "占卜师选择", exact: true }).click();
  await page.getByRole("button", { name: "曲奇猫", exact: true }).click();
  await input.fill("2");
  await page.getByRole("button", { name: "开始洗牌", exact: true }).evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  const first = await state(page);
  expect(first.preparation.shuffleTarget).toBe(2); expect(first.shuffleCount).toBe(0);
  await expect(page.getByRole("button", { name: "占卜师选择", exact: true })).toBeDisabled();
  expect((await state(page)).preparation.pending).toEqual(first.preparation.pending);
  await page.reload();
  await expect(page.locator(".preparation-scene")).toHaveAttribute("data-character", "quqi");
  expect((await state(page)).preparation.pending).toEqual(first.preparation.pending);
  await expect(page.getByRole("heading", { name: "水晶正在为你切牌", exact: true })).toBeVisible({ timeout: 20_000 });
  const washed = await state(page); expect(washed.shuffleCount).toBe(2);
  expect(washed.preparation.countSource.shuffle).toBe("manual");
  expect(washed.preparation.shuffleMethods).toHaveLength(2);
  await expect(page.locator("#preparation-count")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "开始切牌", exact: true })).toHaveCount(0);
  await expect(page.locator(".preparation-scene")).toHaveAttribute("data-action", /double|triple|free/);
  const cutting = await state(page); await page.reload();
  expect((await state(page)).preparation.pending).toEqual(cutting.preparation.pending);
  await expect(page).toHaveURL(/\/draw$/, { timeout: 20_000 });
  const ready = await state(page); expect(ready.cutCount).toBe(1);
  expect(ready.preparation.cutMethods).toHaveLength(1);
  expect(ready.baseOrientationByCardId).toEqual(washed.baseOrientationByCardId);
  await expect(page.getByRole("heading", { name: "让直觉停留在一张牌上", exact: true })).toBeVisible();
  await expect(page.locator(".draw-aside, .draw-direction-controls")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "一起翻牌", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "选择第 1 张牌", exact: true }).press("Enter");
  expect((await state(page)).selectedCards).toHaveLength(0);
  await drawFromTable(page, [0, 1, 2]);
  await expect(page.getByRole("button", { name: "一起翻牌", exact: true })).toBeEnabled();
  await expect(page.locator(".placed-card-slot").locator("p, span")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("random washing stays in range, cutting runs once automatically and drawing cannot bypass preparation", async ({ page }) => {
  test.setTimeout(80_000);
  await chooseSpread(page); await page.goto("/draw");
  await expect(page).toHaveURL(/\/shuffle$/);
  await page.getByRole("button", { name: "交给你", exact: true }).click();
  await expect(page.locator(".preparation-scene")).toHaveAttribute("data-action", /overhand|riffle|table|packets/);
  const target = (await state(page)).preparation.shuffleTarget; expect(target).toBeGreaterThanOrEqual(2); expect(target).toBeLessThanOrEqual(4);
  await expect(page.getByRole("heading", { name: "水晶正在为你切牌" })).toBeVisible({ timeout: 35_000 });
  await expect(page.locator(".preparation-scene")).toHaveAttribute("data-action", /double|triple|free/);
  const pending = (await state(page)).preparation.pending;
  await page.goto("/cut"); await expect(page).toHaveURL(/\/shuffle$/);
  expect((await state(page)).preparation.pending).toEqual(pending);
  await expect(page.getByRole("button", { name: "交给你", exact: true })).toHaveCount(0);
  await expect(page.locator(".preparation-scene")).toHaveAttribute("data-action", /double|triple|free/);
  const cutTarget = (await state(page)).preparation.cutTarget; expect(cutTarget).toBe(1);
  await expect(page).toHaveURL(/\/draw$/, { timeout: 20_000 });
  expect((await state(page)).shuffleCount).toBe(target); expect((await state(page)).cutCount).toBe(cutTarget);
  expect((await state(page)).preparation.countSource).toEqual({ shuffle: "tarotReader", cut: "tarotReader" });
});

test("missing character assets fall back without deadlocking preparation", async ({ page }) => {
  await page.route(/\/characters\/.*\/(?:atlas|limbs|staff)-v\d\.png/, (route) => route.abort());
  await chooseSpread(page); await page.getByRole("button", { name: "开始抽牌", exact: true }).click();
  await expect(page.locator(".preparation-scene")).toHaveAttribute("data-asset-state", "error");
  await expect(page.getByText("角色素材暂未加载，继续用基础形象准备牌组。", { exact: true })).toBeVisible();
  await prepareDeck(page);
  await expect(page.locator("button.tarot-back")).toHaveCount(78);
});

test("ritual scene preserves face, cards and keyboard choices at all four target sizes", async ({ page }) => {
  await chooseSpread(page); await page.getByRole("button", { name: "开始抽牌", exact: true }).click();
  await expect(page).toHaveURL(/\/shuffle$/);
  await expect(page.locator(".preparation-scene")).toHaveAttribute("data-portrait-state", "loaded");
  for (const [width, height] of [[1920, 1080], [1440, 900], [1280, 720], [768, 1024], [390, 844]]) {
    await page.setViewportSize({ width, height });
    await expect(page.locator(".preparation-scene")).toHaveAttribute("data-asset-state", "loaded");
    await expect(page.locator("#preparation-count")).toHaveCount(0);
    const layout = await page.evaluate(() => {
      const rect = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
      // Nested SVG getBoundingClientRect includes the whole atlas, even outside its clipped viewport.
      const sprite = document.querySelector<SVGSVGElement>("[data-staff-body] > svg, .reader-upper-body > svg, .reader-head > svg")!;
      const matrix = (sprite.parentElement as unknown as SVGGraphicsElement).getScreenCTM()!;
      const x = Number(sprite.getAttribute("x")), y = Number(sprite.getAttribute("y"));
      const width = Number(sprite.getAttribute("width")), height = Math.min(226, Number(sprite.getAttribute("height")));
      const corners = [[x,y], [x+width,y], [x,y+height], [x+width,y+height]].map(([x,y]) => new DOMPoint(x,y).matrixTransform(matrix));
      const left = Math.min(...corners.map(p => p.x)), top = Math.min(...corners.map(p => p.y));
      const face = new DOMRect(left, top, Math.max(...corners.map(p => p.x))-left, Math.max(...corners.map(p => p.y))-top);
      const scene = rect(".preparation-scene"), cards = rect("g[data-packet]"), dialogue = rect(".dealer-dialogue");
      const overlaps = (a: DOMRect, b: DOMRect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      return { overflow: document.documentElement.scrollWidth > innerWidth, overlapsFace: overlaps(face, dialogue), overlapsCards: overlaps(cards, dialogue),
        faceInside: face.left >= scene.left && face.right <= scene.right && face.top >= scene.top && face.bottom <= scene.bottom,
        cardsInside: cards.left >= scene.left && cards.right <= scene.right && cards.bottom <= scene.bottom };
    });
    expect(layout).toEqual({ overflow: false, overlapsFace: false, overlapsCards: false, faceInside: true, cardsInside: true });
    await page.screenshot({ path: `output/playwright/r05-ritual-${width}x${height}.png`, fullPage: true });
  }
  await page.getByRole("button", { name: "占卜师选择", exact: true }).press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "占卜师选择", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "我来决定", exact: true }).press("Enter");
  await expect(page.getByLabel("自己指定洗牌次数", { exact: true })).toHaveValue("1");
  await page.getByRole("button", { name: "增加洗牌次数", exact: true }).click();
  await expect(page.getByLabel("自己指定洗牌次数", { exact: true })).toHaveValue("2");
});
