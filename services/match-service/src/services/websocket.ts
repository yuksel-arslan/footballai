import { Server as HTTPServer } from 'http'
import { Server as SocketServer } from 'socket.io'

export function setupWebSocket(httpServer: HTTPServer) {
  const io = new SocketServer(httpServer, {
    cors: { origin: '*' },
    path: '/ws',
  })

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`)

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
      console.log(`Client disconnected: ${socket.id}`)
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
      console.error('Live score update failed:', error)
    }
  }, 30000)

  return io
}
