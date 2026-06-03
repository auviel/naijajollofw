import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/utils/errors";
import { getDoorDashUserMessage } from "@/lib/integrations/delivery/doordash/user-errors";

describe("getDoorDashUserMessage", () => {
  it("returns coming soon for Canadian availability errors", () => {
    expect(
      getDoorDashUserMessage(
        new AppError(
          "VALIDATION_ERROR",
          "DoorDash is not available for Canadian addresses yet.",
          400,
        ),
      ),
    ).toBe("Coming soon — not available in Canada yet.");
  });

  it("returns a simple fallback for provider errors", () => {
    expect(
      getDoorDashUserMessage(
        new AppError("PROVIDER_ERROR", "DoorDash Drive authentication failed.", 502),
      ),
    ).toBe("DoorDash is not available right now. Try Uber Direct instead.");
  });
});
