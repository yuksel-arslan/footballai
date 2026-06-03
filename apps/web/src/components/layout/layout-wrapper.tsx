'use client'

import { usePathname } from 'next/navigation'
import { AppShell } from './app-shell'

// Pages that render their own full-screen layout (no app shell).
const BARE_PAGES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/two-factor',
]

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (BARE_PAGES.includes(pathname)) {
    return <div className="min-w-0 w-full">{children}</div>
  }

  return (
    <div className="flex w-full min-w-0 flex-col">
      <AppShell />
      <div className="min-w-0 w-full flex-1">{children}</div>
    </div>
  )
}
