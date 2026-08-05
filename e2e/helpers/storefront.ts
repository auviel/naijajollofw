import { expect, type Page } from "@playwright/test";

export async function addFirstMenuItemAndOpenCheckout(page: Page) {
  await page.goto("/");
  const itemLink = page.locator('a[href^="/item/"]').first();
  await expect(itemLink).toBeVisible();
  const href = await itemLink.getAttribute("href");
  expect(href).toBeTruthy();

  const menuItemId = href!.split("/").filter(Boolean).pop();
  expect(menuItemId).toBeTruthy();

  const response = await page.request.post("/api/cart", {
    data: {
      menuItemId,
      quantity: 1,
      modifierIds: [],
    },
  });
  expect(response.ok(), await response.text()).toBeTruthy();

  await page.goto("/checkout");
  await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();
}

/** When the store is closed, pick the first available slot so pay/validation can run. */
export async function ensureCheckoutSchedule(page: Page) {
  const chooseTime = page.getByRole("button", {
    name: "Choose a time to continue",
  });
  if (!(await chooseTime.isVisible())) {
    return;
  }

  await page
    .getByRole("button", { name: /^Schedule pickup|^Schedule delivery/ })
    .first()
    .click();
  await expect(page.getByRole("heading", { name: /^Schedule / })).toBeVisible();
  await page.getByRole("button", { name: "Schedule", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Place order \(test\)|Pay / }),
  ).toBeVisible();
}
