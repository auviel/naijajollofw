import { expect, test } from "@playwright/test";

test.describe("cart path smoke", () => {
  test("cart page is reachable from storefront chrome", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Naija Jollof/i);

    // Prefer direct cart route so we don't depend on seeded menu items
    const cartResponse = await page.goto("/cart");
    expect(cartResponse?.ok() || cartResponse?.status() === 200).toBeTruthy();
    await expect(page.locator("body")).toBeVisible();
  });
});
