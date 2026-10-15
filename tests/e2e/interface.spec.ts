import { test, expect } from "@playwright/test";
import { tarotCards } from "../../src/data/tarotCards";
import { readingFixture, aiFixture } from "../fixtures";

test("local guest entry returns to an existing reading and rejects external redirects", async ({ page }) => {
  const reading = readingFixture();
  await page.addInitScript((reading) => localStorage.setItem("tarot_readings_v1", JSON.stringify([reading])), reading);
  await page.goto(`/login?next=${encodeURIComponent(`/result/${reading.readingId}`)}`);
  await page.getByRole("button", { name: "跳过登录，作为访客体验" }).click();
  await expect(page).toHaveURL(new RegExp(`/result/${reading.readingId}$`));
  await expect(page.getByRole("heading", { name: "抽牌结果", exact: true })).toBeVisible();
  await page.goto(`/login?next=${encodeURIComponent("//example.test")}`);
  await page.getByRole("button", { name: "跳过登录，作为访客体验" }).click();
  await expect(page).toHaveURL(/\/question$/);
  await expect(page.getByRole("heading", { name: "输入问题", exact: true })).toBeVisible();
});

test("keyboard navigation skips chrome and selects a spread and count independently", async ({ page, request }) => {
  expect(await (await request.get("/")).text()).toMatch(/<h1[^>]*>星月之间<\/h1>/);
  await page.goto("/question"); await expect(page.getByRole("heading", { name: "输入问题" })).toBeVisible();
  await page.keyboard.press("Tab"); await expect(page.getByRole("link", { name: "跳至主要内容" })).toBeFocused();
  await page.keyboard.press("Enter"); await expect(page.locator("main")).toBeFocused();
  await page.getByLabel("你的问题", { exact: true }).fill("我需要看见什么？");
  await page.getByRole("button", { name: "下一步", exact: true }).focus(); await page.keyboard.press("Enter");
  const general = page.locator(".spread-card").filter({ has: page.getByRole("heading", { name: "通用牌阵", exact: true }) });
  const choice = general.getByRole("button", { name: "通用牌阵", exact: true });
  await expect(page.locator(".spread-book")).toHaveAttribute("data-book-state", "open");
  await choice.focus(); await page.keyboard.press("Enter"); await expect(choice).toHaveAttribute("aria-pressed", "true");
  await general.getByRole("button", { name: "5", exact: true }).focus(); await page.keyboard.press("Enter");
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem("tarot_reading_flow_v1")!).state.selectedSpread.count)).toBe(5);
  await expect(page.getByRole("tooltip")).toContainText("从不同角度梳理当下问题");
  await expect(general.locator(".spread-miniature")).toHaveCount(0);
});

