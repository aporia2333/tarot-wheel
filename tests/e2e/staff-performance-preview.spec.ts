import {expect,test} from "@playwright/test";

test.use({video:process.env.RECORD_CRYSTAL_REVIEW==="1"?"on":"off"});
test("staff performance plays at natural speed and maintains the gesture until cutting ends",async({page,context},info)=>{
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/design-preview?view=motion");
  const scene=page.locator(".preparation-scene");
  await expect(scene.locator("[data-staff-portrait]")).toHaveAttribute("data-acting-material","loaded");
  await page.getByRole("button",{name:"播放洗牌",exact:true}).click();
  await expect.poll(()=>scene.locator("[data-staff-performance]").getAttribute("data-expression"),{intervals:[50],timeout:3000}).toBe("focus");
  await expect.poll(async()=>Number(await scene.locator("[data-crystal-arrival]").getAttribute("opacity")),{intervals:[50],timeout:3000}).toBeGreaterThan(.15);
  await expect(scene.locator("[data-staff-performance]")).toHaveAttribute("data-expression","active");
  await expect(scene.locator("[data-staff-free-arm='foreground']")).toHaveAttribute("opacity","0");
  await expect(page.getByRole("button",{name:"播放洗牌",exact:true})).toBeEnabled({timeout:9000});
  await expect(scene.locator("[data-staff-performance]")).toHaveAttribute("data-expression","active");
  await page.getByRole("button",{name:"播放切牌",exact:true}).click();
  await expect.poll(()=>scene.locator("[data-staff-performance]").getAttribute("data-expression"),{intervals:[50],timeout:6000}).toBe("smile");
  await expect(page.getByRole("button",{name:"播放洗牌",exact:true})).toBeEnabled({timeout:5000});
  await expect(scene.locator("[data-staff-performance]")).toHaveAttribute("data-expression","smile");
  await expect(scene.locator("[data-staff-free-arm='foreground']")).toHaveAttribute("data-withdraw","0.0000");
  await page.screenshot({path:`output/design/xingyue-performance-finish-${info.project.name}.png`,fullPage:true});
  expect(errors).toEqual([]);
  const video=page.video();await context.close();await video?.saveAs(`output/design/xingyue-staff-performance-${info.project.name}.webm`);
});
