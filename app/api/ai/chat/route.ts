import { createRestaurantChatHandler } from "@/lib/ai/verticals/restaurant/create-chat";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { getRequestIpFromRequest } from "@/lib/utils/request-ip";

export const maxDuration = 30;

export async function POST(req: Request) {
  const ip = getRequestIpFromRequest(req);
  const limited = checkRateLimit(`ai-chat:${ip}`, 20, 60_000);
  if (!limited.allowed) {
    return Response.json(
      { error: "Too many messages. Try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": String(limited.retryAfterSeconds ?? 60),
        },
      },
    );
  }

  return createRestaurantChatHandler(req);
}
