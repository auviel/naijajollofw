import { expect, test } from "@playwright/test";

test.describe("diner signup validation", () => {
  test("empty submit shows field errors", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByLabel("Name")).toBeVisible();
    const submit = page.getByRole("button", { name: "Create account" });
    await expect(submit).toBeEnabled();

    // Client hydration can lag under parallel Next.js workers — retry until
    // the React submit handler has attached and surfaced field errors.
    await expect(async () => {
      await submit.click();
      await expect(page.locator("#name-error")).toBeVisible({ timeout: 1_500 });
    }).toPass({ timeout: 20_000 });

    await expect(page.locator("#email-error")).toBeVisible();
    await expect(page.locator("#phone-error")).toBeVisible();
    await expect(page.locator("#password-error")).toBeVisible();
    await expect(page).toHaveURL(/\/signup/);
  });
});
