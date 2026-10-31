import { protectedRouteRoots } from "./src/lib/public-paths"
import { isPreviewDeployment } from "./src/lib/seo"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
    serverActions: {
      bodySizeLimit: "6mb",
      // GitHub Codespaces forwards requests through a public port URL.
      // Trust that origin only in development; keep production's default
      // Server Actions origin validation unchanged.
      ...(process.env.NODE_ENV === "development"
        ? { allowedOrigins: ["*.app.github.dev"] }
        : {}),
    },
  },
  async headers() {
    return [
      ...(isPreviewDeployment() ? [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }] : []),
      ...[...protectedRouteRoots, "/e2e", "/auth", "/login", "/signup", "/forgot-password", "/reset-password", "/check-email", "/error", "/offline-stage.html"].map((path) => ({
        source: `${path}/:path*`,
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "Cache-Control", value: "private, no-store" }],
      })),
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Origin-Agent-Cluster", value: "?1" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      { source: "/auth/:path*", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] },
    ]
  },
}

export default nextConfig
