import type { Server, Socket } from 'socket.io'
import type { ClientToServerEvents, ServerToClientEvents } from '../types/socket.types'
import type { IPlayer } from '../types/game.types'
import { roomManager } from '../game/RoomManager'
import { addPlayer, updatePlayer, setPhase, advanceTurn } from '../game/GameState'
import { turnTimer } from '../utils/timer'
import { broadcast } from '../utils/broadcast'

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>

export function registerRoomHandlers(io: IOServer, socket: IOSocket): void {

  socket.on('create-room', ({ playerName }) => {
    try {
      // Créer la room + le joueur hôte
      const { roomCode, gameState } = roomManager.createRoom(socket.id, playerName)

      const host: IPlayer = {
        id: socket.id,
        name: playerName,
        avatar: '',
        position: 0,
        prevNodeId: null,
        money: 0,
        pintes: 0,
        isConnected: true,
      }

      const updatedState = addPlayer(gameState, host)
      roomManager.setRoom(roomCode, updatedState)

      // OBLIGATOIRE : rejoindre la room Socket.io
      socket.join(roomCode)

      socket.emit('game-state-updated', { gameState: updatedState })
      console.log(`Room ${roomCode} créée par ${playerName} (${socket.id})`)
    } catch (err) {
      socket.emit('error', { code: 'CREATE_ROOM_FAILED', message: 'Impossible de créer la salle' })
    }
  })

  socket.on('join-room', ({ roomCode, playerName }) => {
    try {
      const state = roomManager.getRoom(roomCode)
      if (!state) {
        socket.emit('fatal-error', { message: `La salle "${roomCode}" n'existe pas` })
        return
      }
      if (state.phase !== 'lobby') {
        socket.emit('error', { code: 'GAME_STARTED', message: 'La partie a déjà commencé' })
        return
      }
      if (state.players.length >= 8) {
        socket.emit('error', { code: 'ROOM_FULL', message: 'La salle est pleine (max 8 joueurs)' })
        return
      }
      // Vérification de duplication de nom (prévention collision reconnexion)
      if (state.players.some(p => p.name === playerName)) {
        socket.emit('error', { code: 'NAME_TAKEN', message: `Le nom "${playerName}" est déjà pris dans cette salle` })
        return
      }

      const newPlayer: IPlayer = {
        id: socket.id,
        name: playerName,
        avatar: '',
        position: 0,
        prevNodeId: null,
        money: 0,
        pintes: 0,
        isConnected: true,
      }

      const updatedState = addPlayer(state, newPlayer)
      roomManager.setRoom(roomCode, updatedState)

      // OBLIGATOIRE : rejoindre la room Socket.io
      socket.join(roomCode)

      broadcast(io, roomCode, updatedState)
      console.log(`${playerName} a rejoint la room ${roomCode}`)
    } catch (err) {
      socket.emit('error', { code: 'JOIN_FAILED', message: 'Impossible de rejoindre la salle' })
    }
  })

  socket.on('select-avatar', ({ roomCode, avatar }) => {
    try {
      const state = roomManager.getRoom(roomCode)
      if (!state) return

      const updatedState = updatePlayer(state, socket.id, { avatar })
      roomManager.setRoom(roomCode, updatedState)
      broadcast(io, roomCode, updatedState)
    } catch (err) {
      socket.emit('error', { code: 'AVATAR_FAILED', message: 'Impossible de sélectionner l\'avatar' })
    }
  })

  socket.on('start-game', ({ roomCode }) => {
    try {
      const state = roomManager.getRoom(roomCode)
      if (!state) return
      if (state.hostId !== socket.id) {
        socket.emit('error', { code: 'NOT_HOST', message: 'Seul l\'hôte peut lancer la partie' })
        return
      }
      if (state.players.length < 2) {
        socket.emit('error', { code: 'NOT_ENOUGH_PLAYERS', message: 'Il faut au moins 2 joueurs' })
        return
      }

      const updatedState = setPhase({ ...state, round: 1 }, 'playing')
      roomManager.setRoom(roomCode, updatedState)
      broadcast(io, roomCode, updatedState)

      // Démarrer le timer du premier tour
      turnTimer.start(roomCode, () => {
        const currentState = roomManager.getRoom(roomCode)
        if (!currentState || currentState.phase !== 'playing') return
        // Passer le tour automatiquement
        const nextState = advanceTurn(currentState)
        roomManager.setRoom(roomCode, nextState)
        broadcast(io, roomCode, nextState)
      })
    } catch (err) {
      socket.emit('error', { code: 'START_FAILED', message: 'Impossible de lancer la partie' })
    }
  })

  socket.on('reconnect-to-room', ({ roomCode, playerName }) => {
    try {
      const state = roomManager.getRoom(roomCode)
      if (!state) {
        socket.emit('fatal-error', { message: `La salle "${roomCode}" n'existe pas` })
        return
      }

      // Trouver le joueur déconnecté par nom
      const disconnectedPlayers = state.players.filter(p => p.name === playerName && !p.isConnected)
      if (disconnectedPlayers.length === 0) {
        socket.emit('error', { code: 'PLAYER_NOT_FOUND', message: 'Joueur introuvable ou déjà connecté' })
        return
      }
      if (disconnectedPlayers.length > 1) {
        socket.emit('error', { code: 'NAME_CONFLICT', message: 'Deux joueurs ont le même nom, reconnexion impossible' })
        return
      }

      const player = disconnectedPlayers[0]
      const oldId = player.id

      // Réassocier socketId
      let updatedState = updatePlayer(state, oldId, { id: socket.id, isConnected: true })
      // Mettre à jour hostId si c'était l'hôte
      if (updatedState.hostId === oldId) {
        updatedState = { ...updatedState, hostId: socket.id }
      }

      roomManager.setRoom(roomCode, updatedState)
      socket.join(roomCode)
      roomManager.cancelCleanup(roomCode)

      socket.emit('game-state-updated', { gameState: updatedState })
      broadcast(io, roomCode, updatedState)
    } catch (err) {
      socket.emit('error', { code: 'RECONNECT_FAILED', message: 'Reconnexion échouée' })
    }
  })

  socket.on('leave-room', ({ roomCode }) => {
    const state = roomManager.getRoom(roomCode)
    if (!state) return
    const connectedPlayers = state.players.filter(p => p.isConnected && p.id !== socket.id)
    if (connectedPlayers.length === 0) {
      roomManager.deleteRoom(roomCode)
    }
    socket.leave(roomCode)
  })

  socket.on('disconnect', () => {
    // Trouver toutes les rooms de ce socket et marquer le joueur déconnecté
    for (const [roomCode, state] of (roomManager as any).rooms as Map<string, import('../types/game.types').IGameState>) {
      const player = state.players.find((p: IPlayer) => p.id === socket.id)
      if (!player) continue

      const updatedState = updatePlayer(state, socket.id, { isConnected: false })
      roomManager.setRoom(roomCode, updatedState)

      // Si c'était l'hôte en lobby → notifier
      if (state.hostId === socket.id && state.phase === 'lobby') {
        io.to(roomCode).emit('host-disconnected', { message: 'L\'hôte a quitté. La salle sera fermée dans 60s.' })
        roomManager.scheduleCleanup(roomCode, 60000)
      }

      broadcast(io, roomCode, updatedState)
    }
  })
}
