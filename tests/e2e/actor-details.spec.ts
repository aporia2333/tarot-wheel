import { expect, test } from "@playwright/test";

// The articulated hands remain the compatibility fallback for unavailable staff art.
test.beforeEach(async ({ page }) => { await page.route("**/characters/*/staff-v1.png", route => route.abort()); });

test("four painted dealers use independent eyes, anchored locks and joined digit bones without changing reading state", async ({ page }, info) => {
  test.setTimeout(90_000);
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/design-preview?view=motion&debug=1");
  const scene = page.locator(".preparation-scene");
  const before = await page.evaluate(() => sessionStorage.getItem("tarot_reading_flow_v1"));
  for (const [id, name, digits] of [["star-moon", "星月", 5], ["scholar", "学者", 5], ["quqi", "曲奇猫", 4], ["star-cap", "星帽猫", 4]] as const) {
    if (id !== "star-moon") {
      // Fixed-progress inspection deliberately locks the active dealer. Leave
      // that isolated replay before selecting the next character.
      await page.goto("/design-preview?view=motion&debug=1");
      await page.getByRole("button", { name: "占卜师选择", exact: true }).click(); await page.getByRole("button", { name, exact: true }).click();
    }
    await expect(scene).toHaveAttribute("data-rig-state", "loaded"); await expect(scene).toHaveAttribute("data-portrait-state", "loaded");
    await page.getByLabel("回放动作", { exact: true }).selectOption("triple");
    await page.getByRole("button", { name: "载入固定种子", exact: true }).click();
    await page.getByLabel("回放进度", { exact: true }).fill("0");
    const body = await scene.locator("[data-painted-portrait]").evaluate(element => element.innerHTML);
    await page.getByLabel("回放进度", { exact: true }).fill("0.24");
    await expect(scene.locator("[data-eyeball]")).toHaveCount(2); await expect(scene.locator("[data-hair-strand]")).toHaveCount(2);
    await expect(scene.locator("[data-finger-rig='skeletal']")).toHaveCount(2);
    for (const hand of await scene.locator("[data-finger-rig='skeletal']").all()) {
      await expect(hand.locator("[data-digit]")).toHaveCount(digits);
      const angles = await hand.locator("[data-finger-bone]").evaluateAll(bones => bones.map(bone => Number(bone.getAttribute("data-joint-angle"))));
      expect(angles.every(Number.isFinite)).toBe(true); expect(Math.max(...angles)).toBeGreaterThan(0);
      expect(new Set(angles).size).toBeGreaterThan(2);
    }
    const eyeTransforms = await scene.locator("[data-eyeball]").evaluateAll(eyes => eyes.map(eye => eye.getAttribute("transform")));
    expect(eyeTransforms.every(value => value?.startsWith("translate("))).toBe(true);
    expect(await scene.locator("[data-painted-portrait]").evaluate(element => element.innerHTML)).toBe(body);
    await page.getByLabel("回放进度", { exact: true }).fill("0.56");
    expect(Number(await scene.locator("[data-eye-attention]").getAttribute("data-eye-attention"))).toBeGreaterThan(.8);
    await expect(scene.locator("[data-gaze-layer]")).toHaveAttribute("data-eye-expression", id === "quqi" || id === "star-cap" ? "focus" : "normal");
    if (id === "quqi" || id === "star-cap") {
      const centers = await scene.locator("[data-eye-socket]").evaluateAll(eyes => eyes.map(eye => Number(eye.getAttribute("data-eye-center")?.split(",")[1])));
      expect(centers.every(y => id === "quqi" ? y > 96 && y < 99 : y > 139 && y < 142)).toBe(true);
    }
    expect(await scene.locator("[data-hair-strand]").evaluateAll(locks => locks.every(lock => Math.abs(Number(lock.getAttribute("data-strand-angle"))) <= .65))).toBe(true);
    await page.screenshot({ path: `output/design/xingyue-actor-details-${id}-${info.project.name}.png`, fullPage: true });
    await page.getByLabel("回放进度", { exact: true }).fill("0.999");
  }
  expect(await page.evaluate(() => sessionStorage.getItem("tarot_reading_flow_v1"))).toBe(before);
  expect(errors).toEqual([]);
});

test("cloth painting deforms through skinning on desktop and simplifies when reduced or assets fail", async ({ page }, info) => {
  await page.goto("/design-preview?view=motion&debug=1");
  await expect(page.locator(".preparation-scene")).toHaveAttribute("data-rig-state", "loaded");
  await page.getByRole("button", { name: "载入固定种子", exact: true }).click();
  await page.getByLabel("回放进度", { exact: true }).fill("0.4");
  if (info.project.name === "desktop") await expect(page.locator("[data-cloth-triangle]")).toHaveCount(32);
  else await expect(page.locator("[data-cloth-triangle]")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "reduce" }); await page.reload();
  await page.getByRole("button", { name: "载入固定种子", exact: true }).click();
  await expect(page.locator("[data-cloth-triangle]")).toHaveCount(0);
  await page.route("**/characters/star-moon/limbs-v1.png", route => route.abort()); await page.reload();
  await expect(page.locator(".preparation-scene")).toHaveAttribute("data-rig-state", "fallback");
  await page.getByRole("button", { name: "载入固定种子", exact: true }).click();
  await expect(page.locator("[data-finger-rig]")).toHaveCount(0);
  await expect(page.locator("[data-cloth-triangle]")).toHaveCount(0);
});

test("late finger material loads preserve the frozen wrist and failures retain complete painted hands", async ({ page }) => {
  let release: () => void = () => {};
  const ready = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/characters/star-moon/fingers-v1.png", async route => { await ready; await route.continue(); });
  await page.goto("/design-preview?view=motion&debug=1");
  const scene = page.locator(".preparation-scene");
  await expect(scene).toHaveAttribute("data-rig-state", "loaded");
  await page.getByLabel("回放动作", { exact: true }).selectOption("triple");
  await page.getByRole("button", { name: "载入固定种子", exact: true }).click();
  await page.getByLabel("回放进度", { exact: true }).fill("0.24");
  const before = await scene.locator("[data-hand]").evaluateAll(hands => hands.map(hand => hand.getAttribute("data-grip")));
  await expect(scene.locator("[data-finger-rig='skeletal']")).toHaveCount(0);
  release();
  await expect(scene.locator("[data-finger-rig='skeletal']")).toHaveCount(2);
  expect(await scene.locator("[data-hand]").evaluateAll(hands => hands.map(hand => hand.getAttribute("data-grip")))).toEqual(before);
  await page.unroute("**/characters/star-moon/fingers-v1.png");
  await page.route("**/characters/star-moon/fingers-v1.png", route => route.abort());
  await page.reload(); await page.getByRole("button", { name: "载入固定种子", exact: true }).click();
  await page.getByLabel("回放进度", { exact: true }).fill("0.24");
  await expect(scene.locator("[data-finger-rig='skeletal']")).toHaveCount(0);
  await expect(scene.locator("[data-key-pose='palm'] image")).toHaveCount(2);
});
