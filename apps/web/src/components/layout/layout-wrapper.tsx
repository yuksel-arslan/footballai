'use client'

import { useI18n } from '@/lib/i18n'
import { Sidebar } from './sidebar'
import { Header } from './header'

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { layoutMode } = useI18n()

  if (layoutMode === 'header') {
    return (
      <>
        <Header />
        <div className="min-w-0">
          {children}
        </div>
      </>
    )
  }

  return (
    <>
      <Sidebar />
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </>
  )
}
