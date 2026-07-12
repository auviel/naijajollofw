import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { geocodeCanadianAddress } from "../lib/integrations/geocoding/mapbox/client";
import { getDoorDashExternalStoreIdFromEnv } from "../lib/integrations/delivery/doordash/config";

const prisma = new PrismaClient();

/** Dev-only credentials — documented in README.md */
const SEED_USER = {
  email: "store.manager@delivergo.local",
  password: "DeliverGODev2026!",
  name: "Store Manager",
  role: UserRole.STORE_MANAGER,
} as const;

const SEED_STORE_BASE = {
  name: "Naija Jollof Waterloo",
  phone: "+15195550199",
  addressLine1: "280 Lester St",
  addressLine2: "#102",
  city: "Waterloo",
  province: "ON",
  postalCode: "N2L 0G2",
  country: "CA",
  latitude: 43.478885,
  longitude: -80.524498,
} as const;

async function resolveStoreCoordinates() {
  const query = `${SEED_STORE_BASE.addressLine1} ${SEED_STORE_BASE.addressLine2}, ${SEED_STORE_BASE.city}, ${SEED_STORE_BASE.province} ${SEED_STORE_BASE.postalCode}, Canada`;

  if (!process.env.MAPBOX_ACCESS_TOKEN?.trim()) {
    console.log("  Mapbox token not set — using fallback store coordinates.");
    return SEED_STORE_BASE;
  }

  try {
    const geocoded = await geocodeCanadianAddress(query);
    console.log("  Store address geocoded via Mapbox.");

    return {
      ...SEED_STORE_BASE,
      addressLine1: geocoded.address.line1,
      city: geocoded.address.city,
      province: geocoded.address.province,
      postalCode: geocoded.address.postalCode,
      country: geocoded.address.country,
      latitude: geocoded.address.latitude,
      longitude: geocoded.address.longitude,
    };
  } catch (error) {
    console.warn(
      "  Mapbox geocode failed during seed — using fallback coordinates.",
      error instanceof Error ? error.message : error,
    );
    return SEED_STORE_BASE;
  }
}

async function main() {
  const passwordHash = await bcrypt.hash(SEED_USER.password, 12);
  const storeData = await resolveStoreCoordinates();

  const store = await prisma.store.upsert({
    where: { id: "seed-store-waterloo" },
    update: storeData,
    create: {
      id: "seed-store-waterloo",
      ...storeData,
    },
  });

  await prisma.user.upsert({
    where: { email: SEED_USER.email },
    update: {
      name: SEED_USER.name,
      role: SEED_USER.role,
      passwordHash,
      storeId: store.id,
    },
    create: {
      email: SEED_USER.email,
      name: SEED_USER.name,
      role: SEED_USER.role,
      passwordHash,
      storeId: store.id,
    },
  });

  // Reset and seed a small demo menu for storefront work.
  await prisma.cartItem.deleteMany({
    where: { cart: { storeId: store.id } },
  });
  await prisma.cart.deleteMany({ where: { storeId: store.id } });
  await prisma.menuItem.deleteMany({ where: { storeId: store.id } });
  await prisma.menuCategory.deleteMany({ where: { storeId: store.id } });

  // Weekly hours: Sun closed, Mon–Sat 11:00–22:00 (America/Toronto via STORE_TIMEZONE).
  await prisma.storeHours.deleteMany({ where: { storeId: store.id } });
  await prisma.storeHours.createMany({
    data: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => {
      const closed = dayOfWeek === 0;
      return {
        storeId: store.id,
        dayOfWeek,
        closed,
        openMinute: closed ? null : 11 * 60,
        closeMinute: closed ? null : 22 * 60,
      };
    }),
  });

  const mains = await prisma.menuCategory.create({
    data: {
      storeId: store.id,
      name: "Mains",
      sortOrder: 0,
    },
  });
  const sides = await prisma.menuCategory.create({
    data: {
      storeId: store.id,
      name: "Sides",
      sortOrder: 1,
    },
  });
  const drinks = await prisma.menuCategory.create({
    data: {
      storeId: store.id,
      name: "Drinks",
      sortOrder: 2,
    },
  });

  const burger = await prisma.menuItem.create({
    data: {
      storeId: store.id,
      categoryId: mains.id,
      name: "Lester Smash Burger",
      description: "Double smash, American cheese, pickles, house sauce.",
      priceCents: 1450,
      sortOrder: 0,
      available: true,
    },
  });

  const toppings = await prisma.menuModifierGroup.create({
    data: {
      itemId: burger.id,
      name: "Add-ons",
      required: false,
      minSelect: 0,
      maxSelect: 3,
      sortOrder: 0,
    },
  });

  await prisma.menuModifier.createMany({
    data: [
      {
        groupId: toppings.id,
        name: "Bacon",
        priceDeltaCents: 200,
        sortOrder: 0,
      },
      {
        groupId: toppings.id,
        name: "Fried egg",
        priceDeltaCents: 150,
        sortOrder: 1,
      },
      {
        groupId: toppings.id,
        name: "Extra patty",
        priceDeltaCents: 350,
        sortOrder: 2,
      },
    ],
  });

  await prisma.menuItem.createMany({
    data: [
      {
        storeId: store.id,
        categoryId: mains.id,
        name: "Crispy Chicken Sandwich",
        description: "Buttermilk fried chicken, slaw, hot honey.",
        priceCents: 1399,
        sortOrder: 1,
        available: true,
      },
      {
        storeId: store.id,
        categoryId: sides.id,
        name: "Seasoned Fries",
        description: "Crispy fries with house seasoning.",
        priceCents: 499,
        sortOrder: 0,
        available: true,
      },
      {
        storeId: store.id,
        categoryId: sides.id,
        name: "Mac & Cheese",
        description: "Creamy cheddar bake.",
        priceCents: 650,
        sortOrder: 1,
        available: false,
      },
      {
        storeId: store.id,
        categoryId: drinks.id,
        name: "Fountain Drink",
        description: "Coca-Cola, Sprite, or iced tea.",
        priceCents: 299,
        sortOrder: 0,
        available: true,
      },
    ],
  });

  console.log("Seed complete:");
  console.log(`  Store: ${store.name} (${store.id})`);
  console.log(`  DoorDash external_store_id: ${getDoorDashExternalStoreIdFromEnv() ?? store.id}`);
  console.log(`  Coords: ${store.latitude}, ${store.longitude}`);
  console.log(`  User:  ${SEED_USER.email}`);
  console.log(`  Login password: ${SEED_USER.password} (dev only)`);
  console.log("  Menu: Mains / Sides / Drinks seeded");
  console.log("  Hours: Sun closed · Mon–Sat 11:00–22:00");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
