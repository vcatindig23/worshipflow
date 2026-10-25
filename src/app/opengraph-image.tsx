import { ImageResponse } from "next/og"

export const alt =
  "WorshipFlow — prepare songs, plan services, and keep your team in sync"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        padding: "64px 72px",
        background: "#152b20",
        color: "#f5f7f5",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 38,
          fontWeight: 700,
          color: "#b8d9bf",
        }}
      >
        WorshipFlow
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          fontSize: 68,
          fontWeight: 700,
          lineHeight: 1.12,
          letterSpacing: "-2px",
        }}
      >
        <span>Prepare songs.</span>
        <span>Plan services.</span>
        <span>Keep your team in sync.</span>
      </div>
      <div style={{ display: "flex", fontSize: 24, color: "#c1cec4" }}>
        One workspace for your worship team.
      </div>
    </div>,
    size
  )
}
