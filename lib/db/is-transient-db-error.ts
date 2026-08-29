/**
 * True for Prisma/pg failures that are usually connectivity or pool pressure,
 * not application bugs — safe to degrade chrome (header/footer/JSON-LD).
 */
export function isTransientDbError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const name =
    "name" in error && typeof error.name === "string" ? error.name : "";
  const message =
    "message" in error && typeof error.message === "string"
      ? error.message
      : "";

  if (
    name === "PrismaClientInitializationError" ||
    name === "PrismaClientRustPanicError"
  ) {
    return true;
  }

  if (name === "PrismaClientKnownRequestError") {
    const code =
      "code" in error && typeof error.code === "string" ? error.code : "";
    // P1001 unreachable, P1002 timed out, P1017 server closed connection
    if (code === "P1001" || code === "P1002" || code === "P1017") {
      return true;
    }
  }

  return (
    /Timed out fetching a new connection from the connection pool/i.test(
      message,
    ) ||
    /Can't reach database server/i.test(message) ||
    /Connection terminated unexpectedly/i.test(message) ||
    /server closed the connection/i.test(message) ||
    /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|ECONNRESET/i.test(message)
  );
}
