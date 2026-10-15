import type { MetadataRoute } from "next"

const siteUrl = "https://worshipflow-weld.vercel.app"

export default function sitemap(): MetadataRoute.Sitemap {
  const publicRoutes = [
    { path: "/login", priority: 0.8 },
    { path: "/signup", priority: 0.8 },
    { path: "/forgot-password", priority: 0.3 },
  ]

  return publicRoutes.map(({ path, priority }) => ({
    url: new URL(path, siteUrl).toString(),
    changeFrequency: "monthly",
    priority,
  }))
}
