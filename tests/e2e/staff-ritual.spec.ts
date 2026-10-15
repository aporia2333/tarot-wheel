import { expect, test } from "@playwright/test";

test("four staff portraits keep their painted materials stable while joined performance and all cards respond", async ({ page }, info) => {
  test.setTimeout(90_000);
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  const before = await page.evaluate(() => sessionStorage.getItem("tarot_reading_flow_v1")).catch(() => null);
  for (const [id, name] of [["star-moon","星月"],["scholar","学者"],["quqi","曲奇猫"],["star-cap","星帽猫"]]) {
    await page.goto("/design-preview?view=motion&debug=1");
    await page.getByRole("button", { name:"占卜师选择", exact:true }).click(); await page.getByRole("button", { name, exact:true }).click();
    const scene = page.locator(".preparation-scene");
    await expect(scene).toHaveAttribute("data-casting", "staff");
    await page.getByLabel("回放动作", { exact:true }).selectOption("packets"); await page.getByRole("button", { name:"载入固定种子", exact:true }).click();
    const painting = await scene.locator("[data-staff-body]").evaluate(node => node.innerHTML);
    const foreground = await scene.locator("[data-staff-foreground]").evaluate(node => [...node.querySelectorAll('image')].map(image=>image.getAttribute('href')));
    for (const p of ["0.05","0.4","0.7","0.99"]) {
      await page.getByLabel("回放进度", { exact:true }).fill(p);
      expect(await scene.locator("[data-staff-body]").evaluate(node => node.innerHTML)).toBe(painting);
      expect(await scene.locator("[data-staff-foreground]").evaluate(node => [...node.querySelectorAll('image')].map(image=>image.getAttribute('href')))).toEqual(foreground);
      await expect(scene.locator("[data-hand], [data-finger-rig], [data-cloth-triangle]")).toHaveCount(0);
      await expect(scene.locator("[data-card-id]")).toHaveCount(78);
    }
    await page.getByLabel("回放进度", { exact:true }).fill("0.65");
    expect(Number(await scene.locator("[data-staff-conduit]").getAttribute("opacity"))).toBeGreaterThan(.1);
    expect(Number(await scene.locator("[data-crystal-mist]").getAttribute("opacity"))).toBeGreaterThan(.1);
    await page.screenshot({path:`output/design/xingyue-staff-${id}-${info.project.name}.png`,fullPage:true});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(await page.evaluate(() => sessionStorage.getItem("tarot_reading_flow_v1"))).toBe(before); expect(errors).toEqual([]);
});

test("staff blink changes eyes only and existing click dialogue preserves the question", async ({ page }) => {
  const time = new Date("2026-10-13T00:00:00Z"); await page.clock.install({time}); await page.clock.pauseAt(time);
  await page.goto("/"); const scene=page.locator(".preparation-scene"); await expect(scene).toHaveAttribute("data-casting","staff");
  await page.getByLabel("你的问题",{exact:true}).fill("持杖后保留的问题");
  const body=await scene.locator("[data-staff-body]").evaluate(node=>node.innerHTML);
  let blink=false; for(let i=0;i<75&&!blink;i++){await page.clock.runFor(100);blink=await scene.locator("[data-staff-blink]").count()===1;}
  expect(blink).toBe(true); expect(await scene.locator("[data-staff-body]").evaluate(node=>node.innerHTML)).toBe(body);
  await page.clock.runFor(180); await expect(scene.locator("[data-staff-blink]")).toHaveCount(0);
  await page.getByRole("button",{name:"与星月交谈",exact:true}).click(); await expect(page.getByLabel("你的问题",{exact:true})).toHaveValue("持杖后保留的问题");
});

test("late or failed staff images keep the active plan and reduced motion keeps the fixed pose", async ({ page }) => {
  let release:()=>void=()=>{};const ready=new Promise<void>(resolve=>{release=resolve;});
  await page.route("**/characters/star-moon/staff-v1.png",async route=>{await ready;await route.continue();});
  await page.goto("/design-preview?view=motion&debug=1");
  await page.getByRole("button",{name:"载入固定种子",exact:true}).click();await page.getByLabel("回放进度",{exact:true}).fill("0.6");
  const scene=page.locator(".preparation-scene"); const cards=await scene.locator("[data-card-id]").evaluateAll(nodes=>nodes.map(node=>[node.getAttribute("data-card-id"),node.getAttribute("transform")]));
  release();await expect(scene).toHaveAttribute("data-casting","staff");
  expect(await scene.locator("[data-card-id]").evaluateAll(nodes=>nodes.map(node=>[node.getAttribute("data-card-id"),node.getAttribute("transform")]))).toEqual(cards);
  await page.emulateMedia({reducedMotion:"reduce"});await page.reload();await page.getByRole("button",{name:"载入固定种子",exact:true}).click();
  await expect(scene).toHaveAttribute("data-casting","staff");await expect(scene.locator("[data-staff-conduit]")).toHaveAttribute("opacity","0.0000");
  await expect(scene.locator("[data-staff-charge-ring]")).toHaveAttribute("transform","rotate(0) scale(1)");
  await page.unroute("**/characters/star-moon/staff-v1.png");await page.route("**/characters/star-moon/staff-v1.png",route=>route.abort());await page.reload();
  await expect(scene).toHaveAttribute("data-staff-state","fallback");await expect(scene).toHaveAttribute("data-casting","hands");
  await expect(scene.locator("[data-hand]")).toHaveCount(2);
});
