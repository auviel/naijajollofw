import type { Prisma } from "@prisma/client";
import { getStoreTimeZone } from "@/lib/config/environment";
import {
  formatDisplayNumber,
  storeLocalDateKey,
} from "@/lib/domain/order/order-numbers";

export async function allocateOrderNumbers(
  tx: Prisma.TransactionClient,
  storeId: string,
  at: Date = new Date(),
  options: { includeDayTicket?: boolean } = {},
): Promise<{
  displayNumber: string;
  dayTicket: number | null;
  dayTicketDate: Date | null;
}> {
  const includeDayTicket = options.includeDayTicket ?? true;
  const localDate = storeLocalDateKey(at, getStoreTimeZone());
  const dayTicketDate = new Date(`${localDate}T00:00:00.000Z`);

  const seqRows = await tx.$queryRaw<Array<{ prefix: string; n: bigint | number }>>`
    UPDATE "Store"
    SET "nextOrderNumber" = "nextOrderNumber" + 1
    WHERE "id" = ${storeId}
    RETURNING "orderNumberPrefix" AS prefix, ("nextOrderNumber" - 1) AS n
  `;
  const seq = seqRows[0];
  if (!seq) {
    throw new Error(`Store not found: ${storeId}`);
  }

  if (!includeDayTicket) {
    return {
      displayNumber: formatDisplayNumber(seq.prefix, Number(seq.n)),
      dayTicket: null,
      dayTicketDate: null,
    };
  }

  const ticketRows = await tx.$queryRaw<Array<{ ticket: bigint | number }>>`
    INSERT INTO "StoreDayTicket" ("storeId", "localDate", "nextTicket")
    VALUES (${storeId}, ${dayTicketDate}, 2)
    ON CONFLICT ("storeId", "localDate")
    DO UPDATE SET "nextTicket" = "StoreDayTicket"."nextTicket" + 1
    RETURNING ("nextTicket" - 1) AS ticket
  `;
  const ticket = ticketRows[0];
  if (!ticket) {
    throw new Error("Failed to allocate day ticket");
  }

  return {
    displayNumber: formatDisplayNumber(seq.prefix, Number(seq.n)),
    dayTicket: Number(ticket.ticket),
    dayTicketDate,
  };
}
