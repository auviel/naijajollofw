import { allocateUniqueMenuSlug } from "../lib/domain/menu/slug";
import {
  type FulfillmentType,
  type OrderStatus,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { geocodeCanadianAddress } from "../lib/integrations/geocoding/mapbox/client";
import { getDoorDashExternalStoreIdFromEnv } from "../lib/integrations/delivery/doordash/config";

const prisma = new PrismaClient();

function torontoCalendarDate(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value ?? "2026";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return new Date(`${y}-${m}-${d}T00:00:00.000Z`);
}

function minutesAgo(mins: number): Date {
  return new Date(Date.now() - mins * 60_000);
}

function hoursFromNow(hours: number): Date {
  return new Date(Date.now() + hours * 3_600_000);
}

function eventsForStatus(status: OrderStatus): OrderStatus[] {
  switch (status) {
    case "pending_acceptance":
      return ["pending_acceptance"];
    case "accepted":
      return ["pending_acceptance", "accepted"];
    case "preparing":
      return ["pending_acceptance", "preparing"];
    case "ready":
      return ["pending_acceptance", "preparing", "ready"];
    case "ready_for_pickup":
      return ["pending_acceptance", "preparing", "ready_for_pickup"];
    case "out_for_delivery":
      return ["pending_acceptance", "preparing", "ready", "out_for_delivery"];
    case "completed":
      return ["pending_acceptance", "preparing", "ready_for_pickup", "completed"];
    default:
      return ["pending_acceptance"];
  }
}

async function seedKitchenBoardOrders(storeId: string) {
  await prisma.orderEvent.deleteMany({
    where: { order: { storeId, id: { startsWith: "seed-kitchen-" } } },
  });
  await prisma.orderLineItem.deleteMany({
    where: { order: { storeId, id: { startsWith: "seed-kitchen-" } } },
  });
  await prisma.order.deleteMany({
    where: { storeId, id: { startsWith: "seed-kitchen-" } },
  });

  const dayTicketDate = torontoCalendarDate();

  type Line = {
    name: string;
    quantity: number;
    unitPriceCents: number;
    modifiers?: Array<{ name: string }>;
  };

  type Spec = {
    id: string;
    status: OrderStatus;
    fulfillmentType: FulfillmentType;
    customerName: string;
    customerPhone: string;
    displayNumber: string;
    dayTicket: number;
    notes?: string | null;
    scheduledFor?: Date | null;
    placedAt: Date;
    dropoffAddress?: string | null;
    lines: Line[];
  };

  const specs: Spec[] = [
    {
      id: "seed-kitchen-01",
      status: "pending_acceptance",
      fulfillmentType: "pickup",
      customerName: "Ada Okonkwo",
      customerPhone: "+15195550101",
      displayNumber: "NJ-K01",
      dayTicket: 1,
      notes: "Extra spicy · no onion",
      placedAt: minutesAgo(2),
      lines: [
        {
          name: "Jollof Rice, Plantain and Chicken",
          quantity: 2,
          unitPriceCents: 2399,
          modifiers: [{ name: "Jollof rice" }, { name: "4 pcs chicken" }],
        },
        { name: "Chapman", quantity: 1, unitPriceCents: 499 },
      ],
    },
    {
      id: "seed-kitchen-02",
      status: "pending_acceptance",
      fulfillmentType: "delivery",
      customerName: "Marcus Chen",
      customerPhone: "+15195550102",
      displayNumber: "NJ-K02",
      dayTicket: 2,
      placedAt: minutesAgo(5),
      dropoffAddress: "200 University Ave W, Waterloo ON",
      lines: [
        {
          name: "Eferiro Soup",
          quantity: 1,
          unitPriceCents: 1699,
          modifiers: [{ name: "With fufu" }],
        },
      ],
    },
    {
      id: "seed-kitchen-03",
      status: "pending_acceptance",
      fulfillmentType: "pickup",
      customerName: "Priya Nair",
      customerPhone: "+15195550103",
      displayNumber: "NJ-K03",
      dayTicket: 3,
      placedAt: minutesAgo(8),
      lines: [
        { name: "Fried Rice & Chicken", quantity: 1, unitPriceCents: 1999 },
        { name: "Plantain", quantity: 2, unitPriceCents: 699 },
      ],
    },
    {
      id: "seed-kitchen-04",
      status: "pending_acceptance",
      fulfillmentType: "delivery",
      customerName: "Jordan Blake",
      customerPhone: "+15195550104",
      displayNumber: "NJ-K04",
      dayTicket: 4,
      notes: "Gate code 4421",
      placedAt: minutesAgo(1),
      dropoffAddress: "75 King St S, Waterloo ON",
      lines: [
        {
          name: "Half Tray Party Rice",
          quantity: 1,
          unitPriceCents: 6499,
          modifiers: [{ name: "Jollof" }, { name: "20 pcs chicken" }],
        },
      ],
    },
    {
      id: "seed-kitchen-05",
      status: "pending_acceptance",
      fulfillmentType: "pickup",
      customerName: "Later Pickup — Sam",
      customerPhone: "+15195550105",
      displayNumber: "NJ-K05",
      dayTicket: 5,
      scheduledFor: hoursFromNow(3),
      placedAt: minutesAgo(20),
      lines: [
        { name: "Okra Soup", quantity: 2, unitPriceCents: 1699 },
        { name: "Pounded Yam", quantity: 2, unitPriceCents: 899 },
      ],
    },
    {
      id: "seed-kitchen-06",
      status: "pending_acceptance",
      fulfillmentType: "delivery",
      customerName: "Later Delivery — Tess",
      customerPhone: "+15195550106",
      displayNumber: "NJ-K06",
      dayTicket: 6,
      scheduledFor: hoursFromNow(5),
      placedAt: minutesAgo(40),
      dropoffAddress: "31 Caroline St N, Waterloo ON",
      lines: [
        { name: "Full Tray Party Rice - Family Pack", quantity: 1, unitPriceCents: 13499 },
      ],
    },
    {
      id: "seed-kitchen-07",
      status: "preparing",
      fulfillmentType: "pickup",
      customerName: "Noah Patel",
      customerPhone: "+15195550107",
      displayNumber: "NJ-K07",
      dayTicket: 7,
      placedAt: minutesAgo(18),
      lines: [
        {
          name: "Jollof Rice and Turkey",
          quantity: 1,
          unitPriceCents: 2099,
        },
        { name: "Moi Moi", quantity: 1, unitPriceCents: 599 },
      ],
    },
    {
      id: "seed-kitchen-08",
      status: "preparing",
      fulfillmentType: "delivery",
      customerName: "Elena Rossi",
      customerPhone: "+15195550108",
      displayNumber: "NJ-K08",
      dayTicket: 8,
      notes: "Leave at door",
      placedAt: minutesAgo(25),
      dropoffAddress: "155 King St N, Waterloo ON",
      lines: [
        { name: "Ayamashe Stew with White Rice", quantity: 2, unitPriceCents: 2399 },
      ],
    },
    {
      id: "seed-kitchen-09",
      status: "preparing",
      fulfillmentType: "pickup",
      customerName: "Chris Adeyemi",
      customerPhone: "+15195550109",
      displayNumber: "NJ-K09",
      dayTicket: 9,
      placedAt: minutesAgo(12),
      lines: [
        { name: "Jollof Rice and Assorted Beef", quantity: 1, unitPriceCents: 2399 },
        { name: "Chapman", quantity: 2, unitPriceCents: 499 },
        { name: "Plantain", quantity: 1, unitPriceCents: 699 },
      ],
    },
    {
      id: "seed-kitchen-10",
      status: "accepted",
      fulfillmentType: "pickup",
      customerName: "Accepted Hold — Kim",
      customerPhone: "+15195550110",
      displayNumber: "NJ-K10",
      dayTicket: 10,
      placedAt: minutesAgo(6),
      lines: [{ name: "Eferiro Soup", quantity: 1, unitPriceCents: 1699 }],
    },
    {
      id: "seed-kitchen-11",
      status: "ready_for_pickup",
      fulfillmentType: "pickup",
      customerName: "Fatima Hassan",
      customerPhone: "+15195550111",
      displayNumber: "NJ-K11",
      dayTicket: 11,
      placedAt: minutesAgo(35),
      lines: [
        {
          name: "Jollof Rice, Plantain and Chicken",
          quantity: 1,
          unitPriceCents: 2399,
        },
      ],
    },
    {
      id: "seed-kitchen-12",
      status: "ready_for_pickup",
      fulfillmentType: "pickup",
      customerName: "Will Torres",
      customerPhone: "+15195550112",
      displayNumber: "NJ-K12",
      dayTicket: 12,
      placedAt: minutesAgo(42),
      lines: [
        { name: "Fried Rice & Chicken", quantity: 3, unitPriceCents: 1999 },
      ],
    },
    {
      id: "seed-kitchen-13",
      status: "ready",
      fulfillmentType: "delivery",
      customerName: "Needs Courier — Maya",
      customerPhone: "+15195550113",
      displayNumber: "NJ-K13",
      dayTicket: 13,
      placedAt: minutesAgo(30),
      dropoffAddress: "90 Westmount Rd N, Waterloo ON",
      lines: [
        { name: "Okra Soup", quantity: 1, unitPriceCents: 1699 },
        { name: "White Rice", quantity: 1, unitPriceCents: 799 },
      ],
    },
    {
      id: "seed-kitchen-14",
      status: "ready",
      fulfillmentType: "delivery",
      customerName: "Needs Courier — Dev",
      customerPhone: "+15195550114",
      displayNumber: "NJ-K14",
      dayTicket: 14,
      notes: "Apartment 4B",
      placedAt: minutesAgo(28),
      dropoffAddress: "330 Phillip St, Waterloo ON",
      lines: [
        { name: "Half Tray Party Rice", quantity: 1, unitPriceCents: 6499 },
      ],
    },
    {
      id: "seed-kitchen-15",
      status: "out_for_delivery",
      fulfillmentType: "delivery",
      customerName: "On the Road — Lex",
      customerPhone: "+15195550115",
      displayNumber: "NJ-K15",
      dayTicket: 15,
      placedAt: minutesAgo(50),
      dropoffAddress: "10 Regina St N, Waterloo ON",
      lines: [
        { name: "Jollof Rice and Turkey", quantity: 2, unitPriceCents: 2099 },
      ],
    },
    {
      id: "seed-kitchen-16",
      status: "pending_acceptance",
      fulfillmentType: "pickup",
      customerName: "Big Party — Amaka",
      customerPhone: "+15195550116",
      displayNumber: "NJ-K16",
      dayTicket: 16,
      notes: "Call when ready — large order",
      placedAt: minutesAgo(3),
      lines: [
        {
          name: "Full Tray Party Rice - Family Pack",
          quantity: 1,
          unitPriceCents: 13499,
        },
        { name: "2.6L Chicken Stew", quantity: 1, unitPriceCents: 10999 },
        { name: "Plantain", quantity: 4, unitPriceCents: 699 },
        { name: "Chapman", quantity: 6, unitPriceCents: 499 },
      ],
    },
  ];

  for (const spec of specs) {
    const subtotalCents = spec.lines.reduce(
      (sum, line) => sum + line.unitPriceCents * line.quantity,
      0,
    );
    const taxCents = Math.round(subtotalCents * 0.13);
    const tipCents = spec.fulfillmentType === "delivery" ? 400 : 0;
    const totalCents = subtotalCents + taxCents + tipCents;
    const statusPath = eventsForStatus(spec.status);

    await prisma.order.create({
      data: {
        id: spec.id,
        storeId,
        source: "storefront",
        status: spec.status,
        fulfillmentType: spec.fulfillmentType,
        fulfillmentMethod:
          spec.status === "out_for_delivery" ? "manual" : "unassigned",
        customerName: spec.customerName,
        customerPhone: spec.customerPhone,
        customerEmail: `${spec.id}@seed.naijajollofw.ca`,
        dropoffAddress: spec.dropoffAddress ?? null,
        notes: spec.notes ?? null,
        scheduledFor: spec.scheduledFor ?? null,
        subtotalCents,
        tipCents,
        taxCents,
        totalCents,
        currency: "CAD",
        squarePaymentId: `seed-pay-${spec.id}`,
        displayNumber: spec.displayNumber,
        dayTicket: spec.dayTicket,
        dayTicketDate,
        placedAt: spec.placedAt,
        manualDeliveryNote:
          spec.status === "out_for_delivery" ? "Seeded manual run" : null,
        lineItems: {
          create: spec.lines.map((line) => ({
            name: line.name,
            unitPriceCents: line.unitPriceCents,
            quantity: line.quantity,
            modifiers: (line.modifiers ?? []) as Prisma.InputJsonValue,
            lineTotalCents: line.unitPriceCents * line.quantity,
          })),
        },
        events: {
          create: statusPath.map((status, index) => ({
            status,
            actor: index === 0 ? "system" : "seed",
            note:
              index === 0
                ? "Payment received (seed)"
                : `Seed advanced to ${status}`,
            createdAt: minutesAgo(Math.max(0, 60 - index * 5)),
          })),
        },
      },
    });
  }

  console.log(`  Kitchen board: ${specs.length} seeded tickets (seed-kitchen-*)`);
}

const SEED_STAFF = {
  email: "admin@naijajollofw.ca",
  password: "123456",
  name: "Store Manager",
} as const;

const SEED_STORE_BASE = {
  name: "Naija Jollof Waterloo",
  phone: "+15198851517",
  email: "hello@naijajollofw.ca",
  addressLine1: "280 Lester St",
  addressLine2: "#102",
  city: "Waterloo",
  province: "ON",
  postalCode: "N2L 0G2",
  country: "CA",
  latitude: 43.478885,
  longitude: -80.524498,
  prepMinutes: 15,
  orderNumberPrefix: "NJ",
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
  const storeData = await resolveStoreCoordinates();

  const store = await prisma.store.upsert({
    where: { id: "seed-store-waterloo" },
    update: storeData,
    create: {
      id: "seed-store-waterloo",
      ...storeData,
      nextOrderNumber: 1001,
    },
  });

  // Reset and seed menu matching Naija Jollof Waterloo (Uber Eats layout).
  await prisma.cartItem.deleteMany({
    where: { cart: { storeId: store.id } },
  });
  await prisma.cart.deleteMany({ where: { storeId: store.id } });
  await prisma.menuItem.deleteMany({ where: { storeId: store.id } });
  await prisma.menuCategory.deleteMany({ where: { storeId: store.id } });

  // Weekly hours: Sun closed, Mon–Sat 10:00–22:00 (America/Toronto via STORE_TIMEZONE).
  await prisma.storeHours.deleteMany({ where: { storeId: store.id } });
  await prisma.storeHours.createMany({
    data: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => {
      const closed = dayOfWeek === 0;
      return {
        storeId: store.id,
        dayOfWeek,
        closed,
        openMinute: closed ? null : 10 * 60,
        closeMinute: closed ? null : 22 * 60,
      };
    }),
  });

  const HERO = "/brand/naija-jollof-hero.png";

  const categoryDefs = [
    { key: "featured", name: "Featured items", sortOrder: 0, active: true },
    { key: "popular", name: "Popular Picks", sortOrder: 1, active: true },
    { key: "rice", name: "Rice & Combos", sortOrder: 2, active: true },
    { key: "soups", name: "Soups & Stews", sortOrder: 3, active: true },
    { key: "sides", name: "Add-Ons & Sides", sortOrder: 4, active: true },
    { key: "family", name: "Family Trays & Bulk Orders", sortOrder: 5, active: true },
    { key: "drinks", name: "Drinks", sortOrder: 6, active: true },
    { key: "special", name: "Special Orders (Pre order only)", sortOrder: 7, active: true },
    { key: "riceTypes", name: "Rice types", sortOrder: 90, active: false },
    { key: "chickenQty", name: "Chicken quantity", sortOrder: 91, active: false },
  ] as const;

  const categories = new Map<string, string>();
  for (const def of categoryDefs) {
    const row = await prisma.menuCategory.create({
      data: {
        storeId: store.id,
        name: def.name,
        sortOrder: def.sortOrder,
        active: def.active,
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
      category: "riceTypes",
      name: "Jollof Rice Only",
      description: "Half tray with jollof rice only.",
      priceCents: 0,
      sortOrder: 0,
    },
    {
      category: "riceTypes",
      name: "Fried Rice Only",
      description: "Half tray with fried rice only.",
      priceCents: 0,
      sortOrder: 1,
    },
    {
      category: "riceTypes",
      name: "Mix of Jollof and Fried Rice",
      description: "Half tray with a mix of jollof and fried rice.",
      priceCents: 0,
      sortOrder: 2,
    },
    {
      category: "chickenQty",
      name: "No chicken, rice only",
      description: "Half tray without chicken.",
      priceCents: 0,
      sortOrder: 0,
    },
    {
      category: "chickenQty",
      name: "Regular Combo (5 Chicken)",
      description: "Half tray with five pieces of chicken.",
      priceCents: 1500,
      sortOrder: 1,
    },
    {
      category: "chickenQty",
      name: "Extra Chicken (8 pieces)",
      description: "Half tray with eight pieces of chicken.",
      priceCents: 2800,
      sortOrder: 2,
    },
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
    const slug = await allocateUniqueMenuSlug(item.name, async (candidate) => {
      const hit = await prisma.menuItem.findFirst({
        where: { storeId: store.id, slug: candidate },
        select: { id: true },
      });
      return Boolean(hit);
    });
    const row = await prisma.menuItem.create({
      data: {
        storeId: store.id,
        categoryId,
        name: item.name,
        slug,
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
  const riceTypesId = categories.get("riceTypes");
  const chickenQtyId = categories.get("chickenQty");
  if (halfTrayId && riceTypesId && chickenQtyId) {
    await prisma.menuModifierGroup.create({
      data: {
        itemId: halfTrayId,
        name: "Choose Rice Type - Half Tray",
        required: true,
        minSelect: 1,
        maxSelect: 1,
        sortOrder: 0,
        sourceCategoryId: riceTypesId,
      },
    });
    await prisma.menuModifierGroup.create({
      data: {
        itemId: halfTrayId,
        name: "Choose Chicken Quantity - Half Tray",
        required: true,
        minSelect: 1,
        maxSelect: 1,
        sortOrder: 1,
        sourceCategoryId: chickenQtyId,
      },
    });
  }

  const passwordHash = await bcrypt.hash(SEED_STAFF.password, 12);
  const existingStaff =
    (await prisma.user.findUnique({ where: { email: SEED_STAFF.email } })) ??
    (await prisma.user.findUnique({
      where: { email: "hello@naijajollofw.ca" },
    }));

  if (existingStaff) {
    await prisma.user.update({
      where: { id: existingStaff.id },
      data: {
        email: SEED_STAFF.email,
        passwordHash,
        name: SEED_STAFF.name,
        role: "STORE_MANAGER",
        storeId: store.id,
        sessionVersion: { increment: 1 },
      },
    });
  } else {
    await prisma.user.create({
      data: {
        email: SEED_STAFF.email,
        passwordHash,
        name: SEED_STAFF.name,
        role: "STORE_MANAGER",
        storeId: store.id,
      },
    });
  }

  await seedKitchenBoardOrders(store.id);

  console.log("Seed complete:");
  console.log(`  Store: ${store.name} (${store.id})`);
  console.log(`  DoorDash external_store_id: ${getDoorDashExternalStoreIdFromEnv() ?? store.id}`);
  console.log(`  Coords: ${store.latitude}, ${store.longitude}`);
  console.log(`  Staff: ${SEED_STAFF.email} / ${SEED_STAFF.password}`);
  console.log(
    `  Menu: ${categoryDefs.length} categories · ${items.length} items`,
  );
  console.log("  Hours: Sun closed · Mon–Sat 10:00–22:00");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
