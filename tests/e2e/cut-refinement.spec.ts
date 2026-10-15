import { expect, test } from "@playwright/test";
import { tarotCards } from "../../src/data/tarotCards";
import { spreads, toTarotSpread } from "../../src/data/spreads";
import { applyPreparationOperation, createMagicPreparationOperation, emptyPreparation } from "../../src/lib/preparation";

// Exercise the retained sleeve/hand fallback. The normal staff path is covered separately.
test.beforeEach(async ({ page }) => { await page.route("**/characters/*/staff-v1.png", route => route.abort()); });

for (const character of ["star-moon", "scholar", "quqi", "star-cap"]) test(`joined sleeves and a floating block cut stay connected for ${character}`, async ({ page }, info) => {
  const operation = createMagicPreparationOperation(tarotCards.map(card => card.id), "cut", "triple");
  const orientations = Object.fromEntries(tarotCards.map((card, index) => [card.id, index % 2 ? "upright" as const : "reversed" as const]));
  const snapshot = { question: "切牌动作核对", contextInfo: "", selectedSpread: toTarotSpread(spreads[0], 3), shuffledDeck: tarotCards, selectedCards: [],
    baseOrientationByCardId: orientations, readingId: null, readingCreatedAt: null, shuffleCount: 1, cutCount: 0,
    preparation: { ...emptyPreparation(), phase: "cutting", shuffleTarget: 1, cutTarget: 1, pending: operation } };
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(({ snapshot, character }) => {
    if (!sessionStorage.getItem("tarot_reading_flow_v1")) sessionStorage.setItem("tarot_reading_flow_v1", JSON.stringify({ version: 3, state: snapshot }));
    localStorage.setItem("tarot_dealer_character_v1", character);
  }, { snapshot, character });
  const time = new Date("2026-10-11T00:00:00Z");
  await page.clock.install({ time }); await page.clock.pauseAt(time);
  await page.goto("/shuffle");
  const scene = page.locator(".preparation-scene");
  await expect(scene).toHaveAttribute("data-character", character);
  await expect(scene).toHaveAttribute("data-asset-state", "loaded");
  await expect(scene.locator("[data-cuff='integrated']")).toHaveCount(2);
  await expect(scene.locator("[data-sleeve]")).toHaveCount(4);
  const hands = scene.locator("[data-hand]");
  for (const hand of await hands.all()) {
    await expect(hand).toHaveAttribute("data-hand-turn", "1.0000");
    await expect(hand.locator("[data-key-pose='back']")).toHaveAttribute("opacity", "0.0000");
    await expect(hand.locator("[data-key-pose='palm']")).toHaveAttribute("opacity", "1.0000");
  }
  for (const [advance, beat, view] of [[400, "cut-split", "palm"], [400, "cut-pause", null], [600, "cut-exchange", null],
    [850, "cut-stack", null], [700, "settling", null], [750, "settling", "return"]] as const) {
    await page.clock.runFor(advance);
    await expect(scene).toHaveAttribute("data-beat", beat);
    const gaps = await scene.locator("[data-arm-rig='joined']").evaluateAll(arms => arms.map(arm => {
      const forearm = arm.querySelector<SVGGraphicsElement>("[data-sleeve='forearm']")!;
      const cuff = arm.querySelector<SVGGraphicsElement>("[data-cuff]")!;
      const end = new DOMPoint(0, Number(forearm.getAttribute("data-bone-length"))).matrixTransform(forearm.getCTM()!);
      const wrist = new DOMPoint(0, 0).matrixTransform(cuff.getCTM()!);
      return Math.hypot(end.x - wrist.x, end.y - wrist.y);
    }));
    expect(gaps).toHaveLength(2); expect(gaps.every(gap => gap < .02)).toBe(true);
    const poses = await hands.evaluateAll(arms => arms.map(arm => ({
      back: Number(arm.querySelector("[data-key-pose='back']")?.getAttribute("opacity")),
      side: Number(arm.querySelector("[data-key-pose='side']")?.getAttribute("opacity")),
      palm: Number(arm.querySelector("[data-key-pose='palm']")?.getAttribute("opacity")),
      grip: Number(arm.querySelector("[data-key-pose='grip']")?.getAttribute("opacity")),
    })));
    expect(poses.every(pose => Math.abs(pose.back + pose.side + pose.palm + pose.grip - 1) < .001)).toBe(true);
    if (view === "palm") {
      expect(poses.every(pose => pose.palm + pose.grip > .999 && pose.back === 0)).toBe(true);
      expect(poses[1].grip).toBeGreaterThan(.8); expect(poses[0].grip).toBeLessThan(.35);
      await expect(scene.locator("[data-stable-cuff]")).toHaveCount(2);
    }
    if (view === "return") expect(poses.every(pose => pose.back > .8 && pose.palm === 0)).toBe(true);
    await expect(scene.locator("[data-card-id]")).toHaveCount(78);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (beat === "cut-pause") await page.screenshot({ path: `output/design/xingyue-cut-refined-${character}-${info.project.name}.png`, fullPage: true });
    if (view && view !== "return") await page.screenshot({ path: `output/design/xingyue-hand-turn-${view}-${character}-${info.project.name}.png`, fullPage: true });
  }
  await page.reload();
  const saved = () => page.evaluate(() => JSON.parse(sessionStorage.getItem("tarot_reading_flow_v1")!).state);
  expect((await saved()).preparation.pending).toEqual(operation);
  await page.clock.runFor(6000); await page.clock.resume();
  await expect(page).toHaveURL(/\/draw$/);
  const ready = await saved();
  expect(ready.cutCount).toBe(1);
  expect(ready.shuffledDeck.map((card: { id: string }) => card.id)).toEqual(applyPreparationOperation(operation, orientations).ids);
  expect(ready.baseOrientationByCardId).toEqual(orientations);
  expect(errors).toEqual([]);
});
