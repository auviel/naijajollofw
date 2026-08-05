import { cn } from "@/lib/utils/cn";

type FormBannerProps = {
  children: string;
  className?: string;
};

export function FormBanner({ children, className }: FormBannerProps) {
  return (
    <p role="alert" className={cn("text-sm text-error", className)}>
      {children}
    </p>
  );
}
