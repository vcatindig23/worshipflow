import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Set up your workspace",
  description:
    "Set up your WorshipFlow workspace or join your church's existing worship team.",
}

export default function OnboardingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children
}
