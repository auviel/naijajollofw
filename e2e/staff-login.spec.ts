import { expect, test } from "@playwright/test";

test.describe("staff login smoke", () => {
  test("login page shows email and password fields", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });
});
