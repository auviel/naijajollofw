import Link from "next/link";

type NotFoundAction = {
  href: string;
  label: string;
};

type NotFoundPanelProps = {
  title: string;
  description: string;
  primaryAction: NotFoundAction;
  secondaryAction?: NotFoundAction;
};

export function NotFoundPanel({
  title,
  description,
  primaryAction,
  secondaryAction,
}: NotFoundPanelProps) {
  return (
    <div className="w-full max-w-lg rounded-2xl bg-surface-elevated p-8 text-center">
      <p className="text-sm font-medium uppercase tracking-wide text-text-secondary">
        404
      </p>
      <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground">
        {title}
      </h1>
      <p className="mt-2 text-sm text-text-secondary">{description}</p>
      <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          href={primaryAction.href}
          className="inline-flex h-12 items-center justify-center rounded-md bg-accent px-5 text-sm font-medium text-text-inverse transition-colors duration-fast hover:bg-accent-hover"
        >
          {primaryAction.label}
        </Link>
        {secondaryAction ? (
          <Link
            href={secondaryAction.href}
            className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            {secondaryAction.label}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
