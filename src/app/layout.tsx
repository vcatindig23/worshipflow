import type { Metadata, Viewport } from "next"
import HomeButton from "@/components/home-button"
import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: "WorshipFlow",
    template: "%s | WorshipFlow",
  },
  description: "A worship workspace for songs, chords, setlists, services, and teams.",
  appleWebApp: {
    capable: true,
    title: "WorshipFlow",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/worshipflow-192.png",
    apple: "/apple-touch-icon.png",
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
        <HomeButton />
      </body>
    </html>
  )
}