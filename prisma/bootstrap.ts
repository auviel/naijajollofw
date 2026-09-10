import bcrypt from "bcryptjs";
import { createScriptPrisma } from "../lib/db/script-prisma";
import { geocodeCanadianAddress } from "../lib/integrations/geocoding/mapbox/client";
import { getDoorDashExternalStoreIdFromEnv } from "../lib/integrations/delivery/doordash/config";

/**
 * Idempotent production-safe bootstrap.
 * - Creates the Waterloo store if missing
 * - Creates default hours only when the store has none
 * - Creates staff manager if missing (does not reset existing passwords
 *   unless BOOTSTRAP_RESET_STAFF_PASSWORD=1)
 * - Never deletes or replaces menu / carts / orders
 */

const prisma = createScriptPrisma();

export const BOOTSTRAP_STORE_ID = "seed-store-waterloo";

const STORE_BASE = {
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

const DEFAULT_STAFF = {
  email: "admin@naijajollofw.ca",
  name: "Store Manager",
  /** Local/demo default only — override with SEED_STAFF_PASSWORD in prod. */
  password: "123456",
} as const;

async function resolveStoreCoordinates() {
  const query = `${STORE_BASE.addressLine1} ${STORE_BASE.addressLine2}, ${STORE_BASE.city}, ${STORE_BASE.province} ${STORE_BASE.postalCode}, Canada`;

  if (!process.env.MAPBOX_ACCESS_TOKEN?.trim()) {
    console.log("  Mapbox token not set — using fallback store coordinates.");
    return { ...STORE_BASE };
  }

  try {
    const geocoded = await geocodeCanadianAddress(query);
    console.log("  Store address geocoded via Mapbox.");
    return {
      ...STORE_BASE,
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
      "  Mapbox geocode failed — using fallback coordinates.",
      error instanceof Error ? error.message : error,
    );
    return { ...STORE_BASE };
  }
}

async function ensureStore() {
  const configuredId = process.env.PUBLIC_STORE_ID?.trim();
  if (configuredId) {
    const configured = await prisma.store.findUnique({
      where: { id: configuredId },
    });
    if (configured) {
      console.log(`  Store (existing): ${configured.name} (${configured.id})`);
      return configured;
    }
  }

  const existing = await prisma.store.findUnique({
    where: { id: BOOTSTRAP_STORE_ID },
  });
  if (existing) {
    console.log(`  Store (existing): ${existing.name} (${existing.id})`);
    return existing;
  }

  const first = await prisma.store.findFirst({ orderBy: { createdAt: "asc" } });
  if (first) {
    console.log(`  Store (existing first): ${first.name} (${first.id})`);
    return first;
  }

  const data = await resolveStoreCoordinates();
  const created = await prisma.store.create({
    data: {
      id: BOOTSTRAP_STORE_ID,
      ...data,
      nextOrderNumber: 1001,
    },
  });
  console.log(`  Store (created): ${created.name} (${created.id})`);
  return created;
}

async function ensureHours(storeId: string) {
  const count = await prisma.storeHours.count({ where: { storeId } });
  if (count > 0) {
    console.log(`  Hours: left ${count} existing row(s) unchanged`);
    return;
  }

  await prisma.storeHours.createMany({
    data: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => {
      const closed = dayOfWeek === 0;
      return {
        storeId,
        dayOfWeek,
        closed,
        openMinute: closed ? null : 10 * 60,
        closeMinute: closed ? null : 22 * 60,
      };
    }),
  });
  console.log("  Hours: created Sun closed · Mon–Sat 10:00–22:00");
}

function staffPassword(): string {
  return (
    process.env.SEED_STAFF_PASSWORD?.trim() ||
    process.env.BOOTSTRAP_STAFF_PASSWORD?.trim() ||
    DEFAULT_STAFF.password
  );
}

function staffEmail(): string {
  return (
    process.env.SEED_STAFF_EMAIL?.trim() ||
    process.env.BOOTSTRAP_STAFF_EMAIL?.trim() ||
    DEFAULT_STAFF.email
  );
}

async function ensureStaff(storeId: string) {
  const email = staffEmail();
  const password = staffPassword();
  const reset = process.env.BOOTSTRAP_RESET_STAFF_PASSWORD === "1";

  const existing =
    (await prisma.user.findUnique({ where: { email } })) ??
    (await prisma.user.findUnique({
      where: { email: "hello@naijajollofw.ca" },
    }));

  if (existing) {
    if (reset) {
      const passwordHash = await bcrypt.hash(password, 12);
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          email,
          passwordHash,
          name: DEFAULT_STAFF.name,
          role: "STORE_MANAGER",
          storeId,
          sessionVersion: { increment: 1 },
        },
      });
      console.log(`  Staff: reset password for ${email}`);
      return { email, password, created: false, reset: true };
    }

    if (existing.storeId !== storeId || existing.role !== "STORE_MANAGER") {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          email,
          role: "STORE_MANAGER",
          storeId,
        },
      });
      console.log(`  Staff: linked existing ${email} to store (password unchanged)`);
    } else {
      console.log(`  Staff: existing ${email} (password unchanged)`);
    }
    return { email, password: null as string | null, created: false, reset: false };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: DEFAULT_STAFF.name,
      role: "STORE_MANAGER",
      storeId,
    },
  });
  console.log(`  Staff: created ${email}`);
  return { email, password, created: true, reset: false };
}

async function main() {
  console.log("Bootstrap (idempotent, non-destructive)…");
  const store = await ensureStore();
  await ensureHours(store.id);
  const staff = await ensureStaff(store.id);

  console.log("Bootstrap complete:");
  console.log(`  Store: ${store.name} (${store.id})`);
  console.log(
    `  DoorDash external_store_id: ${getDoorDashExternalStoreIdFromEnv() ?? store.id}`,
  );
  if (staff.password) {
    console.log(`  Staff: ${staff.email} / ${staff.password}`);
  } else {
    console.log(
      `  Staff: ${staff.email} (password unchanged; set BOOTSTRAP_RESET_STAFF_PASSWORD=1 to reset)`,
    );
  }
  console.log("  Menu: untouched");
}

main()
  .catch((error) => {
    console.error("Bootstrap failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
