import { expect, type Page } from "@playwright/test";

export async function prepareDeck(page: Page, shuffleCount = 1) {
  await expect(page.getByRole("heading", { name: "先洗几次牌？", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "我来决定", exact: true }).click();
  await page.getByLabel("自己指定洗牌次数", { exact: true }).fill(String(shuffleCount));
  await page.getByRole("button", { name: "开始洗牌", exact: true }).click();
  await expect(page.getByRole("heading", { name: "水晶正在为你切牌", exact: true })).toBeVisible({ timeout: 35_000 });
  await expect(page.getByLabel("自己指定切牌次数", { exact: true })).toHaveCount(0);
  await expect(page).toHaveURL(/\/draw$/, { timeout: 15_000 });
}
