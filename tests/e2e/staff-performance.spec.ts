import {expect,test} from "@playwright/test";

for(const [role,name] of [["star-moon","星月"],["scholar","学者"],["quqi","曲奇猫"],["star-cap","星帽猫"]]){
test(`${role} concentrates, releases, controls and relaxes without altering card identity`,async({page},info)=>{
  test.setTimeout(90_000);
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto("/design-preview?view=motion&debug=1");
  await page.getByRole("button",{name:"占卜师选择",exact:true}).click();
  await page.getByRole("button",{name,exact:true}).click();
  const scene=page.locator(".preparation-scene");
  await expect(scene.locator("[data-staff-portrait]")).toHaveAttribute("data-acting-material","loaded");
  const stored=await page.evaluate(()=>sessionStorage.getItem("tarot_reading_flow_v1"));
  await page.getByLabel("回放动作",{exact:true}).selectOption("packets");await page.getByRole("button",{name:"载入固定种子",exact:true}).click();
  const ids=await scene.locator("[data-card-id]").evaluateAll(nodes=>nodes.map(n=>n.getAttribute("data-card-id")).sort());
  for(const [p,name] of [["0","rest"],["0.12","focus"],["0.21","release"],["0.65","active"]]){
    await page.getByLabel("回放进度",{exact:true}).fill(p);
    await page.screenshot({path:`output/design/xingyue-performance-${role}-${name}-${info.project.name}.png`,fullPage:true});
    expect(await scene.locator("[data-card-id]").evaluateAll(nodes=>nodes.map(n=>n.getAttribute("data-card-id")).sort())).toEqual(ids);
  }
  await expect(scene.locator("[data-staff-performance]")).toHaveAttribute("data-expression","active");
  await expect(scene.locator("[data-staff-free-arm='foreground']")).toHaveAttribute("opacity","0");
  expect(Number(await scene.locator("[data-staff-conduit]").getAttribute("opacity"))).toBeGreaterThan(.35);
  const grip=await scene.locator("[data-staff-grip-unit='background']").getAttribute("transform");
  expect(await scene.locator("[data-staff-grip-unit='foreground']").getAttribute("transform")).toBe(grip);
  const firstFlow=await scene.locator("[data-magic-flow]").getAttribute("stroke-dashoffset");
  await page.getByLabel("回放进度",{exact:true}).fill("0.7");
  expect(await scene.locator("[data-magic-flow]").getAttribute("stroke-dashoffset")).not.toBe(firstFlow);
  await page.getByLabel("回放动作",{exact:true}).selectOption("triple");await page.getByRole("button",{name:"载入固定种子",exact:true}).click();
  await page.getByLabel("回放进度",{exact:true}).fill("0.96");
  await expect(scene.locator("[data-staff-performance]")).toHaveAttribute("data-expression","smile");
  await page.screenshot({path:`output/design/xingyue-performance-${role}-smile-${info.project.name}.png`,fullPage:true});
  expect(await page.evaluate(()=>sessionStorage.getItem("tarot_reading_flow_v1"))).toBe(stored);expect(errors).toEqual([]);
});
}

test("late performance material adopts the current pose without moving cards; failure keeps the fixed grip",async({page})=>{
  let release=()=>{};const gate=new Promise<void>(resolve=>{release=resolve;});
  await page.route("**/characters/star-moon/staff-acting-v1.png",async route=>{await gate;await route.continue();});
  await page.goto("/design-preview?view=motion&debug=1");
  const scene=page.locator(".preparation-scene");
  await expect(scene.locator("[data-staff-portrait]")).toHaveAttribute("data-acting-material","fallback");
  await page.getByRole("button",{name:"载入固定种子",exact:true}).click();
  await page.getByLabel("回放进度",{exact:true}).fill("0.6");
  const cards=await scene.locator("[data-card-id]").evaluateAll(nodes=>nodes.map(node=>[node.getAttribute("data-card-id"),node.getAttribute("transform")]));
  release();await expect(scene.locator("[data-staff-portrait]")).toHaveAttribute("data-acting-material","loaded");
  expect(await scene.locator("[data-card-id]").evaluateAll(nodes=>nodes.map(node=>[node.getAttribute("data-card-id"),node.getAttribute("transform")]))).toEqual(cards);
  await expect(scene.locator("[data-staff-performance]")).toHaveAttribute("data-expression","active");
  await page.unroute("**/characters/star-moon/staff-acting-v1.png");
  await page.route("**/characters/star-moon/staff-acting-v1.png",route=>route.abort());await page.reload();
  await expect(scene).toHaveAttribute("data-casting","staff");
  await expect(scene.locator("[data-staff-portrait]")).toHaveAttribute("data-acting-material","fallback");
  await page.getByRole("button",{name:"载入固定种子",exact:true}).click();await page.getByLabel("回放进度",{exact:true}).fill("0.6");
  await expect(scene.locator("[data-card-id]")).toHaveCount(78);await expect(scene.locator("[data-hand]")).toHaveCount(0);
  await expect(scene.locator("[data-staff-grip-unit]")).toHaveCount(1);
});
