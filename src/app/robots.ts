import type { MetadataRoute } from "next"

const siteUrl = "https://worshipflow-weld.vercel.app"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/login", "/signup", "/forgot-password"],
      disallow: [
        "/api/",
        "/activity",
        "/chat",
        "/files",
        "/my-schedule",
        "/notifications",
        "/onboarding",
        "/profile",
        "/search",
        "/services",
        "/setlists",
        "/settings",
        "/songs",
        "/auth/",
        "/check-email",
        "/reset-password",
      ],
    },
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
    host: siteUrl,
  }
}
