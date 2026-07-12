import { expect, test } from "@playwright/test";

test.describe("storefront smoke", () => {
  test("home page loads restaurant branding", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.ok() || response?.status() === 200).toBeTruthy();

    await expect(page.locator("body")).toBeVisible();
    // Brand appears in title and/or visible chrome
    await expect(page).toHaveTitle(/Naija Jollof/i);
  });

  test("menu or empty catalog still renders main content", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#main-content")).toBeVisible();
  });
});
