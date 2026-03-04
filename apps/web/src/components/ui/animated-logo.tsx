'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import Image from 'next/image'

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

  // Show placeholder until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <div
        className={`rounded-full bg-muted/30 ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }

  const logoSrc =
    resolvedTheme === 'light'
      ? '/footballai_logo_light.png'
      : '/footballai_logo_dark.png'

  return (
    <Image
      src={logoSrc}
      alt="FootballAI"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      priority
    />
  )
}
