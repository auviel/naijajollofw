import Image from "next/image";
import { cn } from "@/lib/utils/cn";

export const AMAKA_AVATAR_SRC = "/brand/amaka-avatar.png";

const SIZE_CLASS = {
  sm: "size-8",
  md: "size-10",
  lg: "size-12",
} as const;

type AmakaAvatarProps = {
  size?: keyof typeof SIZE_CLASS;
  className?: string;
};

/** Amaka profile avatar — illustration in /public/brand. */
export function AmakaAvatar({ size = "md", className }: AmakaAvatarProps) {
  const px = size === "sm" ? 32 : size === "md" ? 40 : 48;

  return (
    <Image
      src={AMAKA_AVATAR_SRC}
      alt="Amaka"
      width={px}
      height={px}
      className={cn(
        "shrink-0 rounded-full object-cover ring-1 ring-border",
        SIZE_CLASS[size],
        className,
      )}
    />
  );
}
