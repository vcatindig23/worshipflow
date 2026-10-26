import { revalidatePath } from "next/cache"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { isSameOriginRequest, RECOVERY_COOKIE } from "@/lib/auth-security"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request.headers, request.url)) return NextResponse.json({ error: "Request could not be verified." }, { status: 403 })
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut({ scope: "global" })

  if (error) {
    return NextResponse.redirect(
      new URL("/error?code=sign_out_failed", request.url),
      303
    )
  }

  revalidatePath("/", "layout")
  ;(await cookies()).delete(RECOVERY_COOKIE)
  const response = NextResponse.redirect(new URL("/login", request.url), 303)
  response.headers.set("Cache-Control", "private, no-store")
  response.headers.set("Clear-Site-Data", '"cache", "storage"')
  return response
}
