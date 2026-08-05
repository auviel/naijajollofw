import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 sm:mb-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="min-w-0 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {title}
        </h1>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {description ? (
        <p className="mt-1 text-sm text-text-secondary">{description}</p>
      ) : null}
    </div>
  );
}

export function PrimaryLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-12 w-full items-center justify-center rounded-md bg-accent px-5 text-sm font-medium text-text-inverse transition-colors duration-fast hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground sm:w-auto"
    >
      {children}
    </Link>
  );
}
