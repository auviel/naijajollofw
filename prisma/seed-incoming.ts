/**
 * Quick kitchen smoke data: 3 live incoming (pending_acceptance) tickets.
 * Usage: npx tsx prisma/seed-incoming.ts
 */
import { Prisma } from "@/generated/prisma-node/client";
import { createScriptPrisma } from "../lib/db/script-prisma";

const prisma = createScriptPrisma();

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

async function main() {
  const store =
    (await prisma.store.findFirst({
      where: { id: "seed-store-waterloo" },
    })) ?? (await prisma.store.findFirst({ orderBy: { createdAt: "asc" } }));

  if (!store) {
    throw new Error("No store found. Run npm run db:bootstrap (or db:seed:demo locally) first.");
  }

  const menuItem = await prisma.menuItem.findFirst({
    where: { storeId: store.id, available: true },
    orderBy: { name: "asc" },
  });

  const dayTicketDate = torontoCalendarDate();
  const maxTicket = await prisma.order.aggregate({
    where: { storeId: store.id, dayTicketDate },
    _max: { dayTicket: true },
  });
  let nextTicket = (maxTicket._max.dayTicket ?? 0) + 1;

  const stamp = Date.now().toString(36).slice(-6);
  const guests = [
    {
      name: "Incoming — Kemi",
      phone: "+15195559001",
      fulfillmentType: "pickup" as const,
      notes: "Extra spicy",
      placedAt: minutesAgo(1),
      dropoffAddress: null as string | null,
      lines: [
        {
          name: menuItem?.name ?? "Jollof Rice & Chicken",
          quantity: 2,
          unitPriceCents: menuItem?.priceCents ?? 2199,
        },
      ],
    },
    {
      name: "Incoming — David",
      phone: "+15195559002",
      fulfillmentType: "delivery" as const,
      notes: null,
      placedAt: minutesAgo(3),
      dropoffAddress: "200 University Ave W, Waterloo ON",
      lines: [
        {
          name: menuItem?.name ?? "Eferiro Soup",
          quantity: 1,
          unitPriceCents: menuItem?.priceCents ?? 1699,
        },
        {
          name: "Chapman",
          quantity: 2,
          unitPriceCents: 499,
        },
      ],
    },
    {
      name: "Incoming — Fatima",
      phone: "+15195559003",
      fulfillmentType: "pickup" as const,
      notes: "No onion",
      placedAt: minutesAgo(6),
      dropoffAddress: null as string | null,
      lines: [
        {
          name: menuItem?.name ?? "Fried Rice & Chicken",
          quantity: 1,
          unitPriceCents: menuItem?.priceCents ?? 1999,
        },
        {
          name: "Plantain",
          quantity: 1,
          unitPriceCents: 699,
        },
      ],
    },
  ];

  // Clear prior quick-incoming batch so re-runs stay at 3.
  await prisma.orderEvent.deleteMany({
    where: { order: { storeId: store.id, id: { startsWith: "seed-incoming-" } } },
  });
  await prisma.orderLineItem.deleteMany({
    where: { order: { storeId: store.id, id: { startsWith: "seed-incoming-" } } },
  });
  await prisma.order.deleteMany({
    where: { storeId: store.id, id: { startsWith: "seed-incoming-" } },
  });

  for (const [index, guest] of guests.entries()) {
    const subtotalCents = guest.lines.reduce(
      (sum, line) => sum + line.unitPriceCents * line.quantity,
      0,
    );
    const taxCents = Math.round(subtotalCents * 0.13);
    const tipCents = guest.fulfillmentType === "delivery" ? 400 : 0;
    const totalCents = subtotalCents + taxCents + tipCents;
    const dayTicket = nextTicket++;
    const id = `seed-incoming-${stamp}-${index + 1}`;

    await prisma.order.create({
      data: {
        id,
        storeId: store.id,
        source: "storefront",
        status: "pending_acceptance",
        fulfillmentType: guest.fulfillmentType,
        fulfillmentMethod: "unassigned",
        customerName: guest.name,
        customerPhone: guest.phone,
        customerEmail: `${id}@seed.naijajollofw.ca`,
        dropoffAddress: guest.dropoffAddress,
        notes: guest.notes,
        subtotalCents,
        tipCents,
        taxCents,
        totalCents,
        currency: "CAD",
        squarePaymentId: `seed-pay-${id}`,
        displayNumber: `NJ-IN${dayTicket}`,
        dayTicket,
        dayTicketDate,
        placedAt: guest.placedAt,
        lineItems: {
          create: guest.lines.map((line) => ({
            name: line.name,
            unitPriceCents: line.unitPriceCents,
            quantity: line.quantity,
            modifiers: [] as Prisma.InputJsonValue,
            lineTotalCents: line.unitPriceCents * line.quantity,
            menuItemId: menuItem?.id ?? null,
          })),
        },
        events: {
          create: [
            {
              status: "pending_acceptance",
              actor: "system",
              note: "Payment received (seed-incoming)",
              createdAt: guest.placedAt,
            },
          ],
        },
      },
    });

    console.log(
      `  ✓ ${guest.name} · ${guest.fulfillmentType} · ticket #${dayTicket}`,
    );
  }

  console.log(`\nSeeded 3 incoming orders for ${store.name}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
