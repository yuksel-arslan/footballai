'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import env from '@/lib/env'

interface LiveScore {
  fixtureId: number
  homeScore: number
  awayScore: number
  minute: number
  status: string
}

interface UseWebSocketOptions {
  enabled?: boolean
  onScoreUpdate?: (score: LiveScore) => void
  onConnect?: () => void
  onDisconnect?: () => void
}

interface SocketRef {
  emit: (event: string, ...args: unknown[]) => void
  disconnect: () => void
  on: (event: string, callback: (...args: unknown[]) => void) => void
}

interface UseWebSocketReturn {
  isConnected: boolean
  liveScores: Map<number, LiveScore>
  subscribeToMatch: (fixtureId: number) => void
  unsubscribeFromMatch: (fixtureId: number) => void
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
  const socketRef = useRef<SocketRef | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [liveScores, setLiveScores] = useState<Map<number, LiveScore>>(
    new Map()
  )

  useEffect(() => {
    if (!enabled) return

    let disposed = false

    import('socket.io-client').then(({ io }) => {
      if (disposed) return

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

      socket.on('score:update', (data: unknown) => {
        const score = data as LiveScore
        setLiveScores((prev) => {
          const updated = new Map(prev)
          updated.set(score.fixtureId, score)
          return updated
        })
        onScoreUpdate?.(score)
      })

      socket.on('match:start', (data: unknown) => {
        const score = data as LiveScore
        setLiveScores((prev) => {
          const updated = new Map(prev)
          updated.set(score.fixtureId, score)
          return updated
        })
      })

      socket.on('match:end', (data: unknown) => {
        const score = data as LiveScore
        setLiveScores((prev) => {
          const updated = new Map(prev)
          updated.delete(score.fixtureId)
          return updated
        })
      })
    })

    return () => {
      disposed = true
      socketRef.current?.disconnect()
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
  }
}
