import { describe, expect, it, vi, beforeEach } from "vitest";
import { z } from "zod";
import { AppError, handleApiError } from "@/lib/utils/errors";

const captureException = vi.fn();

vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => captureException(...args),
}));

describe("handleApiError", () => {
  beforeEach(() => {
    captureException.mockClear();
  });

  it("returns consistent shape for AppError", async () => {
    const response = handleApiError(
      new AppError("NOT_FOUND", "Delivery not found", 404),
    );

    expect(response.status).toBe(404);
    expect(captureException).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: "Delivery not found",
      code: "NOT_FOUND",
    });
  });

  it("includes Zod field errors in details", async () => {
    const schema = z.object({ email: z.string().email() });

    try {
      schema.parse({ email: "not-an-email" });
    } catch (error) {
      const response = handleApiError(error);
      expect(response.status).toBe(400);
      expect(captureException).not.toHaveBeenCalled();

      const body = await response.json();
      expect(body.code).toBe("VALIDATION_ERROR");
      expect(body.error).toBe("Validation failed");
      expect(body.details).toBeDefined();
    }
  });

  it("includes optional details on AppError", async () => {
    const response = handleApiError(
      new AppError("VALIDATION_ERROR", "Invalid input", 400, { field: "quoteId" }),
    );

    await expect(response.json()).resolves.toEqual({
      error: "Invalid input",
      code: "VALIDATION_ERROR",
      details: { field: "quoteId" },
    });
  });

  it("reports unexpected errors to Sentry as INTERNAL_ERROR", async () => {
    const boom = new Error("db down");
    const response = handleApiError(boom);

    expect(response.status).toBe(500);
    expect(captureException).toHaveBeenCalledWith(boom);
    await expect(response.json()).resolves.toEqual({
      error: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  });
});
