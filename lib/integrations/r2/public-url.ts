import { getR2Config } from "@/lib/integrations/r2/config";

/** Build the public CDN/r2.dev URL for an object key. */
export function publicUrlForObjectKey(key: string): string {
  const { publicBaseUrl } = getR2Config();
  const normalizedKey = key.replace(/^\/+/, "");
  return `${publicBaseUrl}/${normalizedKey}`;
}
