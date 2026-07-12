import { authConfig } from "@/lib/auth/auth.config";
import NextAuth from "next-auth";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((request) => {
  const { pathname } = request.nextUrl;
  const session = request.auth;
  const isLoggedIn = !!session;
  const role = session?.user?.role;

  if (pathname.startsWith("/dashboard")) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/login", request.nextUrl);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (role !== "STORE_MANAGER") {
      return NextResponse.redirect(new URL("/", request.nextUrl));
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
    "/login",
    "/signin",
    "/signup",
    "/forgot-password",
    "/account",
    "/account/:path*",
  ],
};
