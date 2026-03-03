'use client'

import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001'

export interface LiveScore {
  fixtureId: number
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  minute: number
  status: string
}

export function useLiveScores(): { scores: LiveScore[]; connected: boolean; socket: Socket | null } {
  const [scores, setScores] = useState<LiveScore[]>([])
  const [connected, setConnected] = useState(false)
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    const s = io(WS_URL, { path: '/ws', transports: ['websocket', 'polling'] })

    s.on('connect', () => {
      setConnected(true)
      s.emit('subscribe:live')
    })

    s.on('scores:update', (data: LiveScore[]) => {
      setScores(data)
    })

    s.on('disconnect', () => setConnected(false))

    setSocket(s)

    return () => {
      s.disconnect()
    }
  }, [])

  return { scores, connected, socket }
}

export function useMatchSocket(fixtureId: number) {
  const [score, setScore] = useState<LiveScore | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!fixtureId) return

    const s = io(WS_URL, { path: '/ws', transports: ['websocket', 'polling'] })

    s.on('connect', () => {
      setConnected(true)
      s.emit('subscribe:match', fixtureId)
    })

    s.on(`match:${fixtureId}:update`, (data: LiveScore) => {
      setScore(data)
    })

    s.on('disconnect', () => setConnected(false))

    return () => {
      s.emit('unsubscribe:match', fixtureId)
      s.disconnect()
    }
  }, [fixtureId])

  return { score, connected }
}
