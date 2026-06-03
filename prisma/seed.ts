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
  name: "Demo Market — Lester St",
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

  console.log("Seed complete:");
  console.log(`  Store: ${store.name} (${store.id})`);
  console.log(`  DoorDash external_store_id: ${getDoorDashExternalStoreIdFromEnv() ?? store.id}`);
  console.log(`  Coords: ${store.latitude}, ${store.longitude}`);
  console.log(`  User:  ${SEED_USER.email}`);
  console.log(`  Login password: ${SEED_USER.password} (dev only)`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
