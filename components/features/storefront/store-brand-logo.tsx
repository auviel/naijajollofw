import Image from "next/image";
import { cn } from "@/lib/utils/cn";

export const STORE_LOGO_SRC = "/brand/naija-jollof-logo.png";
export const STORE_LOGO_WIDTH = 300;
export const STORE_LOGO_HEIGHT = 81;

type StoreBrandLogoProps = {
  alt: string;
  /** header = compact nav mark; hero = larger lockup */
  variant?: "header" | "hero";
  className?: string;
  priority?: boolean;
};

export function StoreBrandLogo({
  alt,
  variant = "header",
  className,
  priority = false,
}: StoreBrandLogoProps) {
  const isHero = variant === "hero";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 overflow-hidden bg-black",
        isHero
          ? "h-14 w-[min(100%,13.5rem)] rounded-xl ring-1 ring-border sm:h-16 sm:w-[15.5rem]"
          : "h-9 w-[8.25rem] rounded-lg sm:h-10 sm:w-[9.25rem]",
        className,
      )}
    >
      <Image
        src={STORE_LOGO_SRC}
        alt={alt}
        width={STORE_LOGO_WIDTH}
        height={STORE_LOGO_HEIGHT}
        priority={priority}
        className="h-full w-full object-contain object-center"
      />
    </span>
  );
}
