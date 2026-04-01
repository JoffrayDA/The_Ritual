import type { Server, Socket } from 'socket.io'
import type { ClientToServerEvents, ServerToClientEvents } from '../types/socket.types'
import type { IGameState } from '../types/game.types'
import { roomManager } from '../game/RoomManager'
import { stateMachine } from '../game/StateMachine'
import { advanceTurn, setActionResolved, updatePlayerMoney, updatePlayerPintes } from '../game/GameState'
import { broadcast } from '../utils/broadcast'
import { turnTimer } from '../utils/timer'

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>

/**
 * Avancer le tour et déclencher le mini-jeu si fin de round.
 * Importé de manière lazy pour éviter la dépendance circulaire avec minigameHandler.
 */
function advanceAndMaybeMinigame(io: IOServer, roomCode: string): void {
  const state = roomManager.getRoom(roomCode)
  if (!state) return

  const next = advanceTurn(state)
  roomManager.setRoom(roomCode, next)
  broadcast(io, roomCode, next)

  if (next.phase === 'game-over') return

  if (next.phase === 'minigame') {
    const minigameState = stateMachine.startMinigamePhase(next)
    roomManager.setRoom(roomCode, minigameState)
    broadcast(io, roomCode, minigameState)

    // Import lazy pour éviter la dépendance circulaire
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { startMinigame } = require('./minigameHandler') as { startMinigame: (io: IOServer, roomCode: string, state: IGameState) => void }
    startMinigame(io, roomCode, minigameState)
    return
  }

  // Phase 'playing' → démarrer le timer du prochain tour
  turnTimer.start(roomCode, () => {
    const current = roomManager.getRoom(roomCode)
    if (!current || current.phase !== 'playing') return
    const skipped = advanceTurn(current)
    roomManager.setRoom(roomCode, skipped)
    broadcast(io, roomCode, skipped)
  })
}

/**
 * Appelé par movement-complete handler.
 * Déclenche la résolution de la case sur laquelle le joueur atterrit.
 */
export function resolveCase(io: IOServer, socket: IOSocket, roomCode: string, state: IGameState): void {
  const player = state.players.find(p => p.id === socket.id)
  if (!player) return

  // Marquer actionResolved pour éviter les doubles
  const newState = setActionResolved(state, true)
  roomManager.setRoom(roomCode, newState)

  const node = state.board[player.position]

  switch (node.type) {
    case 'start':
    case 'red': {
      io.to(roomCode).emit('case-resolved', { type: 'red', playerId: socket.id })
      broadcast(io, roomCode, newState)
      setTimeout(() => advanceAndMaybeMinigame(io, roomCode), 3000)
      break
    }

    case 'blue': {
      // Le joueur courant choisit une cible
      socket.emit('choose-target', { sourcePlayerId: socket.id })
      broadcast(io, roomCode, newState)
      break
    }

    case 'white': {
      socket.emit('choose-white-action', { playerId: socket.id })
      broadcast(io, roomCode, newState)
      break
    }

    case 'black': {
      socket.emit('choose-black-action', { playerId: socket.id })
      broadcast(io, roomCode, newState)
      break
    }

    case 'duel': {
      const others = state.players.filter(p => p.id !== socket.id && p.isConnected)
      if (others.length === 0) {
        advanceAndMaybeMinigame(io, roomCode)
        break
      }
      const target = others[Math.floor(Math.random() * others.length)]
      io.to(roomCode).emit('duel-target-selected', { targetPlayerId: target.id })
      broadcast(io, roomCode, newState)
      setTimeout(() => advanceAndMaybeMinigame(io, roomCode), 5000)
      break
    }

    case 'shop': {
      socket.emit('shop-opened', { playerId: socket.id })
      broadcast(io, roomCode, newState)
      // Avancer après 30s si l'utilisateur ne fait rien
      setTimeout(() => {
        const current = roomManager.getRoom(roomCode)
        if (!current || !current.actionResolved) {
          // On ne readvance pas si c'est déjà passé
        }
        // Shop: le joueur peut acheter ou fermer, avancer dans tous les cas
        advanceAndMaybeMinigame(io, roomCode)
      }, 30000)
      break
    }

    default: {
      broadcast(io, roomCode, newState)
      advanceAndMaybeMinigame(io, roomCode)
    }
  }
}

export function registerActionHandlers(io: IOServer, socket: IOSocket): void {

  socket.on('movement-complete', ({ roomCode }) => {
    try {
      const state = roomManager.getRoom(roomCode)
      if (!state) return
      if (state.phase !== 'playing') return
      if (state.actionResolved) return // doublon ignoré

      resolveCase(io, socket, roomCode, state)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      socket.emit('error', { code: 'MOVEMENT_FAILED', message: msg })
    }
  })

  socket.on('target-chosen', ({ roomCode, targetPlayerId }) => {
    try {
      const state = roomManager.getRoom(roomCode)
      if (!state) return

      io.to(roomCode).emit('case-resolved', { type: 'blue', playerId: socket.id, targetPlayerId })
      broadcast(io, roomCode, state)
      setTimeout(() => advanceAndMaybeMinigame(io, roomCode), 3000)
    } catch {
      socket.emit('error', { code: 'TARGET_FAILED', message: 'Erreur cible' })
    }
  })

  socket.on('white-action-chosen', ({ roomCode, choice }) => {
    try {
      let state = roomManager.getRoom(roomCode)
      if (!state) return

      if (choice === 'money') {
        state = updatePlayerMoney(state, socket.id, +15)
        roomManager.setRoom(roomCode, state)
      }
      broadcast(io, roomCode, state)
      setTimeout(() => advanceAndMaybeMinigame(io, roomCode), 1000)
    } catch {
      socket.emit('error', { code: 'WHITE_ACTION_FAILED', message: 'Erreur case blanche' })
    }
  })

  socket.on('black-action-chosen', ({ roomCode, choice }) => {
    try {
      let state = roomManager.getRoom(roomCode)
      if (!state) return

      if (choice === 'money') {
        state = updatePlayerMoney(state, socket.id, -15)
        roomManager.setRoom(roomCode, state)
      }
      broadcast(io, roomCode, state)
      setTimeout(() => advanceAndMaybeMinigame(io, roomCode), 1000)
    } catch {
      socket.emit('error', { code: 'BLACK_ACTION_FAILED', message: 'Erreur case noire' })
    }
  })

  socket.on('buy-pinte', ({ roomCode }) => {
    try {
      let state = roomManager.getRoom(roomCode)
      if (!state) return

      const player = state.players.find(p => p.id === socket.id)
      if (!player) return

      if (player.money < 100) {
        socket.emit('error', { code: 'NOT_ENOUGH_MONEY', message: 'Pas assez de monnaie (100 🪙 requis)' })
        return
      }

      state = updatePlayerMoney(state, socket.id, -100)
      state = updatePlayerPintes(state, socket.id, 1)
      roomManager.setRoom(roomCode, state)
      broadcast(io, roomCode, state)
    } catch {
      socket.emit('error', { code: 'BUY_PINTE_FAILED', message: 'Erreur achat Pinte' })
    }
  })
}
