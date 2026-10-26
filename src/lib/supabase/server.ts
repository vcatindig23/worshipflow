import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getPublicEnv } from "./env"
import { sessionCookieOptions } from "@/lib/auth-security"

export async function createClient() {
  const cookieStore = await cookies()
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } =
    getPublicEnv()

  return createServerClient(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookieOptions: sessionCookieOptions(),
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, { ...options, ...sessionCookieOptions(), maxAge: options.maxAge ?? sessionCookieOptions().maxAge })
            })
          } catch {}
        },
      },
    }
  )
}
