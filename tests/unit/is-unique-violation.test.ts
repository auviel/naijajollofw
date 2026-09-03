import { describe, expect, it } from "vitest";
import { isPrismaUniqueViolation } from "@/lib/db/is-unique-violation";

describe("isPrismaUniqueViolation", () => {
  it("detects Prisma P2002", () => {
    const error = Object.assign(new Error("Unique constraint failed"), {
      name: "PrismaClientKnownRequestError",
      code: "P2002",
    });
    expect(isPrismaUniqueViolation(error)).toBe(true);
  });

  it("ignores other Prisma codes and plain errors", () => {
    expect(
      isPrismaUniqueViolation(
        Object.assign(new Error("timeout"), {
          name: "PrismaClientKnownRequestError",
          code: "P1001",
        }),
      ),
    ).toBe(false);
    expect(isPrismaUniqueViolation(new Error("boom"))).toBe(false);
    expect(isPrismaUniqueViolation(null)).toBe(false);
  });
});
