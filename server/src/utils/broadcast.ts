import type { Server } from 'socket.io'
import type { ClientToServerEvents, ServerToClientEvents } from '../types/socket.types'
import type { IGameState } from '../types/game.types'

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>

export function broadcast(io: IOServer, roomCode: string, state: IGameState): void {
  io.to(roomCode).emit('game-state-updated', { gameState: state })
}
