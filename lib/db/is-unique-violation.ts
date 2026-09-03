/** True when Prisma rejected a write for a unique constraint (P2002). */
export function isPrismaUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const record = error as { name?: unknown; code?: unknown };
  return (
    record.name === "PrismaClientKnownRequestError" && record.code === "P2002"
  );
}
