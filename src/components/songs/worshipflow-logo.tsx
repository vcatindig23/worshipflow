type WorshipFlowLogoProps = {
  className?: string
}

export default function WorshipFlowLogo({
  className = "size-6",
}: WorshipFlowLogoProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 64 64"
      fill="none"
      className={className}
    >
      <path
        d="M17 17v28m27-35v29M17 17l27-7v9L17 26"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <ellipse
        cx="14"
        cy="49"
        rx="8"
        ry="6"
        fill="currentColor"
        transform="rotate(-18 14 49)"
      />
      <ellipse
        cx="41"
        cy="41"
        rx="8"
        ry="6"
        fill="currentColor"
        transform="rotate(-18 41 41)"
      />
      <path
        d="M24 51c4-4 8-5 13-5"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        opacity=".72"
      />
    </svg>
  )
}
