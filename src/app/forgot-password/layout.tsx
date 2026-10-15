import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Reset your password",
  description:
    "Recover access to your WorshipFlow account by requesting a password reset link.",
  alternates: {
    canonical: "/forgot-password",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function ForgotPasswordLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children
}
