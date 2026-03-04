'use client'

import Image from 'next/image'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function AnimatedLogo({
  size = 40,
  className = '',
}: {
  size?: number
  className?: string
}) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const src =
    mounted && resolvedTheme === 'dark' ? '/logo-dark.png' : '/logo-light.png'

  return (
    <Image
      src={src}
      alt="FootballAI"
      width={size * 3}
      height={size}
      className={`object-contain ${className}`}
      priority
    />
  )
}
