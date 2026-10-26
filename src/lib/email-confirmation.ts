import type { EmailOtpType } from "@supabase/supabase-js"

export const emailConfirmationTypes: EmailOtpType[] = ["email", "signup", "invite", "magiclink", "recovery", "email_change"]
export function isEmailConfirmation(tokenHash: unknown, type: unknown): tokenHash is string {
  return typeof tokenHash === "string" && tokenHash.length > 0 && tokenHash.length <= 2048 &&
    typeof type === "string" && emailConfirmationTypes.includes(type as EmailOtpType)
}
