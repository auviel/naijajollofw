import { describe, expect, it, vi } from "vitest";
import { createReadToolCache } from "@/lib/ai/core/tool-cache";

describe("createReadToolCache", () => {
  it("returns cached value within TTL without reloading", async () => {
    const cache = createReadToolCache({ ttlMs: 60_000 });
    const loader = vi.fn(async () => ({ isOpen: true }));
    const a = await cache.getOrSet("merchant", loader);
    const b = await cache.getOrSet("merchant", loader);
    expect(a).toEqual(b);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("dedupes in-flight loads for the same key", async () => {
    const cache = createReadToolCache({ ttlMs: 60_000 });
    let resolve!: (v: string) => void;
    const loader = vi.fn(
      () =>
        new Promise<string>((r) => {
          resolve = r;
        }),
    );
    const p1 = cache.getOrSet("q:jollof", loader);
    const p2 = cache.getOrSet("q:jollof", loader);
    resolve("ok");
    expect(await p1).toBe("ok");
    expect(await p2).toBe("ok");
    expect(loader).toHaveBeenCalledTimes(1);
  });
});
