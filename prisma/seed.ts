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
  phone: "+15198851517",
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

  // Reset and seed menu matching Naija Jollof Waterloo (Uber Eats layout).
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

  const HERO = "/brand/naija-jollof-hero.png";

  const categoryDefs = [
    { key: "featured", name: "Featured items", sortOrder: 0 },
    { key: "popular", name: "Popular Picks", sortOrder: 1 },
    { key: "rice", name: "Rice & Combos", sortOrder: 2 },
    { key: "soups", name: "Soups & Stews", sortOrder: 3 },
    { key: "sides", name: "Add-Ons & Sides", sortOrder: 4 },
    { key: "family", name: "Family Trays & Bulk Orders", sortOrder: 5 },
    { key: "drinks", name: "Drinks", sortOrder: 6 },
    { key: "special", name: "Special Orders (Pre order only)", sortOrder: 7 },
  ] as const;

  const categories = new Map<string, string>();
  for (const def of categoryDefs) {
    const row = await prisma.menuCategory.create({
      data: {
        storeId: store.id,
        name: def.name,
        sortOrder: def.sortOrder,
        active: true,
      },
    });
    categories.set(def.key, row.id);
  }

  type SeedItem = {
    category: (typeof categoryDefs)[number]["key"];
    name: string;
    description: string;
    priceCents: number;
    sortOrder: number;
    available?: boolean;
  };

  const items: SeedItem[] = [
    // Featured
    {
      category: "featured",
      name: "Jollof Rice, Plantain and Chicken",
      description:
        "Smoky party jollof with fried plantain and seasoned chicken.",
      priceCents: 2399,
      sortOrder: 0,
    },
    {
      category: "featured",
      name: "Eferiro Soup",
      description: "Rich Nigerian spinach stew with assorted proteins.",
      priceCents: 1699,
      sortOrder: 1,
    },
    {
      category: "featured",
      name: "Jollof Rice and Turkey",
      description: "Classic jollof rice served with roasted turkey.",
      priceCents: 2099,
      sortOrder: 2,
    },
    {
      category: "featured",
      name: "Okra Soup",
      description: "Draw soup with okra, stockfish, and assorted meats.",
      priceCents: 1699,
      sortOrder: 3,
    },
    // Popular
    {
      category: "popular",
      name: "Half Tray Party Rice",
      description:
        "Perfect for small gatherings. Rich, well-seasoned Nigerian rice made to share. A customer favorite for group meals.",
      priceCents: 6499,
      sortOrder: 0,
    },
    {
      category: "popular",
      name: "Full Tray Party Rice - Family Pack",
      description:
        "Full tray of party jollof for larger gatherings and celebrations.",
      priceCents: 13499,
      sortOrder: 1,
    },
    {
      category: "popular",
      name: "2.6L Chicken Stew",
      description: "Family-size chicken stew — best value for sharing.",
      priceCents: 10999,
      sortOrder: 2,
    },
    // Rice & Combos
    {
      category: "rice",
      name: "Jollof Rice and Assorted Beef",
      description: "Party jollof with tender assorted beef.",
      priceCents: 2399,
      sortOrder: 0,
    },
    {
      category: "rice",
      name: "Jollof Rice, Plantain and Chicken",
      description: "Jollof rice, sweet plantain, and chicken.",
      priceCents: 2399,
      sortOrder: 1,
    },
    {
      category: "rice",
      name: "Fried Rice & Chicken",
      description: "Nigerian fried rice with seasoned chicken.",
      priceCents: 1999,
      sortOrder: 2,
    },
    {
      category: "rice",
      name: "Ayamashe Stew with White Rice",
      description:
        "Rich, spicy green pepper stew served with white rice and assorted beef.",
      priceCents: 2399,
      sortOrder: 3,
    },
    // Soups
    {
      category: "soups",
      name: "Eferiro Soup",
      description: "Spinach stew with your choice of protein.",
      priceCents: 1699,
      sortOrder: 0,
    },
    {
      category: "soups",
      name: "Okra Soup",
      description: "Traditional okra soup with assorted meats.",
      priceCents: 1699,
      sortOrder: 1,
    },
    {
      category: "soups",
      name: "Egusi Soup",
      description: "Ground melon seed soup — thick and hearty.",
      priceCents: 1799,
      sortOrder: 2,
    },
    // Sides
    {
      category: "sides",
      name: "Fried Plantain",
      description: "Sweet golden fried plantain.",
      priceCents: 599,
      sortOrder: 0,
    },
    {
      category: "sides",
      name: "Puff Puff (6 pcs)",
      description: "Soft fried dough snacks.",
      priceCents: 699,
      sortOrder: 1,
    },
    {
      category: "sides",
      name: "Extra Protein - Assorted",
      description: "Add assorted beef or chicken to any meal.",
      priceCents: 999,
      sortOrder: 2,
    },
    // Family
    {
      category: "family",
      name: "Half Tray Party Rice",
      description: "Half tray of party rice for small groups.",
      priceCents: 6499,
      sortOrder: 0,
    },
    {
      category: "family",
      name: "Full Tray Party Rice - Family Pack",
      description: "Full tray for parties and family events.",
      priceCents: 13499,
      sortOrder: 1,
    },
    {
      category: "family",
      name: "2.6L Chicken Stew",
      description: "Bulk chicken stew for catering and gatherings.",
      priceCents: 10999,
      sortOrder: 2,
    },
    // Drinks
    {
      category: "drinks",
      name: "Zobo Drink",
      description: "Hibiscus drink, lightly sweetened.",
      priceCents: 449,
      sortOrder: 0,
    },
    {
      category: "drinks",
      name: "Chapman",
      description: "Classic Nigerian mocktail.",
      priceCents: 549,
      sortOrder: 1,
    },
    {
      category: "drinks",
      name: "Bottled Soft Drink",
      description: "Coke, Sprite, or Fanta.",
      priceCents: 299,
      sortOrder: 2,
    },
    // Special
    {
      category: "special",
      name: "Custom Party Order",
      description:
        "Pre-order only. Contact the restaurant to customize trays and timing. Starting price.",
      priceCents: 5000,
      sortOrder: 0,
      available: true,
    },
  ];

  const createdItems = new Map<string, string>();
  for (const item of items) {
    const categoryId = categories.get(item.category);
    if (!categoryId) {
      continue;
    }
    const row = await prisma.menuItem.create({
      data: {
        storeId: store.id,
        categoryId,
        name: item.name,
        description: item.description,
        priceCents: item.priceCents,
        imageUrl: HERO,
        sortOrder: item.sortOrder,
        available: item.available ?? true,
      },
    });
    createdItems.set(`${item.category}:${item.name}`, row.id);
  }

  const halfTrayId = createdItems.get("popular:Half Tray Party Rice");
  if (halfTrayId) {
    const riceGroup = await prisma.menuModifierGroup.create({
      data: {
        itemId: halfTrayId,
        name: "Choose Rice Type - Half Tray",
        required: true,
        minSelect: 1,
        maxSelect: 1,
        sortOrder: 0,
      },
    });
    await prisma.menuModifier.createMany({
      data: [
        {
          groupId: riceGroup.id,
          name: "Jollof Rice Only",
          priceDeltaCents: 0,
          sortOrder: 0,
        },
        {
          groupId: riceGroup.id,
          name: "Fried Rice Only",
          priceDeltaCents: 0,
          sortOrder: 1,
        },
        {
          groupId: riceGroup.id,
          name: "Mix of Jollof and Fried Rice",
          priceDeltaCents: 0,
          sortOrder: 2,
        },
      ],
    });

    const chickenGroup = await prisma.menuModifierGroup.create({
      data: {
        itemId: halfTrayId,
        name: "Choose Chicken Quantity - Half Tray",
        required: true,
        minSelect: 1,
        maxSelect: 1,
        sortOrder: 1,
      },
    });
    await prisma.menuModifier.createMany({
      data: [
        {
          groupId: chickenGroup.id,
          name: "No chicken, Jollof Rice Only",
          priceDeltaCents: 0,
          sortOrder: 0,
        },
        {
          groupId: chickenGroup.id,
          name: "Regular Combo (5 Chicken)",
          priceDeltaCents: 1500,
          sortOrder: 1,
        },
        {
          groupId: chickenGroup.id,
          name: "Extra Chicken (8 pieces)",
          priceDeltaCents: 2800,
          sortOrder: 2,
        },
      ],
    });
  }

  console.log("Seed complete:");
  console.log(`  Store: ${store.name} (${store.id})`);
  console.log(`  DoorDash external_store_id: ${getDoorDashExternalStoreIdFromEnv() ?? store.id}`);
  console.log(`  Coords: ${store.latitude}, ${store.longitude}`);
  console.log(`  User:  ${SEED_USER.email}`);
  console.log(`  Login password: ${SEED_USER.password} (dev only)`);
  console.log(
    `  Menu: ${categoryDefs.length} categories · ${items.length} items`,
  );
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
