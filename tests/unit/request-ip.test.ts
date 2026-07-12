import { describe, expect, it } from "vitest";
import { getRequestIpFromRequest } from "@/lib/utils/request-ip";

describe("getRequestIpFromRequest", () => {
  it("prefers the first x-forwarded-for hop", () => {
    const request = new Request("http://localhost/api", {
      headers: {
        "x-forwarded-for": "203.0.113.10, 10.0.0.1",
        "x-real-ip": "10.0.0.9",
      },
    });

    expect(getRequestIpFromRequest(request)).toBe("203.0.113.10");
  });

  it("falls back to x-real-ip then unknown", () => {
    expect(
      getRequestIpFromRequest(
        new Request("http://localhost/api", {
          headers: { "x-real-ip": "198.51.100.2" },
        }),
      ),
    ).toBe("198.51.100.2");

    expect(getRequestIpFromRequest(new Request("http://localhost/api"))).toBe(
      "unknown",
    );
  });
});
