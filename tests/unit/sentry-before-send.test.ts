import { describe, expect, it } from "vitest";
import { sentryBeforeSend } from "@/lib/observability/sentry-before-send";
import { AppError } from "@/lib/utils/errors";
import type { ErrorEvent, EventHint } from "@sentry/core";

function event(message: string, type = "Error"): ErrorEvent {
  return {
    message,
    exception: { values: [{ type, value: message }] },
  } as ErrorEvent;
}

function hint(error: unknown): EventHint {
  return { originalException: error };
}

describe("sentryBeforeSend", () => {
  it("drops expected AppErrors under 500", () => {
    expect(
      sentryBeforeSend(
        event("Restaurant is not set up yet."),
        hint(new AppError("NOT_FOUND", "Restaurant is not set up yet.", 404)),
      ),
    ).toBeNull();
  });

  it("drops AppError when only exception metadata is present", () => {
    expect(
      sentryBeforeSend(
        event("Authentication required", "AppError"),
        hint(undefined),
      ),
    ).toBeNull();
  });

  it("drops cookie modification noise from RSC layouts", () => {
    expect(
      sentryBeforeSend(
        event(
          "Cookies can only be modified in a Server Action or Route Handler.",
        ),
        hint(new Error("Cookies can only be modified in a Server Action or Route Handler.")),
      ),
    ).toBeNull();
  });

  it("drops known hydration / session noise by message", () => {
    expect(
      sentryBeforeSend(
        event(
          "Hydration failed because the server rendered text didn't match the client",
        ),
        hint(undefined),
      ),
    ).toBeNull();
  });

  it("drops failed Server Action and opaque RSC client wrappers", () => {
    expect(
      sentryBeforeSend(
        event(
          "Failed to find Server Action. This request might be from an older or newer deployment.",
        ),
        hint(
          new Error(
            "Failed to find Server Action. This request might be from an older or newer deployment.",
          ),
        ),
      ),
    ).toBeNull();

    expect(
      sentryBeforeSend(
        event(
          "An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details.",
        ),
        hint(undefined),
      ),
    ).toBeNull();
  });

  it("keeps unexpected errors", () => {
    const err = new Error("Square payment failed");
    const incoming = event("Square payment failed");
    expect(sentryBeforeSend(incoming, hint(err))).toBe(incoming);
  });

  it("drops injected addEventListener stack overflows", () => {
    const incoming = {
      type: undefined,
      message: "Maximum call stack size exceeded",
      exception: {
        values: [
          {
            type: "RangeError",
            value: "Maximum call stack size exceeded",
            stacktrace: {
              frames: [
                { function: "top.addEventListener", filename: "<anonymous>" },
                { function: "top.addEventListener", filename: "<anonymous>" },
                { function: "addEL_hook", filename: "<anonymous>" },
              ],
            },
          },
        ],
      },
    } as ErrorEvent;

    expect(sentryBeforeSend(incoming, hint(undefined))).toBeNull();
  });

  it("keeps real app RangeErrors", () => {
    const incoming = {
      type: undefined,
      message: "Maximum call stack size exceeded",
      exception: {
        values: [
          {
            type: "RangeError",
            value: "Maximum call stack size exceeded",
            stacktrace: {
              frames: [
                {
                  function: "CartProvider",
                  filename: "app/components/cart.tsx",
                },
              ],
            },
          },
        ],
      },
    } as ErrorEvent;

    expect(sentryBeforeSend(incoming, hint(undefined))).toBe(incoming);
  });
});
