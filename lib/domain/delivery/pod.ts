import type { ProofOfDeliveryConfig } from "@/lib/domain/delivery/types";

export function formatPodConfigSummary(config: ProofOfDeliveryConfig): string {
  const parts: string[] = [];

  if (config.picture) {
    parts.push("Photo");
  }

  if (config.signature) {
    parts.push("Signature");
  }

  if (config.pincode) {
    parts.push("PIN code");
  }

  return parts.length > 0 ? parts.join(" · ") : "None";
}
