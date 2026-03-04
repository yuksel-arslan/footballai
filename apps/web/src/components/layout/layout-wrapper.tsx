'use client'

import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth/use-auth'
import { usePathname } from 'next/navigation'
import { Sidebar } from './sidebar'
import { Header } from './header'

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { layoutMode } = useI18n()
  const { user, loading } = useAuth()
  const pathname = usePathname()

  // Landing page for unauthenticated users - no sidebar/header
  if (pathname === '/' && !user && !loading) {
    return <div className="min-w-0 w-full">{children}</div>
  }

  if (layoutMode === 'header') {
    return (
      <>
        <Header />
        <div className="min-w-0">{children}</div>
      </>
    )
  }

  return (
    <>
      <Sidebar />
      <div className="flex-1 min-w-0">{children}</div>
    </>
  )
}
