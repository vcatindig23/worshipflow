import { beforeEach, describe, expect, it, vi } from "vitest"
const m = vi.hoisted(() => ({
  account: vi.fn(), rate: vi.fn(), password: vi.fn(), admin: vi.fn(),
  redirect: vi.fn((path: string): never => { throw new Error("REDIRECT:" + path) }),
  deleteCookie: vi.fn(),
}))
vi.mock("@/lib/account-session", () => ({ requireAccountSession: m.account }))
vi.mock("@/lib/auth-rate-limit", () => ({ allowAuthAttempt: m.rate }))
vi.mock("@/lib/reauthenticate", () => ({ verifyCurrentPassword: m.password }))
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: m.admin }))
vi.mock("next/navigation", () => ({ redirect: m.redirect }))
vi.mock("next/headers", () => ({ cookies: async () => ({ delete: m.deleteCookie }) }))
import { changePassword, deleteAccount, disableMfa, verifyMfaEnrollment } from "../../src/app/settings/security/actions"
import { verifyMfa } from "../../src/app/auth/mfa/actions"

function form(values: Record<string, string> = {}) {
  const data = new FormData()
  Object.entries(values).forEach(([k,v]) => data.set(k,v))
  return data
}
let client: ReturnType<typeof fixture>
function fixture() {
  const supabase = { auth: {
    updateUser: vi.fn(async () => ({ error: null })),
    signOut: vi.fn(async () => ({ error: null })),
    mfa: {
      listFactors: vi.fn(async () => ({ data: { totp: [{ id: "own-factor" }], all: [] }, error: null })),
      challengeAndVerify: vi.fn(async () => ({ error: null })),
      unenroll: vi.fn(async () => ({ error: null })),
    },
  } }
  const admin = {
    rpc: vi.fn(async (name: string) => ({ data: name === "account_deletion_preflight" ? true : [], error: null })),
    storage: { from: vi.fn(() => ({ remove: vi.fn(async () => ({ error: null })) })) },
    auth: { admin: { deleteUser: vi.fn(async () => ({ error: null })) } },
  }
  m.account.mockResolvedValue({ supabase, user: { id: "own-user", email: "fixture@example.invalid" }, state: { active: true, verified: true, mfaRequired: false } })
  m.admin.mockReturnValue(admin)
  return { supabase, admin }
}
beforeEach(() => { vi.clearAllMocks(); m.rate.mockResolvedValue(true); m.password.mockResolvedValue(true); client = fixture() })

describe("sensitive account actions", () => {
  const passwords = { password: "a-long-new-password", confirmPassword: "a-long-new-password", currentPassword: "current-password" }
  it("requires current-password reauthentication before changing a password", async () => {
    m.password.mockResolvedValue(false)
    await expect(changePassword(form(passwords))).rejects.toThrow("reauthentication")
    expect(client.supabase.auth.updateUser).not.toHaveBeenCalled()
  })
  it("fails closed when rate limiting is unavailable", async () => {
    m.rate.mockResolvedValue(false)
    await expect(changePassword(form(passwords))).rejects.toThrow("rate_limited")
    expect(m.password).not.toHaveBeenCalled()
  })
  it("checks password byte length before calling Auth", async () => {
    await expect(changePassword(form({ ...passwords, password: "🙂".repeat(20), confirmPassword: "🙂".repeat(20) }))).rejects.toThrow("error=password")
    expect(m.account).not.toHaveBeenCalled()
  })
  it("updates the password and revokes every session", async () => {
    await expect(changePassword(form(passwords))).rejects.toThrow("saved=true")
    expect(client.supabase.auth.updateUser).toHaveBeenCalledWith({ password: passwords.password, current_password: passwords.currentPassword })
    expect(client.supabase.auth.signOut).toHaveBeenCalledWith({ scope: "global" })
    expect(m.deleteCookie).toHaveBeenCalledWith("wf-recovery")
  })
  it("does not report success if revocation fails", async () => {
    client.supabase.auth.signOut.mockResolvedValue({ error: {} } as never)
    await expect(changePassword(form(passwords))).rejects.toThrow("error=revocation")
  })
})

describe("account deletion", () => {
  it("requires explicit confirmation before authentication or deletion", async () => {
    await expect(deleteAccount(form())).rejects.toThrow("confirmation")
    expect(m.account).not.toHaveBeenCalled()
    expect(m.admin).not.toHaveBeenCalled()
  })
  it("protects the last administrator before removing uploads", async () => {
    client.admin.rpc.mockResolvedValue({ data: false, error: null } as never)
    await expect(deleteAccount(form({ confirmation: "DELETE", userId: "other-user" }))).rejects.toThrow("last_admin")
    expect(client.admin.rpc).toHaveBeenCalledExactlyOnceWith("account_deletion_preflight", { p_user_id: "own-user" })
    expect(client.admin.storage.from).not.toHaveBeenCalled()
    expect(client.admin.auth.admin.deleteUser).not.toHaveBeenCalled()
  })
  it("derives the deleted account from the session, ignoring submitted IDs", async () => {
    await expect(deleteAccount(form({ confirmation: "DELETE", userId: "other-user" }))).rejects.toThrow("account_deleted=1")
    expect(client.admin.auth.admin.deleteUser).toHaveBeenCalledWith("own-user")
    expect(client.supabase.auth.signOut).toHaveBeenCalledWith({ scope: "global" })
  })
  it("preserves the account if upload cleanup fails", async () => {
    client.admin.rpc.mockImplementation(async (name: string) => ({ data: name === "account_deletion_preflight" ? true : [{ bucket_id: "private-files", name: "owned-path" }], error: null }) as never)
    client.admin.storage.from.mockReturnValue({ remove: vi.fn(async () => ({ error: {} })) } as never)
    await expect(deleteAccount(form({ confirmation: "DELETE" }))).rejects.toThrow("deletion_uploads")
    expect(client.admin.auth.admin.deleteUser).not.toHaveBeenCalled()
    expect(client.supabase.auth.signOut).not.toHaveBeenCalled()
  })
})

describe("MFA verification", () => {
  it("verifies only a factor owned by the signed-in user", async () => {
    await expect(verifyMfa(form({ code: "123456", factorId: "other-factor", next: "https://evil.example" }))).rejects.toThrow("REDIRECT:/")
    expect(client.supabase.auth.mfa.challengeAndVerify).toHaveBeenCalledWith({ factorId: "own-factor", code: "123456" })
  })
  it("rejects guessed enrollment factor IDs", async () => {
    await expect(verifyMfaEnrollment(form({ factorId: "other-factor", code: "123456" }))).rejects.toThrow("mfa_setup")
    expect(client.supabase.auth.mfa.challengeAndVerify).not.toHaveBeenCalled()
  })
  it("requires password and a fresh code before removing MFA", async () => {
    client.supabase.auth.mfa.challengeAndVerify.mockResolvedValue({ error: {} } as never)
    await expect(disableMfa(form({ code: "123456", currentPassword: "current-password" }))).rejects.toThrow("mfa_code")
    expect(m.password).toHaveBeenCalled()
    expect(client.supabase.auth.mfa.unenroll).not.toHaveBeenCalled()
  })
})
