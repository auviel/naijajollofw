import { expect, type Page } from "@playwright/test";

type PublicMenuItem = {
  id: string;
  slug: string;
  available: boolean;
};

type PublicMenuResponse = {
  data: {
    catalog: {
      categories: Array<{ items: PublicMenuItem[] }>;
    };
  };
};

async function firstAvailableMenuItemId(page: Page): Promise<string> {
  const response = await page.request.get("/api/storefront/menu");
  expect(response.ok(), await response.text()).toBeTruthy();
  const body = (await response.json()) as PublicMenuResponse;
  const item = body.data.catalog.categories
    .flatMap((category) => category.items)
    .find((entry) => entry.available);
  expect(item, "seeded menu should include an available item").toBeTruthy();
  return item!.id;
}

export async function addFirstMenuItemAndOpenCheckout(page: Page) {
  await page.goto("/");
  const menuItemId = await firstAvailableMenuItemId(page);

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
