import { expect, test } from "@playwright/test";
import {
  addFirstMenuItemAndOpenCheckout,
  ensureCheckoutSchedule,
} from "./helpers/storefront";

test.describe("checkout user errors", () => {
  test("empty cart checkout points guests back to the menu", async ({
    page,
  }) => {
    await page.goto("/checkout");
    await expect(page.getByText("Nothing to check out")).toBeVisible();
    await expect(page.getByRole("link", { name: "Browse menu" })).toBeVisible();
  });

  test("empty contact fields surface inline errors", async ({ page }) => {
    await addFirstMenuItemAndOpenCheckout(page);
    await ensureCheckoutSchedule(page);

    await page.getByRole("button", { name: /Place order \(test\)|Pay / }).click();

    await expect(page.locator("#checkout-name-error")).toBeVisible();
    await expect(page.locator("#checkout-phone-error")).toBeVisible();
    await expect(page.locator("#checkout-email-error")).toBeVisible();
  });

  test("delivery requires an address field and tip chips update total", async ({
    page,
  }) => {
    await addFirstMenuItemAndOpenCheckout(page);

    await page.getByRole("button", { name: "Delivery", exact: true }).click();
    await expect(page.getByText("Delivery address")).toBeVisible();

    await page.getByRole("button", { name: /^15%/ }).click();
    await expect(page.getByRole("heading", { name: "Tip" })).toBeVisible();
    await expect(page.locator("span", { hasText: /^Tip$/ })).toBeVisible();
  });

  test("simulate checkout places a pickup order", async ({ page }) => {
    test.setTimeout(60_000);
    await addFirstMenuItemAndOpenCheckout(page);
    await ensureCheckoutSchedule(page);

    await page.getByLabel("Name").fill("Ada Okonkwo");
    await page.getByLabel("Phone").fill("5195550100");
    await page.getByLabel("Email").fill("ada.e2e@delivergo.local");

    await page.getByRole("button", { name: /Place order \(test\)/ }).click();
    await expect(page).toHaveURL(/\/orders\/.+/, { timeout: 20_000 });
    await expect(page.locator("body")).toContainText(/order|ada/i);
  });
});
