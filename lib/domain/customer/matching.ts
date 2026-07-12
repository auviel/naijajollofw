import type { NormalizedAddress } from "@/lib/domain/address/types";

export function normalizeCustomerName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function normalizePostalCode(postalCode: string): string {
  return postalCode.replace(/\s+/g, "").toUpperCase();
}

export function normalizeAddressLine1(line1: string): string {
  return line1.trim().toLowerCase();
}

/** Loose name match — exact normalized match or one name contains the other. */
export function namesMatch(left: string, right: string): boolean {
  const a = normalizeCustomerName(left);
  const b = normalizeCustomerName(right);

  if (!a || !b) {
    return false;
  }

  if (a === b) {
    return true;
  }

  if (a.length >= 3 && b.length >= 3) {
    return a.includes(b) || b.includes(a);
  }

  return false;
}

export function addressesMatch(
  left: Pick<NormalizedAddress, "line1" | "postalCode" | "latitude" | "longitude"> & {
    latitude?: number | null;
    longitude?: number | null;
  },
  right: Pick<NormalizedAddress, "line1" | "postalCode" | "latitude" | "longitude"> & {
    latitude?: number | null;
    longitude?: number | null;
  },
): boolean {
  if (
    normalizePostalCode(left.postalCode) === normalizePostalCode(right.postalCode) &&
    normalizeAddressLine1(left.line1) === normalizeAddressLine1(right.line1)
  ) {
    return true;
  }

  if (
    left.latitude == null ||
    left.longitude == null ||
    right.latitude == null ||
    right.longitude == null
  ) {
    return false;
  }

  const distanceMeters = haversineMeters(
    left.latitude,
    left.longitude,
    right.latitude,
    right.longitude,
  );

  return distanceMeters <= 50;
}

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusM = 6_371_000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadiusM * Math.asin(Math.sqrt(a));
}
