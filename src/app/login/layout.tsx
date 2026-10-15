import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to WorshipFlow to access your church worship team's songs, setlists, service plans, and schedule.",
  alternates: {
    canonical: "/login",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function LoginLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children
}
