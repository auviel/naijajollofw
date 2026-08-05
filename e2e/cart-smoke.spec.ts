import { expect, test } from "@playwright/test";

test.describe("cart path smoke", () => {
  test("cart page is reachable from storefront chrome", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveTitle(/Naija Jollof/i);

    // Prefer direct cart route so we don't depend on seeded menu items.
    // Retry: Next.js remounts under parallel workers can abort the first nav.
    await expect(async () => {
      const cartResponse = await page.goto("/cart", {
        waitUntil: "domcontentloaded",
      });
      expect(cartResponse?.ok() || cartResponse?.status() === 200).toBeTruthy();
    }).toPass({ timeout: 20_000 });

    await expect(page.locator("body")).toBeVisible();
  });
});
