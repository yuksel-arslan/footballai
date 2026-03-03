import { Server as HTTPServer } from 'http'
import { Server as SocketServer } from 'socket.io'
import { logger } from '../lib/logger'

export function setupWebSocket(httpServer: HTTPServer) {
  const io = new SocketServer(httpServer, {
    cors: { origin: '*' },
    path: '/ws',
  })

  io.on('connection', (socket) => {
    logger.info({ socketId: socket.id }, 'Client connected')

    socket.on('subscribe:match', (fixtureId: number) => {
      socket.join(`match:${fixtureId}`)
    })

    socket.on('unsubscribe:match', (fixtureId: number) => {
      socket.leave(`match:${fixtureId}`)
    })

    socket.on('subscribe:live', () => {
      socket.join('live-scores')
    })

    socket.on('unsubscribe:live', () => {
      socket.leave('live-scores')
    })

    socket.on('disconnect', () => {
      logger.info({ socketId: socket.id }, 'Client disconnected')
    })
  })

  // Periodically broadcast live scores (every 30 seconds)
  setInterval(async () => {
    try {
      const room = io.sockets.adapter.rooms.get('live-scores')
      if (!room || room.size === 0) return

      // TODO: Fetch live scores from API-Football
      // const liveScores = await fetchLiveScores()
      // io.to('live-scores').emit('scores:update', liveScores)
    } catch (error) {
      logger.error({ error }, 'Live score update failed')
    }
  }, 30000)

  return io
}
