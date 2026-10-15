import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Choose a new password",
  description: "Set a new password for your WorshipFlow account.",
  alternates: { canonical: "/reset-password" },
}

export default function ResetPasswordLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children
}
