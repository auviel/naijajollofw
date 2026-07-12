/** Insert optional apt/unit after the street line, before city/province. */
export function withAddressLine2(
  addressQuery: string,
  addressLine2?: string | null,
): string {
  const query = addressQuery.trim();
  const line2 = addressLine2?.trim();

  if (!query || !line2) {
    return query;
  }

  const commaIndex = query.indexOf(",");
  if (commaIndex === -1) {
    return `${query}, ${line2}`;
  }

  return `${query.slice(0, commaIndex)}, ${line2}${query.slice(commaIndex)}`;
}
