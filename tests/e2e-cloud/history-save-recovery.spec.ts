import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { tarotCards } from "../../src/data/tarotCards";
import { readingFixture } from "../fixtures";

test("a checkpoint and a lost save response preserve drawn cards and retry the same record exactly once", async ({ page, context }) => {
  test.setTimeout(120_000);
  const reading = { ...readingFixture(), readingId: randomUUID() };
  const selectedCards = reading.selectedCards.map(card => ({ ...card, baseOrientation: card.orientation, drawDirection: "up" }));
  const snapshot = {
    question: reading.question, contextInfo: reading.contextInfo, selectedSpread: reading.spread,
    shuffledDeck: tarotCards, selectedCards,
    baseOrientationByCardId: Object.fromEntries(tarotCards.map(card => [card.id, selectedCards.find(selected => selected.card.id === card.id)?.orientation ?? "upright"])),
    readingId: null, readingCreatedAt: null, shuffleCount: 1, cutCount: 1,
  };
  await page.addInitScript(state => {
    if (!sessionStorage.getItem("tarot_reading_flow_v1")) sessionStorage.setItem("tarot_reading_flow_v1", JSON.stringify({ version: 3, state }));
  }, snapshot);
  await page.goto("/login?next=/draw");
  await page.getByLabel("邮箱", { exact: true }).fill(`recovery-${randomUUID()}@example.test`);
  await page.getByLabel("密码", { exact: true }).fill("test-password-only");
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page.getByRole("heading", { name: "让直觉停留在一张牌上", exact: true })).toBeVisible();
  const payloads: unknown[] = [];
  let phase: "challenge" | "lost-response" | "ready" = "challenge";
  await page.route("**/api/readings", async route => {
    if (route.request().method() !== "POST") return route.continue();
    payloads.push(route.request().postDataJSON());
    if (phase === "challenge") return route.fulfill({ status: 403, contentType: "text/html", headers: { "x-vercel-mitigated": "challenge" }, body: "<title>Vercel Security Checkpoint</title>" });
    if (phase === "lost-response") {
      const saved = await route.fetch(); expect(saved.status()).toBe(201);
      return route.fulfill({ status: 502, contentType: "text/html", body: "<html>Upstream unavailable</html>" });
    }
    return route.continue();
  });
  const reveal = page.getByRole("button", { name: "一起翻牌", exact: true });
  await reveal.click();
  await expect(page.locator(".tarot-table [role='alert']")).toContainText("已选牌会保留");
  await expect(reveal).toBeEnabled();
  const readState = () => page.evaluate(() => JSON.parse(sessionStorage.getItem("tarot_reading_flow_v1")!).state);
  const before = await readState();
  expect(before.selectedCards).toEqual(selectedCards); expect(before.shuffledDeck).toEqual(tarotCards);
  const verification = page.getByRole("link", { name: "完成网站验证（新窗口）", exact: true });
  await expect(verification).toHaveAttribute("target", "_blank");
  const popupPromise = context.waitForEvent("page"); await verification.click();
  const popup = await popupPromise; await popup.waitForLoadState("domcontentloaded");
  expect(new URL(popup.url()).pathname).toBe("/");
  expect(await readState()).toEqual(before); await popup.close();
  phase = "lost-response"; await reveal.click();
  await expect(page.locator(".tarot-table [role='alert']")).toContainText("历史服务暂时不可用");
  expect(await readState()).toEqual(before);
  phase = "ready"; await reveal.click();
  await expect(page).toHaveURL(new RegExp(`/result/${before.readingId}$`));
  expect(payloads).toHaveLength(3); expect(payloads[1]).toEqual(payloads[0]); expect(payloads[2]).toEqual(payloads[0]);
  const saved = await page.request.get(`/api/readings/${before.readingId}`);
  expect(saved.status()).toBe(200); expect((await saved.json()).reading.selectedCards).toEqual(selectedCards);
  const stats = await (await page.request.get("http://127.0.0.1:3102/mock/stats")).json();
  expect(stats.rows.filter((row: { id: string }) => row.id === before.readingId)).toHaveLength(1);
  expect(stats.aiCalls).toBe(0);
});
