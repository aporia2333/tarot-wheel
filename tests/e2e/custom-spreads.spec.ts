import { test, expect } from "@playwright/test";
import { drawFromTable } from "../drawHelpers";
import { prepareDeck } from "../preparationHelpers";

const names = ["我的期待", "现实限制", "可用资源", "下一步行动"];
const meanings = names.map((name) => `围绕${name}观察项目中的具体情况。`);
async function state(page: import("@playwright/test").Page) { return page.evaluate(() => JSON.parse(sessionStorage.getItem("tarot_reading_flow_v1")!).state); }

test("custom editor retains drafts, keeps meanings with reordered positions, manages templates and completes a reading", async ({ page }, testInfo) => {
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/question"); await page.getByLabel("你的问题", { exact: true }).fill("我可以怎样迈出下一步？");
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await page.locator(".book-topline").getByRole("button", { name: "自定义牌阵", exact: true }).click();
  await expect(page.getByLabel("牌阵名称", { exact: true })).toBeFocused();
  await expect(page.getByRole("button", { name: "开始抽牌", exact: true })).toBeDisabled();
  await page.getByLabel("牌阵名称", { exact: true }).fill("我的下一步");
  await page.getByLabel("抽牌数量", { exact: true }).selectOption("4");
  for (let index = 0; index < 4; index++) {
    await page.getByLabel(`牌位 ${index + 1} 名称`, { exact: true }).fill(names[index]);
    await page.getByLabel(`牌位 ${index + 1} 含义`, { exact: false }).fill(meanings[index]);
  }
  await page.getByLabel("牌位 2 名称", { exact: true }).fill(names[0]);
  await page.getByRole("button", { name: "使用此牌阵", exact: true }).click();
  await expect(page.locator(".custom-spread-editor").getByRole("alert")).toContainText("重复");
  await page.getByLabel("牌位 2 名称", { exact: true }).fill(names[1]);
  await page.getByRole("button", { name: "上移牌位 4", exact: true }).click();
  await expect(page.getByLabel("牌位 3 名称", { exact: true })).toHaveValue(names[3]);
  await expect(page.getByLabel("牌位 3 含义", { exact: false })).toHaveValue(meanings[3]);
  await page.getByLabel("抽牌数量", { exact: true }).selectOption("2");
  await page.getByLabel("抽牌数量", { exact: true }).selectOption("4");
  await expect(page.getByLabel("牌位 4 名称", { exact: true })).toHaveValue(names[2]);
  await page.reload();
  await expect(page.getByLabel("牌阵名称", { exact: true })).toHaveValue("我的下一步");
  await expect(page.getByLabel("抽牌数量", { exact: true })).toHaveValue("4");
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.locator(".custom-spread-editor").screenshot({ path: `.audit/ui-custom-spread/${testInfo.project.name}-editor.png` });
  await page.getByRole("button", { name: "保存为模板", exact: true }).click();
  await expect(page.locator(".custom-template-list article")).toHaveCount(1);
  await page.reload();
  await page.getByLabel("牌阵名称", { exact: true }).fill("下一步观察");
  await page.getByRole("button", { name: "更新模板", exact: true }).click();
  await expect(page.locator(".custom-template-list article")).toHaveCount(1);
  await page.getByRole("button", { name: "使用模板 下一步观察", exact: true }).click();
  await expect(page.getByRole("button", { name: "开始抽牌", exact: true })).toBeFocused();
  const expectedNames = [names[0], names[1], names[3], names[2]];
  const expectedMeanings = [meanings[0], meanings[1], meanings[3], meanings[2]];
  expect((await state(page)).selectedSpread.positions).toEqual(expectedNames);
  expect((await state(page)).selectedSpread.positionMeanings).toEqual(expectedMeanings);
  await page.getByRole("button", { name: "开始抽牌", exact: true }).click();
  await prepareDeck(page);
  await expect(page.locator(".draw-position-meaning, .draw-aside")).toHaveCount(0);
  await expect(page.locator("button.tarot-back").first()).toBeEnabled();
  await drawFromTable(page, [0, 1, 2, 3]);
  await page.reload(); await expect(page.getByText("已抽 4 / 4 张", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "一起翻牌", exact: true }).click();
  await expect(page.getByRole("heading", { name: "抽牌结果", exact: true })).toBeVisible();
  await expect(page.locator(".card-position")).toHaveText(expectedNames);
  await expect(page.locator(".position-prompt")).toHaveText(expectedMeanings.map((meaning) => `牌位含义：${meaning}`));
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("tarot_readings_v1")!)[0]);
  expect(saved.spread.name).toBe("下一步观察"); expect(saved.spread.positionMeanings).toEqual(expectedMeanings);
  const resultUrl = page.url(); await page.reload(); await expect(page.locator(".card-position")).toHaveText(expectedNames);
  await page.goto("/spreads"); await page.locator(".book-topline").getByRole("button", { name: "自定义牌阵", exact: true }).click();
  await page.getByRole("button", { name: "编辑模板 下一步观察", exact: true }).click();
  await expect(page.getByLabel("牌位 3 含义", { exact: false })).toHaveValue(meanings[3]);
  await page.getByRole("button", { name: "删除模板 下一步观察", exact: true }).click();
  await expect(page.locator(".custom-template-list article")).toHaveCount(1);
  await page.getByRole("button", { name: "确认删除模板 下一步观察", exact: true }).click();
  await expect(page.locator(".custom-template-list article")).toHaveCount(0);
  await page.goto(resultUrl); await expect(page.locator(".card-position")).toHaveText(expectedNames);
  expect(errors).toEqual([]);
});

test("one and thirteen custom positions keep valid boundaries and long labels fit small screens", async ({ page }) => {
  await page.goto("/spreads"); await page.locator(".book-topline").getByRole("button", { name: "自定义牌阵", exact: true }).click();
  const count = page.getByLabel("抽牌数量", { exact: true }); await expect(count.locator("option")).toHaveCount(13);
  await count.selectOption("1"); await expect(page.locator(".custom-position-list > li")).toHaveCount(1);
  await page.getByRole("button", { name: "使用此牌阵", exact: true }).click(); expect((await state(page)).selectedSpread.count).toBe(1);
  await page.locator(".book-topline").getByRole("button", { name: "自定义牌阵", exact: true }).click(); await count.selectOption("13");
  await page.getByLabel("牌阵名称", { exact: true }).fill("W".repeat(60));
  await page.getByLabel("牌位 13 名称", { exact: true }).fill("Z".repeat(60));
  await page.getByLabel("牌位 13 含义", { exact: false }).fill("Y".repeat(300));
  await expect(page.locator(".custom-position-list > li")).toHaveCount(13);
  for (const width of [320, 768, 1280]) { await page.setViewportSize({ width, height: 900 }); await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width); }
  await page.getByRole("button", { name: "使用此牌阵", exact: true }).click();
  await page.setViewportSize({ width: 320, height: 900 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.getByRole("button", { name: "开始抽牌", exact: true }).click(); await prepareDeck(page);
  await expect(page.locator("button.tarot-back").first()).toBeEnabled();
  await expect.poll(() => page.evaluate(() => window.innerWidth)).toBe(320);
  await drawFromTable(page, Array.from({ length: 13 }, (_, index) => index));
  await page.getByRole("button", { name: "一起翻牌", exact: true }).click();
  await expect(page.locator(".reading-card")).toHaveCount(13);
  await expect(page.locator(".position-prompt").last()).toContainText("Y".repeat(300));
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
