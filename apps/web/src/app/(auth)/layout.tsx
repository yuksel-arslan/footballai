import Link from 'next/link'
import { AnimatedLogo } from '@/components/ui/animated-logo'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      {/* Logo */}
      <Link href="/" className="mb-8 flex items-center">
        <AnimatedLogo size={128} />
      </Link>

      {/* Content */}
      <div className="w-full max-w-md">{children}</div>

      {/* Footer */}
      <p className="mt-8 text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} FootballAI. All rights reserved.
      </p>
    </div>
  )
}