test("reading pages fit phone, tablet and desktop, with usable deck targets and readable text", async ({ page }) => {
  const reading = readingFixture(); reading.aiStatus = "completed"; reading.aiInterpretation = aiFixture(reading);
  await page.addInitScript(({ reading, cards }) => {
    localStorage.setItem("tarot_readings_v1", JSON.stringify([reading]));
    sessionStorage.setItem("tarot_reading_flow_v1", JSON.stringify({ version: 1, state: {
      question: reading.question, contextInfo: reading.contextInfo, selectedSpread: reading.spread, shuffledDeck: cards,
      selectedCards: [], orientationByCardId: {}, readingId: null, readingCreatedAt: null, shuffleCount: 1, cutCount: 0,
    } }));
  }, { reading, cards: tarotCards });
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/question", "/spreads", "/draw", `/result/${reading.readingId}`, "/history", "/login", "/account"]) {
      await page.goto(path); await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("h1")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const navigation = await page.locator(".site-header").evaluate(element => {
        const bounds = element.getBoundingClientRect();
        const items = [...element.querySelectorAll(".site-brand,.site-nav > a,.site-nav summary,.reader-switch-button")]
          .map(item => item.getBoundingClientRect());
        return { height:bounds.height, sameRow:items.every(item => Math.abs(item.top + item.height / 2 - (items[0].top + items[0].height / 2)) < 2),
          inside:items.every(item => item.left >= 0 && item.right <= document.documentElement.clientWidth), count:items.length };
      });
      expect(navigation.height).toBeLessThanOrEqual(56);
      expect(navigation).toMatchObject({ sameRow:true, inside:true, count:5 });
      await expect(page.locator(".reading-progress")).toHaveCount(0);
      if (path === "/draw") {
        await expect(page.getByLabel("上排牌组", { exact: true }).locator("button.tarot-back")).toHaveCount(39);
        await expect(page.getByLabel("下排牌组", { exact: true }).locator("button.tarot-back")).toHaveCount(39);
        await expect(page.locator("button.tarot-back")).toHaveCount(78);
        expect(await page.locator("button.tarot-back").first().evaluate((element) => {
          const css = getComputedStyle(element); return parseFloat(css.width) >= 44 && parseFloat(css.height) >= 44;
        })).toBe(true);
        await page.getByRole("button", { name: "选择第 1 张牌", exact: true }).press("Enter");
        await page.getByRole("button", { name: "选择第 1 张牌", exact: true }).press("ArrowUp");
        await expect(page.getByText("已抽 1 / 3 张", { exact: true })).toBeVisible();
      }
      if (path.startsWith("/result")) {
        const typography = await page.locator(".prose-reading").first().evaluate((element) => {
          const css = getComputedStyle(element); return { size: parseFloat(css.fontSize), height: parseFloat(css.lineHeight) };
        });
        expect(typography.size).toBeGreaterThanOrEqual(16); expect(typography.height / typography.size).toBeGreaterThanOrEqual(1.85);
        const synthesis = await page.locator(".synthesis").boundingBox(); const details = await page.locator(".card-interpretations").boundingBox();
        expect(synthesis!.y).toBeLessThan(details!.y);
      }
    }
  }
});

test("palette contrast and reduced-motion behavior preserve readable, quiet interactions", async ({ page, request }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect((await request.get("/_next/image?url=%2Fcards%2Fm02.jpg&w=256&q=75")).status()).toBe(404);
  await page.goto("/question"); await expect(page.getByRole("heading", { name: "输入问题" })).toBeVisible();
  const contrast = await page.evaluate(() => {
    const luminance = (color: string) => {
      const channels = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map((channel) => { const value = channel / 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4; });
      return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
    };
    const ratio = (first: string, second: string) => { const a = luminance(first); const b = luminance(second); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); };
    const body = getComputedStyle(document.body); const button = getComputedStyle(document.querySelector(".question-form .btn-primary")!);
    const field = document.querySelector("textarea")!; const input = getComputedStyle(field);
    const helper = getComputedStyle(document.querySelector(".conversation-context summary")!);
    return { text: ratio(body.color, body.backgroundColor), helper: ratio(helper.color, body.backgroundColor),
      button: ratio(button.color, button.backgroundColor), border: ratio(input.borderBottomColor, input.backgroundColor),
      placeholder: ratio(getComputedStyle(field, "::placeholder").color, input.backgroundColor) };
  });
  expect(contrast.text).toBeGreaterThanOrEqual(4.5); expect(contrast.helper).toBeGreaterThanOrEqual(4.5);
  expect(contrast.button).toBeGreaterThanOrEqual(4.5); expect(contrast.placeholder).toBeGreaterThanOrEqual(4.5); expect(contrast.border).toBeGreaterThanOrEqual(3);
  await page.getByRole("button", { name: "下一步", exact: true }).click();
  await page.getByRole("button", { name: "通用牌阵", exact: true }).click();
  await page.getByRole("button", { name: "开始抽牌", exact: true }).click();
  await page.getByRole("button", { name: "我来决定", exact: true }).click();
  await page.getByRole("button", { name: "开始洗牌", exact: true }).click();
  const scene = page.locator(".preparation-scene");
  await expect(scene).toHaveAttribute("data-dealer-state", "shuffle");
  await expect(scene.locator("[data-card-id]")).toHaveCount(78);

  await expect(page).toHaveURL(/\/draw$/);
  await expect(page.getByRole("heading", { name: "再切几次牌？" })).toHaveCount(0);
});
