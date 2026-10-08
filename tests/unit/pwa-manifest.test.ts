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

  it("provides the branded 512px app icon", () => {
    const appManifest = manifest()

    expect(appManifest.icons).toEqual([
      expect.objectContaining({
        src: "/worshipflow-app-icon.png",
        sizes: "512x512",
        purpose: "any",
      }),
    ])
  })
})
