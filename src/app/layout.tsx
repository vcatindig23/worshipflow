import type { Metadata } from "next"
import HomeButton from "@/components/home-button"
import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: "WorshipFlow",
    template: "%s | WorshipFlow",
  },
  description: "A worship workspace for songs, chords, setlists, services, and teams.",
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