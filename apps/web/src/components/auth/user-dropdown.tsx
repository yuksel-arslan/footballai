'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { User, LogOut, Settings, Heart, Bell } from 'lucide-react'

export function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { user, logout } = useAuth()

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!user) return null

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 rounded-full border border-border p-1.5 pr-3 transition-colors',
          'hover:bg-muted',
          isOpen && 'bg-muted'
        )}
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.fullName || user.email}
            className="h-8 w-8 rounded-full"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <User className="h-4 w-4 text-primary" />
          </div>
        )}
        <span className="text-sm font-medium">
          {user.fullName || user.email.split('@')[0]}
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-border bg-card py-1 shadow-lg">
          {/* User info */}
          <div className="border-b border-border px-4 py-3">
            <p className="font-medium">{user.fullName || 'Kullanıcı'}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <DropdownItem
              icon={<Heart className="h-4 w-4" />}
              label="Favorilerim"
              onClick={() => {
                setIsOpen(false)
                // Navigate to favorites
              }}
            />
            <DropdownItem
              icon={<Bell className="h-4 w-4" />}
              label="Bildirimler"
              onClick={() => {
                setIsOpen(false)
                // Navigate to notifications
              }}
            />
            <DropdownItem
              icon={<Settings className="h-4 w-4" />}
              label="Ayarlar"
              onClick={() => {
                setIsOpen(false)
                // Navigate to settings
              }}
            />
          </div>

          {/* Logout */}
          <div className="border-t border-border py-1">
            <DropdownItem
              icon={<LogOut className="h-4 w-4" />}
              label="Çıkış Yap"
              onClick={() => {
                setIsOpen(false)
                logout()
              }}
              variant="destructive"
            />
          </div>
        </div>
      )}
    </div>
  )
}

function DropdownItem({
  icon,
  label,
  onClick,
  variant = 'default',
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  variant?: 'default' | 'destructive'
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 px-4 py-2 text-sm transition-colors',
        variant === 'default' && 'text-foreground hover:bg-muted',
        variant === 'destructive' && 'text-destructive hover:bg-destructive/10'
      )}
    >
      {icon}
      {label}
    </button>
  )
}
