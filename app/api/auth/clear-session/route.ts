import { signOut } from "@/lib/auth/index";
import { NextResponse } from "next/server";

function safeCallback(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/login";
  }
  return value;
}

/** Clears a stale Auth.js cookie (e.g. after DB reset) then redirects. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const callbackUrl = safeCallback(url.searchParams.get("callbackUrl"));
  await signOut({ redirect: false });
  return NextResponse.redirect(new URL(callbackUrl, url.origin));
}
