import Link from 'next/link'
import { AnimatedLogo } from '@/components/ui/animated-logo'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-background via-background to-[#8B5CF6]/5">
      {/* Logo */}
      <Link href="/" className="flex items-center mb-8">
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
