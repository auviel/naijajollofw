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
