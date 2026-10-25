import { publicPageMetadata } from "@/lib/seo"

export const metadata = publicPageMetadata("/signup", "Create your account", "Create a WorshipFlow account to plan worship services, organize songs and chord charts, and coordinate your church team.", false)

export default function SignupLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children
}
