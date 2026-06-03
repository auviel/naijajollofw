import { ExternalLink } from "lucide-react";
import { CancelDeliveryButton } from "@/components/features/deliveries/delivery-cancel-button";
import { DeliveryCourierSection } from "@/components/features/deliveries/delivery-courier-section";
import { DeliveryDetailHeader } from "@/components/features/deliveries/delivery-detail-header";
import { DeliveryLocationCard } from "@/components/features/deliveries/delivery-location-card";
import { DeliveryProofSection } from "@/components/features/deliveries/delivery-proof-section";
import { DeliveryStatusTimeline } from "@/components/features/deliveries/delivery-status-timeline";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatPodConfigSummary } from "@/lib/domain/delivery/pod";
import type { DeliveryDetail } from "@/lib/domain/delivery/types";
import { formatCadFromCents } from "@/lib/utils/currency";

type DeliveryDetailViewProps = {
  delivery: DeliveryDetail;
};

export function DeliveryDetailView({ delivery }: DeliveryDetailViewProps) {
  const fee =
    delivery.feeCents !== null ? formatCadFromCents(delivery.feeCents) : "—";
  const hadScheduledPickup = Boolean(
    delivery.scheduledFor || delivery.pickupReadyAt,
  );

  return (
    <div className="space-y-6">
      <DeliveryDetailHeader delivery={delivery} />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <DeliveryStatusTimeline
            status={delivery.status}
            hadScheduledPickup={hadScheduledPickup}
          />

          <div className="grid gap-6 md:grid-cols-2">
            <DeliveryLocationCard title="Pickup" location={delivery.pickup} />
            <DeliveryLocationCard title="Dropoff" location={delivery.dropoff} />
          </div>

          {delivery.proofOfDelivery ? (
            <DeliveryProofSection proof={delivery.proofOfDelivery} />
          ) : null}
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-foreground">Summary</h2>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                  Fee
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                  {fee}
                </p>
                <p className="mt-1 text-text-tertiary">{delivery.currency}</p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                  Proof requested
                </p>
                <p className="mt-1 text-foreground">
                  {formatPodConfigSummary(delivery.podConfig)}
                </p>
                {delivery.podConfig.pincode && delivery.pincodeValue ? (
                  <p className="mt-2 font-mono text-sm text-foreground">
                    Customer PIN: {delivery.pincodeValue}
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {delivery.trackingUrl ? (
            <a
              href={delivery.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface-elevated px-5 text-sm font-medium text-foreground transition-colors hover:bg-surface"
            >
              Track delivery
              <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          ) : null}

          {delivery.courier ? (
            <DeliveryCourierSection courier={delivery.courier} />
          ) : null}

          {delivery.cancellable ? (
            <CancelDeliveryButton deliveryId={delivery.id} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
