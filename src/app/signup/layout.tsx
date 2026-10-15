import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Create your account",
  description:
    "Create a WorshipFlow account to plan worship services, organize songs and chord charts, and coordinate your church team.",
  alternates: {
    canonical: "/signup",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function SignupLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children
}
