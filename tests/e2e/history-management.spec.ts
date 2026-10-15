import { test, expect } from "@playwright/test";
import { readingFixture } from "../fixtures";

const readings = [0, 1, 2].map(index => ({ ...readingFixture(), readingId: `12345678-1234-4234-8234-${String(index).padStart(12, "0")}`, question: `测试历史 ${index + 1}` }));
test.beforeEach(async ({ page }) => {
  await page.addInitScript(readings => {
    if (!sessionStorage.getItem("history_management_seeded")) {
      localStorage.setItem("tarot_readings_v1", JSON.stringify(readings)); localStorage.setItem("tarot_card_skin_v1", "quqi");
      sessionStorage.setItem("history_management_seeded", "1");
    }
    const prototype = Storage.prototype, set = prototype.setItem, remove = prototype.removeItem;
    Object.assign(window, { historyDeleteFailure: false });
    prototype.setItem = function(key, value) { if (key === "tarot_readings_v1" && (window as unknown as { historyDeleteFailure: boolean }).historyDeleteFailure) throw new Error("Blocked"); set.call(this, key, value); };
    prototype.removeItem = function(key) { if (key === "tarot_readings_v1" && (window as unknown as { historyDeleteFailure: boolean }).historyDeleteFailure) throw new Error("Blocked"); remove.call(this, key); };
  }, readings);
});

test("history deletion confirms, cancels with Escape, preserves other records and survives reload", async ({ page }, info) => {
  await page.goto("/history"); await expect(page.locator(".history-entry")).toHaveCount(3);
  await page.getByRole("button", { name: "删除记录：测试历史 1", exact: true }).click();
  const dialog = page.getByRole("dialog"); await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "取消", exact: true })).toBeFocused();
  await page.screenshot({ path: `output/design/xingyue-history-confirm-${info.project.name}.png`, fullPage: true });
  await page.keyboard.press("Escape"); await expect(dialog).toHaveCount(0);
  expect(JSON.parse((await page.evaluate(() => localStorage.getItem("tarot_readings_v1")))!)).toEqual(readings);
  await page.getByRole("button", { name: "删除记录：测试历史 1", exact: true }).click();
  await dialog.getByRole("button", { name: "确认删除", exact: true }).evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await expect(dialog).toHaveCount(0); await expect(page.locator(".history-entry")).toHaveCount(2);
  await expect(page).toHaveURL(/\/history$/);
  expect(JSON.parse((await page.evaluate(() => localStorage.getItem("tarot_readings_v1")))!)).toEqual(readings.slice(1));
  await page.reload();
  await expect(page.locator(".history-entry")).toHaveCount(2);
  await page.screenshot({ path: `output/design/xingyue-history-overview-${info.project.name}.png`, fullPage: true });
  await page.setViewportSize({ width: 320, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `output/design/xingyue-history-management-${info.project.name}.png`, fullPage: true });
});

test("failed deletion and clearing keep all records, allow retry and preserve skin preferences", async ({ page }) => {
  await page.goto("/history"); await expect(page.locator(".history-entry")).toHaveCount(3);
  await page.evaluate(() => { (window as unknown as { historyDeleteFailure: boolean }).historyDeleteFailure = true; });
  await page.getByRole("button", { name: "删除记录：测试历史 2", exact: true }).click();
  await page.getByRole("button", { name: "确认删除", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("删除失败"); await expect(page.locator(".history-entry")).toHaveCount(3);
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await page.getByRole("button", { name: "清空历史", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("全部 3 条");
  await page.getByRole("button", { name: "确认清空", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("清空失败"); await expect(page.locator(".history-entry")).toHaveCount(3);
  await page.evaluate(() => { (window as unknown as { historyDeleteFailure: boolean }).historyDeleteFailure = false; });
  await page.getByRole("button", { name: "确认清空", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0); await expect(page.getByRole("heading", { name: "暂无抽牌记录", exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("tarot_readings_v1"))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem("tarot_card_skin_v1"))).toBe("quqi");
});
