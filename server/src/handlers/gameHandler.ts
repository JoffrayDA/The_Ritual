import type { Server, Socket } from 'socket.io'
import type { ClientToServerEvents, ServerToClientEvents } from '../types/socket.types'
import { roomManager } from '../game/RoomManager'
import { stateMachine } from '../game/StateMachine'
import { turnTimer } from '../utils/timer'
import { broadcast } from '../utils/broadcast'

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>

export function registerGameHandlers(io: IOServer, socket: IOSocket): void {

  socket.on('roll-dice', ({ roomCode }) => {
    try {
      const state = roomManager.getRoom(roomCode)
      if (!state) { socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Salle introuvable' }); return }
      if (state.phase !== 'playing') { socket.emit('error', { code: 'WRONG_PHASE', message: 'Ce n\'est pas le moment de lancer le dé' }); return }

      turnTimer.cancel(roomCode)

      const { newState, diceResult, targetNodeId, fork, forkOptions } = stateMachine.rollDice(state, socket.id)
      roomManager.setRoom(roomCode, newState)
      broadcast(io, roomCode, newState)

      if (fork) {
        socket.emit('dice-rolled', { result: diceResult, targetNodeId })
        socket.emit('choose-direction', { options: forkOptions })
      } else {
        socket.emit('dice-rolled', { result: diceResult, targetNodeId })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      socket.emit('error', { code: 'ROLL_FAILED', message: msg })
    }
  })

  socket.on('choose-direction', ({ roomCode, nodeId }) => {
    try {
      const state = roomManager.getRoom(roomCode)
      if (!state) return

      const newState = stateMachine.applyDirectionChoice(state, socket.id, nodeId)
      roomManager.setRoom(roomCode, newState)
      broadcast(io, roomCode, newState)
      socket.emit('dice-rolled', { result: 0, targetNodeId: nodeId })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      socket.emit('error', { code: 'DIRECTION_FAILED', message: msg })
    }
  })
}
