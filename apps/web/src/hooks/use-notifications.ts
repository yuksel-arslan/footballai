'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface Notification {
  id: number
  userId: string
  type: string
  title: string
  message: string
  metadata: any
  isRead: boolean
  createdAt: string
}

async function fetchNotifications(page = 1): Promise<{ data: Notification[]; pagination: any }> {
  const res = await fetch(`/api/notifications?page=${page}`)
  if (!res.ok) throw new Error('Failed to fetch notifications')
  return res.json()
}

async function fetchUnreadCount(): Promise<number> {
  const res = await fetch('/api/notifications/unread-count')
  if (!res.ok) throw new Error('Failed to fetch unread count')
  const data = await res.json()
  return data.data?.count ?? 0
}

async function markAsRead(id: number): Promise<void> {
  const res = await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
  if (!res.ok) throw new Error('Failed to mark as read')
}

async function markAllAsRead(): Promise<void> {
  const res = await fetch('/api/notifications/read-all', { method: 'PATCH' })
  if (!res.ok) throw new Error('Failed to mark all as read')
}

async function deleteNotification(id: number): Promise<void> {
  const res = await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete notification')
}

export function useNotifications(page = 1) {
  return useQuery({
    queryKey: ['notifications', page],
    queryFn: () => fetchNotifications(page),
    staleTime: 1000 * 60,
  })
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: fetchUnreadCount,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  })
}

export function useMarkAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useDeleteNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
