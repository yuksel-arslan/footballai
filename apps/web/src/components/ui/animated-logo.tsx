'use client'

import Image from 'next/image'

export function AnimatedLogo({
  size = 40,
  className = '',
}: {
  size?: number
  className?: string
}) {
  return (
    <Image
      src="/logo.svg"
      alt="FootballAI"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      priority
    />
  )
}
