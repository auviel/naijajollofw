import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo/site";

const DISALLOW = [
  "/account",
  "/cart",
  "/checkout",
  "/orders/",
  "/signin",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/login",
  "/dashboard",
  "/api/",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: DISALLOW,
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: new URL(absoluteUrl("/")).host,
  };
}
