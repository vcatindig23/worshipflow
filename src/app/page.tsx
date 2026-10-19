import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { getWorkspace } from "@/lib/workspace/get-workspace"
import DashboardView from "@/components/dashboard-view"
import LandingHero from "@/components/landing-hero"

export const metadata: Metadata = {
  title: "WorshipFlow — Worship Team Planning",
  description:
    "Bring songs, chord charts, service plans, schedules, and worship team communication into one calm, organized workspace.",
  alternates: {
    canonical: "/",
  },
}

export default async function HomePage() {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()

  if (!claimsData?.claims?.sub) {
    return <LandingHero />
  }

  const workspace = await getWorkspace()
  return <DashboardView workspace={workspace} />
}
