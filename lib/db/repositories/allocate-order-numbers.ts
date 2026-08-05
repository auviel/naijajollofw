import type { Prisma } from "@prisma/client";
import { formatDisplayNumber } from "@/lib/domain/order/order-numbers";

export async function allocateOrderNumbers(
  tx: Prisma.TransactionClient,
  storeId: string,
): Promise<{
  displayNumber: string;
  dayTicket: null;
  dayTicketDate: null;
}> {
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

  return {
    displayNumber: formatDisplayNumber(seq.prefix, Number(seq.n)),
    dayTicket: null,
    dayTicketDate: null,
  };
}
