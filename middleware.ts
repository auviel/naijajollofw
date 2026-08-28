import { authConfig } from "@/lib/auth/auth.config";
import NextAuth from "next-auth";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

function isStaffPath(pathname: string): boolean {
  return (
    pathname.startsWith("/dashboard") ||
    pathname === "/staff" ||
    pathname.startsWith("/staff/")
  );
}

function staffLoginRedirect(request: { nextUrl: URL }, pathname: string) {
  const loginUrl = new URL("/login", request.nextUrl);
  const callback =
    pathname === "/staff" || pathname.startsWith("/staff/")
      ? "/dashboard"
      : pathname;
  loginUrl.searchParams.set("callbackUrl", callback);
  return NextResponse.redirect(loginUrl);
}

export default auth((request) => {
  const { pathname } = request.nextUrl;
  const session = request.auth;
  const isLoggedIn = !!session;
  const role = session?.user?.role;

  if (isStaffPath(pathname)) {
    if (!isLoggedIn) {
      return staffLoginRedirect(request, pathname);
    }
    if (role !== "STORE_MANAGER") {
      return NextResponse.redirect(new URL("/", request.nextUrl));
    }
    // Friendly alias — send staff home instead of 404.
    if (pathname === "/staff" || pathname.startsWith("/staff/")) {
      return NextResponse.redirect(new URL("/dashboard", request.nextUrl));
    }
    return NextResponse.next();
  }

  if (pathname === "/login") {
    if (isLoggedIn && role === "STORE_MANAGER") {
      return NextResponse.redirect(new URL("/dashboard", request.nextUrl));
    }
    if (isLoggedIn && role === "DINER") {
      return NextResponse.redirect(new URL("/", request.nextUrl));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/account")) {
    if (!isLoggedIn) {
      const signInUrl = new URL("/signin", request.nextUrl);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }
    if (role === "STORE_MANAGER") {
      return NextResponse.redirect(new URL("/dashboard", request.nextUrl));
    }
    if (role !== "DINER") {
      return NextResponse.redirect(new URL("/signin", request.nextUrl));
    }
    return NextResponse.next();
  }

  if (pathname === "/signin" || pathname === "/signup" || pathname === "/forgot-password") {
    if (isLoggedIn && role === "DINER") {
      return NextResponse.redirect(new URL("/account", request.nextUrl));
    }
    if (isLoggedIn && role === "STORE_MANAGER") {
      return NextResponse.redirect(new URL("/dashboard", request.nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/staff",
    "/staff/:path*",
    "/login",
    "/signin",
    "/signup",
    "/forgot-password",
    "/account",
    "/account/:path*",
  ],
};
