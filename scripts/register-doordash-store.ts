import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import { mapStoreToProfile } from "@/lib/db/repositories/store.repository";
import { formatStoreProfileAddress } from "@/lib/domain/store/format";
import { getDoorDashExternalStoreId } from "@/lib/domain/store/delivery-settings";
import { createDoorDashBusinessClient } from "@/lib/integrations/delivery/doordash/business-client";
import { getDoorDashConfig } from "@/lib/integrations/delivery/doordash/config";
import { formatDoorDashPhone } from "@/lib/integrations/delivery/doordash/mappers";

const cliArgs = process.argv.slice(2);
const storeId =
  cliArgs.find((arg) => !arg.startsWith("-") && !arg.endsWith(".ts")) ??
  "seed-store-waterloo";

async function main() {
  const config = getDoorDashConfig();
  const prisma = new PrismaClient();

  try {
    const record = await prisma.store.findUnique({ where: { id: storeId } });

    if (!record) {
      console.error(`Store not found in database: ${storeId}`);
      console.error("Run npm run db:seed first, or pass a valid store id.");
      process.exit(1);
    }

    const profile = mapStoreToProfile(record);
    const externalStoreId = getDoorDashExternalStoreId(profile);
    const address = formatStoreProfileAddress(profile);
    const phoneNumber = formatDoorDashPhone(profile.phone);

    console.log("Registering DoorDash store...");
    console.log(`  Business:  ${config.externalBusinessId}`);
    console.log(`  Store id:  ${externalStoreId}`);
    console.log(`  Name:      ${profile.name}`);
    console.log(`  Phone:     ${phoneNumber}`);
    console.log(`  Address:   ${address}`);

    const client = createDoorDashBusinessClient();
    const result = await client.upsertStore({
      externalStoreId,
      name: profile.name,
      phoneNumber,
      address,
    });

    console.log(`\nDoorDash store ${result.action} successfully.`);
    console.log(`  Status: ${result.store.status ?? "unknown"}`);
    console.log(`  Test:   ${result.store.is_test ? "yes" : "no"}`);
    console.log("\nYou can quote DoorDash Drive in deliverGO now.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(
    "DoorDash store registration failed:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
