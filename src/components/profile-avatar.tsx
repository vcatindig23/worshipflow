import Image from "next/image"

type ProfileAvatarProps = {
  name: string
  imageUrl?: string | null
  sizeClassName?: string
  className?: string
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase()
}

export default function ProfileAvatar({
  name,
  imageUrl,
  sizeClassName = "size-10",
  className = "",
}: ProfileAvatarProps) {
  return (
    <div
      className={`relative flex ${sizeClassName} shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--brand-soft)] text-xs font-bold text-[var(--brand)] ${className}`}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={`${name}'s profile photo`}
          width={48}
          height={48}
          unoptimized
          className="size-full object-cover"
        />
      ) : (
        getInitials(name)
      )}
    </div>
  )
}
