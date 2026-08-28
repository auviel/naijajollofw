import { createImageUrlBuilder, type SanityImageSource } from "@sanity/image-url";
import { getSanityEnv } from "./env";

const { projectId, dataset } = getSanityEnv();

const builder = createImageUrlBuilder({
  projectId: projectId || "placeholder",
  dataset,
});

export function urlForImage(source: SanityImageSource) {
  return builder.image(source);
}

export function sanityImageUrl(
  source: SanityImageSource | null | undefined,
  width = 1200,
): string | null {
  if (!source) return null;
  try {
    return builder.image(source).width(width).auto("format").url();
  } catch {
    return null;
  }
}

/**
 * Social crawlers (WhatsApp especially) prefer JPEG under ~300KB.
 * Crop to a 1.91:1 OG frame so previews don't fall back to the site icon.
 */
export function sanityOgImageUrl(
  source: SanityImageSource | null | undefined,
): string | null {
  if (!source) return null;
  try {
    return builder
      .image(source)
      .width(1200)
      .height(630)
      .fit("crop")
      .format("jpg")
      .quality(80)
      .url();
  } catch {
    return null;
  }
}
