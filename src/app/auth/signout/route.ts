import { revalidatePath } from "next/cache"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data } = await supabase.auth.getClaims()

  if (!data?.claims) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  const { error } = await supabase.auth.signOut()

  if (error) {
    return NextResponse.redirect(
      new URL("/error?code=sign_out_failed", request.url)
    )
  }

  revalidatePath("/", "layout")

  return NextResponse.redirect(new URL("/login", request.url))
}