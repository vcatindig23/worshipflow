"use client"

import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"
import { shouldLoadSiteUtilities } from "@/lib/site-utilities-routes"

const HomeButton = dynamic(() => import("@/components/home-button"), {
  ssr: false,
  loading: () => null,
})

export default function HomeButtonLoader() {
  const pathname = usePathname()

  if (!shouldLoadSiteUtilities(pathname)) {
    return null
  }

  return <HomeButton />
}
