import type { MetadataRoute } from "next"
import { protectedRouteRoots } from "@/lib/public-paths"
import { canonicalUrl, isPreviewDeployment } from "@/lib/seo"

export default function robots(): MetadataRoute.Robots {
  if (isPreviewDeployment()) return { rules: { userAgent: "*", disallow: "/" } }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Account entry/error pages remain crawlable so crawlers can see their noindex tags.
      disallow: [...protectedRouteRoots, "/auth/", "/offline-stage.html", "/offline-stage.js"],
    },
    sitemap: canonicalUrl("/sitemap.xml"),
  }
}
