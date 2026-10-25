import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import { getWorkspace } from "@/lib/workspace/get-workspace"
import { homeStructuredData, NO_INDEX_ROBOTS, publicPageMetadata, serializeJsonLd, SITE_DESCRIPTION } from "@/lib/seo"
import DashboardView from "@/components/dashboard-view"
import LandingHero from "@/components/landing-hero"

const getHomeUser = cache(async () => {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  return data?.claims?.sub ?? null
})

export async function generateMetadata() {
  if (await getHomeUser()) return { title: "Dashboard", robots: NO_INDEX_ROBOTS }
  return publicPageMetadata("/", "WorshipFlow — Worship Team Planning", SITE_DESCRIPTION)
}

export default async function HomePage() {
  if (!(await getHomeUser())) {
    return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(homeStructuredData) }} /><LandingHero /></>
  }
  const workspace = await getWorkspace()
  return <DashboardView workspace={workspace} />
}
