import { test, expect } from "@playwright/test";
import { tarotCards } from "../../src/data/tarotCards";
import { toTarotSpread, spreads } from "../../src/data/spreads";
import { applyPreparationOperation, createPreparationOperation, emptyPreparation } from "../../src/lib/preparation";

test.use({ video: { mode: process.env.RECORD_MOTION_REVIEW === "1" ? "on" : "off", size: { width:1280, height:720 } } });
test("supported overhand plays in real time, preserves a pending plan on reload and commits once", async ({ page, context }, info) => {
  const op = createPreparationOperation(tarotCards.map(card=>card.id),"shuffle","overhand");
  const orientations = Object.fromEntries(tarotCards.map(card=>[card.id,"upright" as const]));
  const snapshot = { question:"动作验证",contextInfo:"",selectedSpread:toTarotSpread(spreads[0],3),shuffledDeck:tarotCards,selectedCards:[],
    baseOrientationByCardId:orientations,readingId:null,readingCreatedAt:null,shuffleCount:0,cutCount:0,
    preparation:{...emptyPreparation(),phase:"shuffling",shuffleTarget:1,pending:op} };
  const errors: string[] = []; page.on("pageerror",error=>errors.push(error.message));
  await page.addInitScript(snapshot=>{
    if(!sessionStorage.getItem("tarot_reading_flow_v1"))sessionStorage.setItem("tarot_reading_flow_v1",JSON.stringify({version:3,state:snapshot}));
    localStorage.setItem("tarot_dealer_character_v1","quqi"); localStorage.setItem("tarot_card_skin_v1","quqi");
  },snapshot);
  await page.goto("/shuffle");
  const scene = page.locator(".preparation-scene");
  await expect(scene).toHaveAttribute("data-motion","supported-overhand");
  await expect(scene).toHaveAttribute("data-asset-state","loaded");
  await expect.poll(async()=>Number(await scene.getAttribute("data-transferred"))).toBeGreaterThan(0);
  expect(await scene.locator("g[data-packet]").evaluateAll(piles=>piles.reduce((sum,pile)=>sum+Number(pile.getAttribute("data-card-count")),0))).toBe(78);
  await page.screenshot({path:`output/design/xingyue-overhand-${info.project.name}.png`});
  const beforeReload = await page.evaluate(()=>JSON.parse(sessionStorage.getItem("tarot_reading_flow_v1")!).state.preparation.pending);
  expect(beforeReload).toEqual(op);
  await page.reload();
  expect(await page.evaluate(()=>JSON.parse(sessionStorage.getItem("tarot_reading_flow_v1")!).state.preparation.pending)).toEqual(op);
  await expect(page.getByRole("heading",{name:"水晶正在为你切牌",exact:true})).toBeVisible({timeout:12_000});
  const after = await page.evaluate(()=>JSON.parse(sessionStorage.getItem("tarot_reading_flow_v1")!).state);
  const expected = applyPreparationOperation(op,orientations);
  expect(after.shuffledDeck.map((card:{id:string})=>card.id)).toEqual(expected.ids);
  expect(after.baseOrientationByCardId).toEqual(expected.orientations);
  expect(after.shuffleCount).toBe(1); expect(after.preparation.shuffleMethods).toEqual(["overhand"]); expect(errors).toEqual([]);
  const video = page.video(); await context.close();
  await video?.saveAs(`output/design/xingyue-overhand-${info.project.name}.webm`);
});
