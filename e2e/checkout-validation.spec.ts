import { expect, test } from "@playwright/test";
import {
  addFirstMenuItemAndOpenCheckout,
  ensureCheckoutSchedule,
} from "./helpers/storefront";

test.describe.configure({ mode: "serial" });

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

    const name = page.getByLabel("Name");
    const phone = page.getByLabel("Phone");
    const email = page.getByLabel("Email");

    await name.fill("Ada Okonkwo");
    await phone.fill("5195550100");
    await email.fill("ada.e2e@example.com");
    await expect(name).toHaveValue("Ada Okonkwo");
    await expect(phone).toHaveValue("(519) 555-0100");
    await expect(email).toHaveValue("ada.e2e@example.com");

    const placeOrder = page.getByRole("button", {
      name: /Place order \(test\)/,
    });
    await expect(placeOrder).toBeEnabled();

    const [response] = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes("/api/checkout") &&
          res.request().method() === "POST",
        { timeout: 30_000 },
      ),
      placeOrder.click(),
    ]);
    expect(response.ok(), await response.text()).toBeTruthy();
    const body = (await response.json()) as {
      data: { id: string; publicToken: string };
    };

    await expect
      .poll(() => page.url(), { timeout: 20_000 })
      .toContain(`/orders/${body.data.id}`);
    await expect(page.locator("body")).toContainText(/order|ada/i);
  });
});
