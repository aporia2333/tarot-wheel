import { expect, type Page } from "@playwright/test";

export async function drawFromTable(page: Page, indexes: number[], direction: "up" | "down" = "up") {
  for (const index of indexes) {
    const card = page.getByRole("button", { name: `选择第 ${index + 1} 张牌`, exact: true });
    await expect(card).toBeEnabled();
    await card.press("Enter");
    await card.press(direction === "up" ? "ArrowUp" : "ArrowDown");
    await expect(page.getByRole("button", { name: `已抽出第 ${index + 1} 张牌`, exact: true })).toBeDisabled();
    await expect(page.getByLabel("双排抽牌牌桌", { exact: true })).toHaveAttribute("aria-busy", "false");
  }
}
