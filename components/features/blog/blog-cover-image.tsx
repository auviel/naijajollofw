import Image from "next/image";
import { cn } from "@/lib/utils/cn";

type BlogCoverImageProps = {
  src: string | null;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
};

export function BlogCoverImage({
  src,
  alt,
  className,
  sizes = "(max-width: 768px) 100vw, 33vw",
  priority = false,
}: BlogCoverImageProps) {
  if (!src) {
    return (
      <div
        aria-hidden
        className={cn(
          "bg-[linear-gradient(135deg,var(--accent-subtle)_0%,color-mix(in_oklab,var(--accent)_18%,white)_50%,color-mix(in_oklab,var(--success)_12%,white)_100%)]",
          className,
        )}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={cn("object-cover", className)}
    />
  );
}
