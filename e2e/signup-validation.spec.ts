import { expect, test } from "@playwright/test";

test.describe("diner signup validation", () => {
  test("empty submit shows field errors", async ({ page }) => {
    await page.goto("/signup");
    const submit = page.getByRole("button", { name: "Create account" });
    await expect(submit).toBeEnabled();
    await submit.click();

    await expect(page.locator("#name-error")).toBeVisible();
    await expect(page.locator("#email-error")).toBeVisible();
    await expect(page.locator("#phone-error")).toBeVisible();
    await expect(page.locator("#password-error")).toBeVisible();
    await expect(page).toHaveURL(/\/signup/);
  });
});
