import type { Metadata } from "next"

export const SITE_URL = "https://worshipflow-weld.vercel.app"
export const SITE_DESCRIPTION =
  "WorshipFlow helps church worship teams organize songs, chord charts, setlists, service plans, schedules, and team communication."
export const INDEXABLE_PUBLIC_PATHS = [
  "/",
  "/faq",
  "/privacy",
  "/terms",
] as const
export const NO_INDEX_ROBOTS: Metadata["robots"] = {
  index: false,
  follow: false,
}

export function isPreviewDeployment() {
  return Boolean(
    process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production"
  )
}

export function canonicalUrl(path: string) {
  // Only paths maintained in code are accepted; never derive canonicals from request hosts.
  const url = new URL(path, SITE_URL)
  if (url.origin !== SITE_URL)
    throw new Error("Canonical URL must use the production origin.")
  url.search = ""
  url.hash = ""
  return url.toString()
}

export function publicPageMetadata(
  path: string,
  title: string,
  description: string,
  index = true
): Metadata {
  const pageTitle = title.startsWith("WorshipFlow")
    ? title
    : `${title} | WorshipFlow`
  const url = canonicalUrl(path)
  const images = [
    {
      url: canonicalUrl("/opengraph-image"),
      width: 1200,
      height: 630,
      alt: "WorshipFlow — songs, services, and team coordination",
    },
  ]
  return {
    title: { absolute: pageTitle },
    description,
    alternates: { canonical: url },
    robots:
      index && !isPreviewDeployment()
        ? { index: true, follow: true }
        : NO_INDEX_ROBOTS,
    openGraph: {
      type: "website",
      siteName: "WorshipFlow",
      title: pageTitle,
      description,
      url,
      images,
      locale: "en_PH",
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description,
      images,
    },
  }
}

export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c")
}

export const homeStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: "WorshipFlow",
      url: SITE_URL,
      description: SITE_DESCRIPTION,
    },
    {
      "@type": "SoftwareApplication",
      name: "WorshipFlow",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: SITE_URL,
      description: SITE_DESCRIPTION,
    },
  ],
}
