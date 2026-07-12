import { expect, test } from "@playwright/test";

test.describe("staff login smoke", () => {
  test("login page shows email and password fields", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });

  test("unauthenticated /staff and /dashboard redirect to login", async ({
    page,
  }) => {
    await page.goto("/staff");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByLabel("Email")).toBeVisible();

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByLabel("Email")).toBeVisible();
  });
});
