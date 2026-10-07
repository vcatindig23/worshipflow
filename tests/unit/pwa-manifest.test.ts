import { describe, expect, it } from "vitest"
import manifest from "../../src/app/manifest"

describe("PWA manifest", () => {
  it("defines WorshipFlow as a standalone installable app", () => {
    const appManifest = manifest()

    expect(appManifest.name).toBe("WorshipFlow")
    expect(appManifest.start_url).toBe("/")
    expect(appManifest.scope).toBe("/")
    expect(appManifest.display).toBe("standalone")
  })

  it("provides standard and maskable icons at install sizes", () => {
    const appManifest = manifest()

    expect(appManifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          src: "/worshipflow-192.png",
          sizes: "192x192",
          purpose: "any",
        }),
        expect.objectContaining({
          src: "/worshipflow-512.png",
          sizes: "512x512",
          purpose: "any",
        }),
        expect.objectContaining({
          src: "/worshipflow-192.png",
          sizes: "192x192",
          purpose: "maskable",
        }),
        expect.objectContaining({
          src: "/worshipflow-512.png",
          sizes: "512x512",
          purpose: "maskable",
        }),
      ])
    )
  })
})
