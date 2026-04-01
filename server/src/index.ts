import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import type { ClientToServerEvents, ServerToClientEvents } from './types/socket.types'
import { registerRoomHandlers } from './handlers/roomHandler'
import { registerGameHandlers } from './handlers/gameHandler'
import { registerActionHandlers } from './handlers/actionHandler'
import { registerMinigameHandlers } from './handlers/minigameHandler'
import { roomManager } from './game/RoomManager'

const app = express()
const httpServer = http.createServer(app)

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001

// En dev : accepter toutes les origines locales
const allowedOrigins = [CLIENT_URL, 'http://localhost:5173', /^http:\/\/192\.168\.\d+\.\d+:5173$/]

app.use(cors({ origin: allowedOrigins }))
app.use(express.json())

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', rooms: roomManager.getActiveRoomsCount() })
})

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  registerRoomHandlers(io, socket)
  registerGameHandlers(io, socket)
  registerActionHandlers(io, socket)
  registerMinigameHandlers(io, socket)

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
  })
})

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Accepting connections from: ${CLIENT_URL}`)
})
