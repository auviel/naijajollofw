/** Shared menu media limits (client + server). */

export const MENU_IMAGE_MAX_BYTES = 50 * 1024 * 1024; // 50 MiB
export const MENU_IMAGE_MAX_COUNT = 10;

export const MENU_IMAGE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif" as const;

export const MENU_IMAGE_ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);
