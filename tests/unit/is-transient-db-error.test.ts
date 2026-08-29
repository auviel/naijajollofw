import { describe, expect, it } from "vitest";
import { isTransientDbError } from "@/lib/db/is-transient-db-error";

describe("isTransientDbError", () => {
  it("detects Prisma initialization / pool timeout messages", () => {
    const error = Object.assign(
      new Error(
        "Timed out fetching a new connection from the connection pool. (Current connection pool timeout: 10, connection limit: 5)",
      ),
      { name: "PrismaClientInitializationError" },
    );
    expect(isTransientDbError(error)).toBe(true);
  });

  it("detects unreachable database known request errors", () => {
    const error = Object.assign(
      new Error("Can't reach database server at `db.example:5432`"),
      { name: "PrismaClientKnownRequestError", code: "P1001" },
    );
    expect(isTransientDbError(error)).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(isTransientDbError(new Error("Square payment failed"))).toBe(false);
    expect(isTransientDbError(null)).toBe(false);
  });
});
