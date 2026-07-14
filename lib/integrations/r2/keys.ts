/**
 * Tenant-first R2 object keys (no env prefix — bucket name separates envs).
 *
 * stores/{storeId}/brand/logo/{assetId}.{ext}
 * stores/{storeId}/brand/hero/{assetId}.{ext}
 * stores/{storeId}/menu/{menuItemId}/{assetId}.{ext}
 * stores/{storeId}/tmp/{uploadId}.{ext}
 */

export type MediaExt = "webp" | "jpg" | "jpeg" | "png" | "gif";

const EXT_BY_CONTENT_TYPE: Record<string, MediaExt> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
};

export function extensionForContentType(contentType: string): MediaExt | null {
  const normalized = contentType.trim().toLowerCase().split(";")[0]?.trim();
  if (!normalized) return null;
  return EXT_BY_CONTENT_TYPE[normalized] ?? null;
}

export function contentTypeForExtension(ext: MediaExt): string {
  switch (ext) {
    case "webp":
      return "image/webp";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    default:
      return "application/octet-stream";
  }
}

export function menuItemImageKey(input: {
  storeId: string;
  menuItemId: string;
  assetId: string;
  ext: MediaExt;
}): string {
  return `stores/${input.storeId}/menu/${input.menuItemId}/${input.assetId}.${input.ext === "jpeg" ? "jpg" : input.ext}`;
}

export function brandImageKey(input: {
  storeId: string;
  kind: "logo" | "hero";
  assetId: string;
  ext: MediaExt;
}): string {
  const ext = input.ext === "jpeg" ? "jpg" : input.ext;
  return `stores/${input.storeId}/brand/${input.kind}/${input.assetId}.${ext}`;
}

export function tmpUploadKey(input: {
  storeId: string;
  uploadId: string;
  ext: MediaExt;
}): string {
  const ext = input.ext === "jpeg" ? "jpg" : input.ext;
  return `stores/${input.storeId}/tmp/${input.uploadId}.${ext}`;
}

/** Detect keys owned by our layout under a public base URL (for GC on replace). */
export function tryParseR2ObjectKeyFromPublicUrl(
  publicUrl: string,
  publicBaseUrl: string,
): string | null {
  const base = publicBaseUrl.replace(/\/+$/, "");
  if (!publicUrl.startsWith(`${base}/`)) {
    return null;
  }
  const key = publicUrl.slice(base.length + 1);
  if (!key.startsWith("stores/") || key.includes("..")) {
    return null;
  }
  return key;
}
