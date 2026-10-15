import type { Metadata, Viewport } from "next"
import HomeButton from "@/components/home-button"
import OfflineSupport from "@/components/offline-support"
import "./globals.css"

const siteUrl = "https://worshipflow-weld.vercel.app"
const siteDescription =
  "WorshipFlow helps church worship teams organize songs, chords, setlists, service plans, schedules, and team communication."

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "WorshipFlow — Worship Team Planning",
    template: "%s | WorshipFlow",
  },
  description: siteDescription,
  applicationName: "WorshipFlow",
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
  alternates: {
    types: {
      "text/plain": "/llms.txt",
    },
  },
  openGraph: {
    type: "website",
    siteName: "WorshipFlow",
    title: "WorshipFlow — Worship Team Planning",
    description: siteDescription,
    images: [
      {
        url: "/worshipflow-brand.png",
        alt: "WorshipFlow — tools for worship team planning",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WorshipFlow — Worship Team Planning",
    description: siteDescription,
    images: [
      {
        url: "/worshipflow-brand.png",
        alt: "WorshipFlow — tools for worship team planning",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "WorshipFlow",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/worshipflow-app-icon.png",
    apple: "/worshipflow-app-icon.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#365c45",
}

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: "WorshipFlow",
      url: siteUrl,
      description: siteDescription,
    },
    {
      "@type": "SoftwareApplication",
      name: "WorshipFlow",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: siteUrl,
      description: siteDescription,
    },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
          }}
        />
        {children}
        <HomeButton />
        <OfflineSupport />
      </body>
    </html>
  )
}
