import { describe, expect, it } from "vitest";
import { formatPodConfigSummary } from "@/lib/domain/delivery/pod";

describe("formatPodConfigSummary", () => {
  it("lists enabled proof types", () => {
    expect(
      formatPodConfigSummary({ picture: true, signature: true, pincode: false }),
    ).toBe("Photo · Signature");

    expect(
      formatPodConfigSummary({ picture: false, signature: false, pincode: true }),
    ).toBe("PIN code");
  });

  it("returns none when all options are disabled", () => {
    expect(
      formatPodConfigSummary({ picture: false, signature: false, pincode: false }),
    ).toBe("None");
  });
});
