import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => { await page.route("**/characters/*/staff-v1.png", route => route.abort()); });

test("four connected dealers blink without replacing their torso and keep the conversation draft", async ({ page }, info) => {
  test.setTimeout(90_000);
  const time = new Date("2026-10-11T12:00:00Z");
  await page.clock.install({ time }); await page.clock.pauseAt(time);
  await page.goto("/");
  await page.getByLabel("你的问题", { exact: true }).fill("保留这一句问题");
  for (const [id, name] of [["scholar", "学者"], ["quqi", "曲奇猫"], ["star-cap", "星帽猫"], ["star-moon", "星月"]]) {
    await page.getByRole("button", { name: "占卜师选择", exact: true }).click(); await page.clock.runFor(200);
    await page.getByRole("button", { name, exact: true }).click(); await page.clock.runFor(250);
    const scene = page.locator(".preparation-scene");
    await expect(scene).toHaveAttribute("data-character", id);
    await expect(scene).toHaveAttribute("data-portrait-state", "loaded");
    await expect(scene.locator(".reader-head")).toHaveCount(0);
    const base = scene.locator("[data-painted-portrait] > svg").first();
    const original = await base.evaluate(element => element.outerHTML);
    await page.clock.runFor(4000);
    let seen = false;
    for (let frame = 0; frame < 35 && !seen; frame++) {
      await page.clock.runFor(100); seen = await scene.locator("[data-portrait-blink]").count() === 1;
    }
    expect(seen).toBe(true);
    expect(await base.evaluate(element => element.outerHTML)).toBe(original);
    await page.clock.runFor(180);
    await expect(scene.locator("[data-portrait-blink]")).toHaveCount(0);
    await page.getByRole("button", { name: `与${name}交谈`, exact: true }).click();
    await expect(page.getByLabel("你的问题", { exact: true })).toHaveValue("保留这一句问题");
    await page.screenshot({ path: `output/design/xingyue-connected-${id}-${info.project.name}.png`, fullPage: true });
  }
});

test("a missing connected portrait falls back to the existing rig and leaves the flow usable", async ({ page }) => {
  await page.route(/\/characters\/.*\/portrait-v\d\.png/, route => route.abort());
  await page.goto("/");
  await expect(page.locator(".preparation-scene")).toHaveAttribute("data-portrait-state", "fallback");
  await expect(page.locator(".reader-head")).toHaveCount(1);
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await expect(page.locator(".spread-book")).toHaveAttribute("data-book-state", "open");
  await page.getByRole("button", { name: "通用牌阵", exact: true }).click();
  await page.getByRole("button", { name: "开始抽牌", exact: true }).click();
  await expect(page.getByRole("heading", { name: "先洗几次牌？", exact: true })).toBeVisible();
});

test("matched limbs recover after a temporary load failure and a role switch", async ({ page }) => {
  let unavailable = true;
  await page.route("**/characters/star-moon/limbs-v1.png", route => unavailable ? route.abort() : route.continue());
  await page.goto("/");
  const scene = page.locator(".preparation-scene");
  await expect(scene).toHaveAttribute("data-rig-state", "fallback");
  await expect(scene).toHaveAttribute("data-asset-state", "loaded");
  await expect(scene.locator("[data-hand] image").first()).toHaveAttribute("href", /atlas-v/);
  unavailable = false;
  for (const name of ["学者", "星月"]) {
    await page.getByRole("button", { name: "占卜师选择", exact: true }).click();
    await page.getByRole("button", { name, exact: true }).click();
    await expect(scene).toHaveAttribute("data-rig-state", "loaded");
  }
  await expect(scene.locator("[data-hand] image").first()).toHaveAttribute("href", "/characters/star-moon/limbs-v1.png");
});
