"use client"

import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"
import { shouldLoadSiteUtilities } from "@/lib/site-utilities-routes"

const SiteUtilities = dynamic(() => import("@/components/site-utilities"), {
  ssr: false,
  loading: () => null,
})

export default function SiteUtilitiesLoader() {
  const pathname = usePathname()
  if (!shouldLoadSiteUtilities(pathname)) return null
  return <SiteUtilities />
}
