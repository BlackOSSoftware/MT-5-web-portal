import type { MetadataRoute } from "next";

const BASE = "https://user.oceanaprofx.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/signup", "/reset-password"],
        disallow: [
          "/dashboard",
          "/trade",
          "/ib",
          "/api",
          "/offline",
          "/verify-email",
          "/trade-open",
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
