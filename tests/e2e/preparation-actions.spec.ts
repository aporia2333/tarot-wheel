import { expect, test } from "@playwright/test";
import { tarotCards } from "../../src/data/tarotCards";
import { spreads, toTarotSpread } from "../../src/data/spreads";
import { applyPreparationOperation, createPreparationOperation, CUT_ACTIONS, emptyPreparation, SHUFFLE_ACTIONS } from "../../src/lib/preparation";
import { preparationPlaybackMs } from "../../src/lib/preparationMotion";

for (const action of [...SHUFFLE_ACTIONS, ...CUT_ACTIONS]) test(`animation ${action} lands the planned deck on desktop and touch layouts`, async ({ page }, info) => {
  const stage = CUT_ACTIONS.includes(action as never) ? "cut" : "shuffle";
  const operation = createPreparationOperation(tarotCards.map((card) => card.id), stage, action);
  const orientations = Object.fromEntries(tarotCards.map((card, index) => [card.id, index % 2 ? "upright" as const : "reversed" as const]));
  const snapshot = { question: "动画验收", contextInfo: "", selectedSpread: toTarotSpread(spreads[0], 3), shuffledDeck: tarotCards, selectedCards: [],
    baseOrientationByCardId: orientations, readingId: null, readingCreatedAt: null, shuffleCount: stage === "cut" ? 1 : 0, cutCount: 0,
    preparation: { ...emptyPreparation(), phase: stage === "cut" ? "cutting" : "shuffling", shuffleTarget: stage === "cut" ? 1 : 2, cutTarget: stage === "cut" ? 1 : 0, pending: operation } };
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  const dealerId = action === "overhand" ? "quqi" : action === "riffle" ? "star-cap" : "star-moon";
  await page.addInitScript(({ snapshot, dealerId }) => {
    sessionStorage.setItem("tarot_reading_flow_v1", JSON.stringify({ version: 3, state: snapshot }));
    localStorage.setItem("tarot_dealer_character_v1", dealerId);
  }, { snapshot, dealerId });
  const initialTime = new Date("2026-10-10T00:00:00Z");
  await page.clock.install({ time: initialTime }); await page.clock.pauseAt(initialTime);
  await page.goto("/shuffle");
  const scene = page.locator(".preparation-scene");
  await expect(scene).toHaveAttribute("data-action", action);
  await expect(scene).toHaveAttribute("data-asset-state", "loaded");
  await expect(scene).toHaveAttribute("data-character", dealerId);
  const duration = preparationPlaybackMs(operation);
  await page.clock.runFor(duration * .28);
  const progress = Number(await scene.getAttribute("data-progress")); expect(progress).toBeGreaterThan(.25); expect(progress).toBeLessThan(.3);
  expect(await scene.locator("g[data-packet]").count()).toBeLessThanOrEqual(12);
  await expect(scene.locator("g[data-hand]")).toHaveCount(2);
  expect(await scene.locator("g[data-packet]").evaluateAll((packets) => new Set(packets.map((packet) => packet.getAttribute("transform"))).size)).toBeGreaterThan(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `output/playwright/preparation-action-${action}-${info.project.name}.png`, fullPage: true });
  await page.clock.runFor(duration * .75 + 100);
  if (stage === "cut") {
    await expect(scene).toHaveAttribute("data-action", "idle");
    await page.clock.resume();
    await expect(page).toHaveURL(/\/draw$/);
  }
  else await expect(scene).not.toHaveAttribute("data-action", action);
  const after = await page.evaluate(() => JSON.parse(sessionStorage.getItem("tarot_reading_flow_v1")!).state);
  const expected = applyPreparationOperation(operation, orientations);
  expect(after.shuffledDeck.map((card: { id: string }) => card.id)).toEqual(expected.ids);
  expect(after.baseOrientationByCardId).toEqual(expected.orientations);
  expect(after.preparation.lastCommittedId).toBe(operation.id); expect(errors).toEqual([]);
});
