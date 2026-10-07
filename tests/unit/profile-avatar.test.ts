import { describe, expect, it } from "vitest"
import {
  getProfileAvatarExtension,
  MAX_PROFILE_AVATAR_SIZE,
} from "../../src/features/profile/profile-avatar"

describe("profile avatar uploads", () => {
  it("accepts matching JPEG, PNG, and WebP file signatures", () => {
    expect(
      getProfileAvatarExtension(
        "image/jpeg",
        new Uint8Array([0xff, 0xd8, 0xff])
      )
    ).toBe("jpg")
    expect(
      getProfileAvatarExtension(
        "image/png",
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      )
    ).toBe("png")
    expect(
      getProfileAvatarExtension(
        "image/webp",
        new Uint8Array([
          0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
        ])
      )
    ).toBe("webp")
  })

  it("rejects unsupported formats and mismatched image signatures", () => {
    expect(getProfileAvatarExtension("image/svg+xml", new Uint8Array())).toBeNull()
    expect(
      getProfileAvatarExtension("image/png", new Uint8Array([0xff, 0xd8, 0xff]))
    ).toBeNull()
    expect(getProfileAvatarExtension("text/plain", new Uint8Array())).toBeNull()
  })

  it("limits profile images to 5 MB", () => {
    expect(MAX_PROFILE_AVATAR_SIZE).toBe(5 * 1024 * 1024)
  })
})
