import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { readingFixture, aiFixture } from "../fixtures";
import { tarotCards } from "../../src/data/tarotCards";

test("formal room pages retain saved data, with one card skin from entrance to history", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const reading = readingFixture();
  reading.aiStatus = "completed";
  reading.aiInterpretation = aiFixture(reading);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(({ reading, cards }) => {
    if (!localStorage.getItem("tarot_readings_v1")) {
      localStorage.setItem("tarot_readings_v1", JSON.stringify([reading]));
      localStorage.setItem("tarot_card_skin_v1", "quqi");
      sessionStorage.setItem("tarot_reading_flow_v1", JSON.stringify({ version: 1, state: {
        question: reading.question, contextInfo: reading.contextInfo, selectedSpread: reading.spread,
        shuffledDeck: cards, selectedCards: [], orientationByCardId: {}, readingId: null,
        readingCreatedAt: null, shuffleCount: 1, cutCount: 0,
      } }));
    }
  }, { reading, cards: tarotCards });
  await mkdir("output/design", { recursive: true });
  const routes = [
    ["home", "/"], ["question", "/question"], ["spreads", "/spreads"], ["draw", "/draw"],
    ["result", `/result/${reading.readingId}`], ["history", "/history"], ["login", "/login"], ["account", "/account"],
    ["not-found", "/page-that-does-not-exist"],
  ] as const;
  for (const [name, path] of routes) {
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible();
    if (name === "home") await expect(page.locator(".preparation-scene g[data-packet] image").first()).toHaveAttribute("href", /quqi/);
    if (name === "spreads") {
      await expect(page.locator(".spread-book")).toHaveAttribute("data-book-state", "open");
      await expect(page.locator(".spread-card")).toHaveCount(8);
      await expect(page.locator(".spread-miniature")).toHaveCount(0);
    }
    if (name === "draw") {
      await expect(page.getByText("已抽 0 / 3 张", { exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "让直觉停留在一张牌上", exact: true })).toBeVisible();
      await expect(page.locator(".fan-row button").first()).toHaveCSS("background-image", /quqi/);
    }
    if (name === "result") {
      await expect(page.getByRole("region", { name: "本次抽到的牌" })).toBeVisible();
      await expect(page.locator(".reading-cards img")).toHaveCount(3);
      await expect(page.locator(".reading-cards img").first()).toHaveAttribute("src", /quqi/);
      const cards = await page.locator(".result-card-table").boundingBox();
      const prose = await page.locator(".result-reading").boundingBox();
      if (testInfo.project.name === "desktop") expect(prose!.x).toBeGreaterThan(cards!.x + cards!.width);
      else expect(prose!.y).toBeGreaterThan(cards!.y + cards!.height);
    }
    if (name === "not-found") await expect(page.getByRole("link", { name: "返回牌室", exact: true })).toHaveAttribute("href", "/");
    if (name === "history") {
      const entry = page.locator(".history-entry");
      await expect(entry).toHaveCount(1);
      await expect(entry).toHaveAttribute("href", `/result/${reading.readingId}`);
      await expect(entry.getByText("3 张牌 · 含保存的解读", { exact: true })).toBeVisible();
      await expect(entry.locator("img")).toHaveCount(3);
      await expect(entry.locator("img").first()).toHaveAttribute("src", /quqi/);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.evaluate(() => Promise.all([...document.images].map(img => img.decode().catch(() => {}))));
    await page.screenshot({ path: `output/design/xingyue-formal-${name}-${testInfo.project.name}.png`, fullPage: true });
  }
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("tarot_readings_v1")!))).toEqual([reading]);
  expect(errors).toEqual([]);
});

test("a thirteen card reading and incomplete historical artwork stay usable at phone width", async ({ page }, testInfo) => {
  const reading = readingFixture(13, "yearly");
  const legacy = { ...readingFixture(), readingId: "old-reading", question: "旧阅读仍可以回看",
    selectedCards: [{ card: { name: "旧牌面", imagePath: "m00.jpg" }, orientation: "reversed", position: "旧牌位" }] };
  await page.addInitScript(({ reading, legacy }) => {
    localStorage.setItem("tarot_readings_v1", JSON.stringify([reading, legacy]));
  }, { reading, legacy });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`/result/${reading.readingId}`);
  await expect(page.locator(".reading-cards img")).toHaveCount(13);
  const cards = await page.locator(".result-card-table").boundingBox();
  const prose = await page.locator(".result-reading").boundingBox();
  expect(prose!.y).toBeGreaterThan(cards!.y + cards!.height);
  await page.screenshot({ path: `output/design/xingyue-formal-result-thirteen-${testInfo.project.name}.png`, fullPage: true });
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/history");
  await expect(page.locator(".history-entry")).toHaveCount(2);
  await expect(page.locator(".history-entry").filter({ hasText: legacy.question }).locator("img")).toHaveAttribute("src", /\/cards\/m00\.jpg$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("link").filter({ hasText: legacy.question }).click();
  await expect(page.locator(".reading-card h2")).toHaveText("旧牌面");
  await expect(page.locator(".reading-cards img")).toHaveAttribute("src", /\/cards\/m00\.jpg$/);
  await expect(page.locator(".reading-cards .orientation-label")).toHaveText("逆位");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
