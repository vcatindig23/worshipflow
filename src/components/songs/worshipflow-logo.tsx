import Image from "next/image"

type WorshipFlowLogoProps = {
  className?: string
}

export default function WorshipFlowLogo({
  className = "size-6",
}: WorshipFlowLogoProps) {
  return (
    <Image
      src="/worshipflow-mark.svg"
      alt=""
      aria-hidden="true"
      width={64}
      height={64}
      className={className}
    />
  )
}
