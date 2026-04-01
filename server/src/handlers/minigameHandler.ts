import type { Server, Socket } from 'socket.io'
import type { ClientToServerEvents, ServerToClientEvents } from '../types/socket.types'
import type { IGameState } from '../types/game.types'
import { roomManager } from '../game/RoomManager'
import { minigameCoordinator } from '../minigames/MinigameCoordinator'

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>

/**
 * Démarre la session mini-jeu. Appelé depuis actionHandler via require() lazy.
 */
export function startMinigame(io: IOServer, roomCode: string, state: IGameState): void {
  minigameCoordinator.start(io, roomCode, state)
}

export function registerMinigameHandlers(io: IOServer, socket: IOSocket): void {

  socket.on('submit-minigame-result', ({ roomCode, playerId, score }) => {
    try {
      const state = roomManager.getRoom(roomCode)
      if (!state) return
      if (state.phase !== 'minigame') {
        // Ignoré silencieusement — résultats après timeout
        return
      }

      // Valider que le joueur appartient à la room
      const player = state.players.find(p => p.id === playerId || p.id === socket.id)
      if (!player) return

      // Utiliser socket.id comme source de vérité (pas playerId envoyé par le client)
      minigameCoordinator.submitResult(roomCode, socket.id, score)

      // Vérifier si tous ont répondu → finaliser
      minigameCoordinator.tryFinalize(io, roomCode)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      socket.emit('error', { code: 'MINIGAME_SUBMIT_FAILED', message: msg })
    }
  })
}
