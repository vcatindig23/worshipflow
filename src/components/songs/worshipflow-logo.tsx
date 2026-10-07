import Image from "next/image"

type WorshipFlowLogoProps = {
  className?: string
}

export default function WorshipFlowLogo({
  className = "size-6",
}: WorshipFlowLogoProps) {
  return (
    <Image
      src="/worshipflow-mark.png"
      alt=""
      aria-hidden="true"
      width={340}
      height={320}
      className={`object-contain ${className}`}
    />
  )
}
