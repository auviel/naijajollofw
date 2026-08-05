import Image from "next/image";
import { cn } from "@/lib/utils/cn";

type MenuItemThumbProps = {
  src: string;
  alt?: string;
  sizes: string;
  className?: string;
};

export function MenuItemThumb({
  src,
  alt = "",
  sizes,
  className,
}: MenuItemThumbProps) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      className={cn("object-cover", className)}
    />
  );
}
