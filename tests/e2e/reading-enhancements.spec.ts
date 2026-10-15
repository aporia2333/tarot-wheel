import { test, expect } from "@playwright/test";
import { readingFixture, aiFixture } from "../fixtures";

test("question examples preserve context while the simplified list selects existing spreads", async ({ page }, testInfo) => {
  await page.goto("/question");
  await page.getByText("补充背景", { exact: true }).click();
  await page.getByLabel("Context / 背景信息", { exact: true }).fill("希望保留自己的背景。");
  await page.getByRole("button", { name: "还没想好", exact: true }).click();
  await page.getByRole("button", { name: /理解关系.*面对这段关系/ }).click();
  await expect(page.getByLabel("你的问题", { exact: true })).toHaveValue("面对这段关系，我需要理解什么，又能怎样沟通？");
  await expect(page.getByLabel("Context / 背景信息", { exact: true })).toHaveValue("希望保留自己的背景。");
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "还没想好", exact: true }).click();
    const example = page.getByRole("button", { name: /理解关系.*面对这段关系/ });
    await expect(page.locator(".conversation-dialogue")).toContainText("理解关系");
    expect((await example.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  await page.reload();
  await expect(page.getByLabel("你的问题", { exact: true })).toHaveValue("面对这段关系，我需要理解什么，又能怎样沟通？");
  await page.screenshot({ path: `.audit/ui-enhancements/${testInfo.project.name}-question.png`, fullPage: true });
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await expect(page.locator(".guide-option, .spread-guides")).toHaveCount(0);
  const relationship = page.locator(".spread-card").filter({ has: page.getByRole("heading", { name: "关系牌阵", exact: true }) });
  await relationship.getByRole("button", { name: "关系牌阵", exact: true }).click();
  await relationship.getByRole("button", { name: "3", exact: true }).click();
  let selected = await page.evaluate(() => JSON.parse(sessionStorage.getItem("tarot_reading_flow_v1")!).state);
  expect(selected.selectedSpread.id).toBe("relationship"); expect(selected.selectedSpread.count).toBe(3); expect(selected.shuffledDeck).toHaveLength(0);
  await page.getByRole("button", { name: "下一页", exact: true }).click();
  await page.getByRole("button", { name: "二选一", exact: true }).click();
  selected = await page.evaluate(() => JSON.parse(sessionStorage.getItem("tarot_reading_flow_v1")!).state);
  expect(selected.selectedSpread.id).toBe("choice"); expect(selected.selectedSpread.positions).toEqual(["当前状态", "选项 A", "A 的结果趋势", "选项 B", "B 的结果趋势"]);
  await expect(page.getByRole("button", { name: "二选一", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: `.audit/ui-enhancements/${testInfo.project.name}-spreads.png`, fullPage: true });
});

test("overview, references and saved follow-ups remain readable at phone, tablet and desktop widths", async ({ page }) => {
  const reading = readingFixture();
  reading.aiStatus = "completed"; reading.aiInterpretation = { ...aiFixture(reading), overview: {
    theme: "理解此刻的选择与可控方向。", tension: "在已有习惯和新的尝试之间留意变化。", nextStep: "先写下一件本周可以尝试的小事。",
  } };
  reading.aiFollowUps = [{ requestId: "00000000-0000-4000-8000-000000000001", question: "这个行动建议可以怎样落实？",
    answer: "把行动拆成一件小事，结合原牌位观察。\n\n再根据实际反馈调整节奏。", cardIds: [reading.selectedCards[0].card.id], createdAt: reading.createdAt }];
  await page.addInitScript((reading) => localStorage.setItem("tarot_readings_v1", JSON.stringify([reading])), reading);
  for (const width of [320, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 }); await page.goto(`/result/${reading.readingId}`);
    await expect(page.locator(".reading-overview dt")).toHaveText(["核心主题", "当前张力", "可以尝试的一步"]);
    await expect(page.locator(".follow-up-conversation article")).toHaveCount(1);
    await expect(page.getByRole("link", { name: "回看愚者", exact: true })).toBeVisible();
    await page.locator(".reference-details summary").click();
    await expect(page.locator(".reference-meaning").first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator(".follow-up-conversation .prose-reading").evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
    await expect(page.getByLabel("想进一步理解什么？", { exact: true })).toHaveCount(0);
    await page.screenshot({ path: `.audit/ui-enhancements/result-${width}.png`, fullPage: true });
  }
});
