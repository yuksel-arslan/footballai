'use client'

import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/use-online-status'

export function OfflineBanner() {
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4">
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-destructive text-destructive-foreground text-sm font-medium shadow-lg">
        <WifiOff className="w-4 h-4" />
        <span>Offline mode — some features may be unavailable</span>
      </div>
    </div>
  )
}
