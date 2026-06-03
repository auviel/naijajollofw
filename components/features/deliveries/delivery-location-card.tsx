import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { DeliveryLocation } from "@/lib/domain/delivery/types";

type DeliveryLocationCardProps = {
  title: string;
  location: DeliveryLocation;
};

export function DeliveryLocationCard({ title, location }: DeliveryLocationCardProps) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
            Name
          </p>
          <p className="mt-1 font-medium text-foreground">{location.name}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
            Phone
          </p>
          <p className="mt-1 text-foreground">{location.phone}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
            Address
          </p>
          <p className="mt-1 text-foreground">{location.address}</p>
        </div>
      </CardContent>
    </Card>
  );
}
