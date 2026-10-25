import { publicPageMetadata } from "@/lib/seo"

export const metadata = publicPageMetadata("/login", "Sign in", "Sign in to WorshipFlow to access your church worship team's songs, setlists, service plans, and schedule.", false)

export default function LoginLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children
}
