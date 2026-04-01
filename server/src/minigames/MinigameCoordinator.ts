import type { Server } from 'socket.io'
import type { ClientToServerEvents, ServerToClientEvents } from '../types/socket.types'
import type { IGameState, MinigameName } from '../types/game.types'
import { roomManager } from '../game/RoomManager'
import { stateMachine } from '../game/StateMachine'
import { updatePlayerMoney } from '../game/GameState'
import { broadcast } from '../utils/broadcast'

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>

interface PlayerResult {
  playerId: string
  score: number
}

const MINIGAME_DURATION = 30000 // 30s

class MinigameCoordinator {
  private sessions = new Map<string, {
    name: MinigameName
    results: Map<string, number>
    timeout: ReturnType<typeof setTimeout>
    startTime: number
  }>()

  start(io: IOServer, roomCode: string, state: IGameState): void {
    // Annuler session existante si présente
    this.cancel(roomCode)

    const name = state.activeMinigame!
    const results = new Map<string, number>()

    const timeout = setTimeout(() => {
      this.finalize(io, roomCode, name, results, state.players.map(p => p.id))
    }, MINIGAME_DURATION)

    this.sessions.set(roomCode, {
      name,
      results,
      timeout,
      startTime: Date.now(),
    })

    // Générer une seed pour les mini-jeux qui en ont besoin (Labyrinthe)
    const seed = Math.random().toString(36).slice(2, 10)

    io.to(roomCode).emit('minigame-started', {
      name,
      duration: MINIGAME_DURATION,
      seed,
    })
  }

  submitResult(roomCode: string, playerId: string, score: number): void {
    const session = this.sessions.get(roomCode)
    if (!session) return
    // Ignorer les doublons
    if (session.results.has(playerId)) return
    session.results.set(playerId, score)
  }

  hasAllResults(roomCode: string, expectedCount: number): boolean {
    const session = this.sessions.get(roomCode)
    if (!session) return false
    return session.results.size >= expectedCount
  }

  tryFinalize(io: IOServer, roomCode: string): void {
    const state = roomManager.getRoom(roomCode)
    if (!state) return
    const session = this.sessions.get(roomCode)
    if (!session) return

    const connectedPlayers = state.players.filter(p => p.isConnected)
    if (this.hasAllResults(roomCode, connectedPlayers.length)) {
      clearTimeout(session.timeout)
      this.finalize(io, roomCode, session.name, session.results, state.players.map(p => p.id))
    }
  }

  private finalize(
    io: IOServer,
    roomCode: string,
    _name: MinigameName,
    results: Map<string, number>,
    allPlayerIds: string[],
  ): void {
    this.sessions.delete(roomCode)

    const state = roomManager.getRoom(roomCode)
    if (!state) return

    // Joueurs sans résultat → score 0 (classés derniers)
    allPlayerIds.forEach(id => {
      if (!results.has(id)) results.set(id, 0)
    })

    const playerResults: PlayerResult[] = Array.from(results.entries())
      .map(([playerId, score]) => ({ playerId, score }))
      .sort((a, b) => b.score - a.score)

    const rankedResults = playerResults.map((r, i) => ({ ...r, rank: i + 1 }))
    const winnerId = rankedResults[0]?.playerId || ''
    const MONEY_AWARD = 30

    // Donner la monnaie au gagnant
    let newState = state
    if (winnerId) {
      newState = updatePlayerMoney(state, winnerId, MONEY_AWARD)
    }

    // Avancer le tour
    newState = stateMachine.finalizeMinigamePhase(newState)
    roomManager.setRoom(roomCode, newState)

    // Broadcast résultats
    io.to(roomCode).emit('minigame-results', {
      results: rankedResults,
      winnerId,
      moneyAwarded: MONEY_AWARD,
    })

    // Puis état mis à jour
    setTimeout(() => {
      broadcast(io, roomCode, newState)
    }, 3500) // laisser les clients afficher les résultats
  }

  cancel(roomCode: string): void {
    const session = this.sessions.get(roomCode)
    if (session) {
      clearTimeout(session.timeout)
      this.sessions.delete(roomCode)
    }
  }
}

export const minigameCoordinator = new MinigameCoordinator()
