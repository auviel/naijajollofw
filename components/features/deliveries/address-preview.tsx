import type { GeocodedAddress } from "@/lib/integrations/geocoding/types";

type AddressPreviewProps = {
  result: GeocodedAddress | null;
  isLoading?: boolean;
  error?: string | null;
};

/** Parsed address preview shown before requesting an Uber quote (Phase 7). */
export function AddressPreview({
  result,
  isLoading = false,
  error = null,
}: AddressPreviewProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-secondary">
        Checking address…
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-lg border border-error/20 bg-red-50 p-4 text-sm text-error"
        role="alert"
      >
        {error}
      </div>
    );
  }

  if (!result) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
        Address confirmed
      </p>
      <p className="mt-2 text-sm text-foreground">{result.preview}</p>
    </div>
  );
}

export function canRequestQuote(result: GeocodedAddress | null): boolean {
  return result !== null && result.confidence !== "low";
}
