import type { Metadata } from "next";
import Link from "next/link";
import { verifyDinerEmailToken } from "@/lib/services/diner/email-verification";
import { isAppError } from "@/lib/utils/errors";

export const metadata: Metadata = {
  title: "Verify email",
  description: "Confirm your Naija Jollof Waterloo account email.",
};

type VerifyEmailPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const params = await searchParams;
  const token = params.token?.trim() ?? "";

  if (!token) {
    return (
      <VerifyResult
        title="Missing verification link"
        body="Open the link from your email, or request a new one from your account."
        ok={false}
      />
    );
  }

  try {
    const result = await verifyDinerEmailToken(token);
    return (
      <VerifyResult
        title="Email verified"
        body={`Thanks — ${result.email} is confirmed. You’re all set.`}
        ok
      />
    );
  } catch (error) {
    const message = isAppError(error)
      ? error.message
      : "This verification link is invalid or has expired.";
    return <VerifyResult title="Couldn’t verify email" body={message} ok={false} />;
  }
}

function VerifyResult({
  title,
  body,
  ok,
}: {
  title: string;
  body: string;
  ok: boolean;
}) {
  return (
    <section className="mx-auto w-full max-w-md py-8 sm:py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
        {title}
      </h1>
      <p className="mt-3 text-sm text-text-secondary">{body}</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/account"
          className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-text-inverse no-underline"
        >
          Go to account
        </Link>
        {!ok ? (
          <Link
            href="/signin"
            className="inline-flex h-11 items-center justify-center rounded-md border border-border px-4 text-sm font-medium text-foreground no-underline"
          >
            Sign in
          </Link>
        ) : null}
      </div>
    </section>
  );
}
