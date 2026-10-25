import type { MetadataRoute } from "next"
import { canonicalUrl, INDEXABLE_PUBLIC_PATHS, isPreviewDeployment } from "@/lib/seo"

export default function sitemap(): MetadataRoute.Sitemap {
  if (isPreviewDeployment()) return []
  // No invented last-modified dates, workspace IDs, auth links, or query strings.
  return INDEXABLE_PUBLIC_PATHS.map((path) => ({ url: canonicalUrl(path) }))
}
