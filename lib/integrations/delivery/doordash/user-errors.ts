import type { AppError } from "@/lib/utils/errors";

/** Plain-language DoorDash errors for store managers. */
export function getDoorDashUserMessage(error: AppError): string {
  const message = error.message.toLowerCase();

  if (message.includes("not available for canadian")) {
    return "Coming soon — not available in Canada yet.";
  }

  if (message.includes("outside doordash") || message.includes("coverage")) {
    return "This address is outside the DoorDash delivery area.";
  }

  if (message.includes("expired")) {
    return "That quote expired. Please get a new quote.";
  }

  if (error.code === "PROVIDER_ERROR") {
    return "DoorDash is not available right now. Try Uber Direct instead.";
  }

  return "Unable to get a DoorDash quote. Try Uber Direct instead.";
}
