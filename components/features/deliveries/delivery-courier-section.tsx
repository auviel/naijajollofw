import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { CourierInfo } from "@/lib/domain/delivery/types";
import { formatDateTime } from "@/lib/utils/date";

type DeliveryCourierSectionProps = {
  courier: CourierInfo;
};

function formatVehicleType(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function DeliveryCourierSection({ courier }: DeliveryCourierSectionProps) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-foreground">Courier</h2>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {courier.name ? (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
              Name
            </p>
            <p className="mt-1 font-medium text-foreground">{courier.name}</p>
          </div>
        ) : null}
        {courier.vehicleType ? (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
              Vehicle
            </p>
            <p className="mt-1 text-foreground">
              {formatVehicleType(courier.vehicleType)}
            </p>
          </div>
        ) : null}
        {courier.pickupEta ? (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
              Pickup ETA
            </p>
            <p className="mt-1 text-foreground">{formatDateTime(courier.pickupEta)}</p>
          </div>
        ) : null}
        {courier.dropoffEta ? (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
              Delivery ETA
            </p>
            <p className="mt-1 text-foreground">{formatDateTime(courier.dropoffEta)}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
