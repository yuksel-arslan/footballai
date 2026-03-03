'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, type Socket } from 'socket.io-client'
import env from '@/lib/env'

interface LiveScore {
  fixtureId: number
  homeScore: number
  awayScore: number
  minute: number
  status: string
  events?: Array<{
    type: string
    minute: number
    player: string
    team: string
  }>
}

interface UseWebSocketOptions {
  enabled?: boolean
  onScoreUpdate?: (score: LiveScore) => void
  onConnect?: () => void
  onDisconnect?: () => void
}

interface UseWebSocketReturn {
  isConnected: boolean
  liveScores: Map<number, LiveScore>
  subscribeToMatch: (fixtureId: number) => void
  unsubscribeFromMatch: (fixtureId: number) => void
  socket: Socket | null
}

export function useWebSocket(
  options: UseWebSocketOptions = {}
): UseWebSocketReturn {
  const {
    enabled = env.enableWebSocket,
    onScoreUpdate,
    onConnect,
    onDisconnect,
  } = options
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [liveScores, setLiveScores] = useState<Map<number, LiveScore>>(
    new Map()
  )

  useEffect(() => {
    if (!enabled) return

    const socket = io(env.wsUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 10000,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setIsConnected(true)
      onConnect?.()
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
      onDisconnect?.()
    })

    socket.on('score:update', (data: LiveScore) => {
      setLiveScores((prev) => {
        const next = new Map(prev)
        next.set(data.fixtureId, data)
        return next
      })
      onScoreUpdate?.(data)
    })

    socket.on('match:start', (data: LiveScore) => {
      setLiveScores((prev) => {
        const next = new Map(prev)
        next.set(data.fixtureId, data)
        return next
      })
    })

    socket.on('match:end', (data: LiveScore) => {
      setLiveScores((prev) => {
        const next = new Map(prev)
        next.delete(data.fixtureId)
        return next
      })
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [enabled])

  const subscribeToMatch = useCallback((fixtureId: number): void => {
    socketRef.current?.emit('subscribe:match', fixtureId)
  }, [])

  const unsubscribeFromMatch = useCallback((fixtureId: number): void => {
    socketRef.current?.emit('unsubscribe:match', fixtureId)
  }, [])

  return {
    isConnected,
    liveScores,
    subscribeToMatch,
    unsubscribeFromMatch,
    socket: socketRef.current,
  }
}
