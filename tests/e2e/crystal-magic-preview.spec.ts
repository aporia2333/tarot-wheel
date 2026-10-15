import { test, expect } from "@playwright/test";

test.use({ video: { mode: process.env.RECORD_CRYSTAL_REVIEW === "1" ? "on" : "off", size: { width: 1280, height: 720 } } });
test("crystal preview plays both rituals in real time and keeps skin changes synchronized", async ({ page, context }, info) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/design-preview?view=motion");
  const dealer = page.getByRole("button", { name: "占卜师选择", exact: true });
  await dealer.click(); await page.getByRole("button", { name: "曲奇猫", exact: true }).click();
  const scene = page.locator(".preparation-scene");
  await expect(scene).toHaveAttribute("data-asset-state", "loaded");
  await page.getByRole("button", { name: "播放洗牌", exact: true }).click();
  await expect(scene).toHaveAttribute("data-motion", "crystal-magic");
  await expect(dealer).toBeDisabled();
  await expect(scene).toHaveAttribute("data-beat", "weave", { timeout: 7000 });
  await page.screenshot({ path: `output/design/xingyue-crystal-preview-shuffle-${info.project.name}.png`, fullPage: true });
  const progress = Number(await scene.getAttribute("data-progress"));
  await page.locator(".site-header summary").filter({ hasText: "牌面选择" }).click();
  await page.getByRole("combobox", { name: "牌面皮肤", exact: true }).selectOption("quqi");
  await expect(scene.locator("g[data-card-id] image").first()).toHaveAttribute("href", /quqi/);
  expect(Number(await scene.getAttribute("data-progress"))).toBeGreaterThanOrEqual(progress);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "播放洗牌", exact: true })).toBeEnabled({ timeout: 10_000 });
  await page.getByRole("button", { name: "播放切牌", exact: true }).click();
  // This 506ms beat is shorter than the default assertion's later polling interval.
  await expect.poll(() => scene.getAttribute("data-beat"), { timeout: 6000, intervals: [50] }).toBe("cut-pause");
  await expect(scene.locator("[data-card-id]")).toHaveCount(78);
  await page.screenshot({ path: `output/design/xingyue-crystal-preview-cut-${info.project.name}.png`, fullPage: true });
  await expect(page.getByRole("button", { name: "播放洗牌", exact: true })).toBeEnabled({ timeout: 8000 });
  await expect(page.getByRole("button", { name: "播放切牌", exact: true })).toBeDisabled();
  await expect(dealer).toBeEnabled();
  expect(errors).toEqual([]);
  const video = page.video(); await context.close();
  await video?.saveAs(`output/design/xingyue-crystal-ritual-${info.project.name}.webm`);
});
