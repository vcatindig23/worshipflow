import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "WorshipFlow",
    short_name: "WorshipFlow",
    description:
      "A worship workspace for songs, chords, setlists, services, and teams.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f5f7f5",
    theme_color: "#365c45",
    icons: [
      {
        src: "/worshipflow-app-icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  }
}
