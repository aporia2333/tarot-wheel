import { test, expect } from "@playwright/test";
import { tarotCards } from "../../src/data/tarotCards";
import { spreads, toTarotSpread } from "../../src/data/spreads";
import { applyPreparationOperation, createMagicPreparationOperation, emptyPreparation } from "../../src/lib/preparation";

test("crystal magic maps every card, keeps a floating bridge and cuts automatically once", async ({ page }, info) => {
  const op = createMagicPreparationOperation(tarotCards.map(card => card.id), "shuffle", "packets");
  const orientations = Object.fromEntries(tarotCards.map((card, index) => [card.id, index % 2 ? "upright" as const : "reversed" as const]));
  const snapshot = { question: "水晶球动画验证", contextInfo: "", selectedSpread: toTarotSpread(spreads[0], 3), shuffledDeck: tarotCards, selectedCards: [],
    baseOrientationByCardId: orientations, readingId: null, readingCreatedAt: null, shuffleCount: 0, cutCount: 0,
    preparation: { ...emptyPreparation(), phase: "shuffling", shuffleTarget: 1, pending: op } };
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(snapshot => {
    if (!sessionStorage.getItem("tarot_reading_flow_v1")) sessionStorage.setItem("tarot_reading_flow_v1", JSON.stringify({ version: 3, state: snapshot }));
    localStorage.setItem("tarot_dealer_character_v1", "quqi");
    localStorage.setItem("tarot_card_skin_v1", "quqi");
  }, snapshot);
  const time = new Date("2026-10-10T00:00:00Z");
  await page.clock.install({ time }); await page.clock.pauseAt(time);
  await page.goto("/shuffle");
  const scene = page.locator(".preparation-scene");
  await expect(scene).toHaveAttribute("data-motion", "crystal-magic");
  await expect(scene).toHaveAttribute("data-asset-state", "loaded");
  await expect(scene.locator("[data-crystal]")).toHaveCount(1);
  await expect(scene).toHaveAttribute("data-casting", "staff");
  await expect(scene.locator("[data-staff-portrait]")).toHaveCount(1);
  await expect(scene.locator("[data-hand]")).toHaveCount(0);
  await page.clock.runFor(4400);
  await expect(scene).toHaveAttribute("data-beat", "weave");
  await expect(scene.locator("[data-card-id]")).toHaveCount(78);
  expect(await scene.locator("[data-card-id]").evaluateAll(cards => new Set(cards.map(card => card.getAttribute("data-card-id"))).size)).toBe(78);
  await page.screenshot({ path: `output/design/xingyue-ritual-v5-shuffle-${info.project.name}.png`, fullPage: true });
  const read = () => page.evaluate(() => JSON.parse(sessionStorage.getItem("tarot_reading_flow_v1")!).state);
  expect((await read()).preparation.pending).toEqual(op);
  await page.reload(); expect((await read()).preparation.pending).toEqual(op);
  await page.clock.runFor(6200);
  await expect(page.getByRole("heading", { name: "水晶正在为你切牌", exact: true })).toBeVisible();
  await expect(scene).toHaveAttribute("data-ritual-phase", "awaitCutConfig");
  expect((await read()).preparation.phase).toBe("choose-cut");
  const order = applyPreparationOperation(op, orientations).ids;
  expect(await scene.locator("[data-card-id]").evaluateAll(cards => cards.map(card => card.getAttribute("data-card-id")).reverse())).toEqual(order);
  await page.screenshot({ path: `output/design/xingyue-ritual-v5-hold-${info.project.name}.png`, fullPage: true });
  await expect(page.locator("#preparation-count")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "我来决定", exact: true })).toHaveCount(0);
  await page.clock.runFor(1000);
  await expect(scene).toHaveAttribute("data-action", /double|triple|free/);
  const washed = await read(), cut = washed.preparation.pending;
  expect(washed.shuffleCount).toBe(1); expect(washed.cutCount).toBe(0); expect(washed.preparation.cutTarget).toBe(1);
  expect(washed.shuffledDeck.map((card: { id: string }) => card.id)).toEqual(applyPreparationOperation(op, orientations).ids);
  await page.clock.runFor(1300);
  await page.screenshot({ path: `output/design/xingyue-ritual-v5-cut-${info.project.name}.png`, fullPage: true });
  await page.reload(); expect((await read()).preparation.pending).toEqual(cut);
  await page.clock.runFor(6000);
  await expect(scene).toHaveAttribute("data-action", "idle");
  await page.clock.resume();
  await expect(page).toHaveURL(/\/draw$/);
  const ready = await read(), expected = applyPreparationOperation(cut, washed.baseOrientationByCardId);
  expect(ready.cutCount).toBe(1); expect(ready.preparation.cutMethods).toHaveLength(1);
  expect(ready.shuffledDeck.map((card: { id: string }) => card.id)).toEqual(expected.ids);
  expect(ready.baseOrientationByCardId).toEqual(washed.baseOrientationByCardId);
  expect(ready.preparation.lastCommittedId).toBe(cut.id); expect(errors).toEqual([]);
});

test("reduced-motion magic retains every washing operation and one automatic cut", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/spreads"); await page.getByRole("button", { name: "通用牌阵", exact: true }).click();
  await page.getByRole("button", { name: "开始抽牌", exact: true }).click();
  await page.getByRole("button", { name: "我来决定", exact: true }).click();
  await page.getByLabel("自己指定洗牌次数", { exact: true }).fill("3");
  await page.getByRole("button", { name: "开始洗牌", exact: true }).click();
  await expect(page.getByRole("heading", { name: "水晶正在为你切牌", exact: true })).toBeVisible();
  await expect(page.locator(".preparation-scene")).toHaveAttribute("data-quality", "low");
  await expect(page.getByRole("button", { name: "交给你", exact: true })).toHaveCount(0);
  await expect(page).toHaveURL(/\/draw$/);
  const saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem("tarot_reading_flow_v1")!).state);
  expect(saved.shuffleCount).toBe(3); expect(saved.cutCount).toBe(1);
  expect(saved.preparation.countSource).toEqual({ shuffle: "manual", cut: "tarotReader" });
  expect(new Set(saved.shuffledDeck.map((card: { id: string }) => card.id)).size).toBe(78);
});
