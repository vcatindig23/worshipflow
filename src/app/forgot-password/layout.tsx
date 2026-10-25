import { publicPageMetadata } from "@/lib/seo"

export const metadata = publicPageMetadata("/forgot-password", "Reset your password", "Recover access to your WorshipFlow account by requesting a password reset link.", false)

export default function ForgotPasswordLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children
}
