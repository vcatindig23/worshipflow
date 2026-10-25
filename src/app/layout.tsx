import { SITE_URL, SITE_DESCRIPTION, NO_INDEX_ROBOTS } from "@/lib/seo"
import type { Metadata, Viewport } from "next"
import HomeButtonLoader from "@/components/home-button-loader"
import OfflineSupport from "@/components/offline-support"
import SitePreferences from "@/components/site-preferences"
import SiteUtilitiesLoader from "@/components/site-utilities-loader"
import "./globals.css"

const siteUrl = SITE_URL
const siteDescription = SITE_DESCRIPTION

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "WorshipFlow — Worship Team Planning",
    template: "%s | WorshipFlow",
  },
  description: siteDescription,
  applicationName: "WorshipFlow",
  robots: NO_INDEX_ROBOTS,
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <HomeButtonLoader />
        <OfflineSupport />
        <SitePreferences />
        <SiteUtilitiesLoader />
      </body>
    </html>
  )
}
