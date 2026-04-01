import { useEffect, useState } from 'react'
import { socket, saveSession } from './useSocket'
import type { IGameState, IPlayer } from '../types/game.types'

// Cache module-level : persiste à travers les montages/démontages de composants
let _cachedState: IGameState | null = null

// Listener module-level : toujours actif, même entre deux routes
socket.on('game-state-updated', ({ gameState }: { gameState: IGameState }) => {
  _cachedState = gameState
  // Persister le roomCode pour la reconnexion
  const storedName = sessionStorage.getItem('tg_playerName')
  if (storedName && gameState.roomCode) {
    saveSession(gameState.roomCode, storedName)
  }
})

export function useGameState() {
  // Initialiser depuis le cache — évite l'écran vide après navigation
  const [gameState, setGameState] = useState<IGameState | null>(_cachedState)

  useEffect(() => {
    // Sync si le cache a été mis à jour pendant le démontage
    if (_cachedState && _cachedState !== gameState) {
      setGameState(_cachedState)
    }

    function onGameStateUpdated({ gameState: gs }: { gameState: IGameState }) {
      _cachedState = gs
      setGameState(gs)
    }

    socket.on('game-state-updated', onGameStateUpdated)
    return () => {
      socket.off('game-state-updated', onGameStateUpdated)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const myPlayer: IPlayer | null = gameState
    ? (gameState.players.find(p => p.id === socket.id) ?? null)
    : null

  const isMyTurn = gameState
    ? gameState.players[gameState.currentPlayerIndex]?.id === socket.id
    : false

  const isHost = gameState ? gameState.hostId === socket.id : false

  return { gameState, myPlayer, isMyTurn, isHost }
}
