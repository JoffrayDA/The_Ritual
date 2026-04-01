import type { IGameState, IPlayer, MinigameName } from '../types/game.types'
import { BOARD_NODES } from './board.data'

export function createGameState(roomCode: string, hostId: string, hostName: string): IGameState {
  return {
    roomCode,
    phase: 'lobby',
    players: [],
    currentPlayerIndex: 0,
    round: 0,
    maxRounds: 12,
    board: BOARD_NODES,
    activeMinigame: undefined,
    actionResolved: false,
    hostId,
  }
}

export function addPlayer(state: IGameState, player: IPlayer): IGameState {
  return { ...state, players: [...state.players, player] }
}

export function updatePlayer(state: IGameState, playerId: string, updates: Partial<IPlayer>): IGameState {
  return {
    ...state,
    players: state.players.map(p => p.id === playerId ? { ...p, ...updates } : p),
  }
}

export function updatePlayerMoney(state: IGameState, playerId: string, delta: number): IGameState {
  return updatePlayer(state, playerId, {
    money: Math.max(0, (state.players.find(p => p.id === playerId)?.money ?? 0) + delta),
  })
}

export function updatePlayerPintes(state: IGameState, playerId: string, delta: number): IGameState {
  const current = state.players.find(p => p.id === playerId)?.pintes ?? 0
  return updatePlayer(state, playerId, { pintes: Math.max(0, current + delta) })
}

export function setPhase(state: IGameState, phase: IGameState['phase']): IGameState {
  return { ...state, phase }
}

export function setActiveMinigame(state: IGameState, name: MinigameName | undefined): IGameState {
  return { ...state, activeMinigame: name }
}

export function setActionResolved(state: IGameState, resolved: boolean): IGameState {
  return { ...state, actionResolved: resolved }
}

export function advanceTurn(state: IGameState): IGameState {
  const totalPlayers = state.players.filter(p => p.isConnected).length || state.players.length
  const nextIndex = (state.currentPlayerIndex + 1) % state.players.length
  const isEndOfRound = nextIndex === 0 || (state.currentPlayerIndex + 1) >= totalPlayers

  if (isEndOfRound) {
    const newRound = state.round + 1
    if (newRound > state.maxRounds) {
      return { ...state, currentPlayerIndex: 0, round: newRound, phase: 'game-over', actionResolved: false }
    }
    return { ...state, currentPlayerIndex: 0, round: newRound, phase: 'minigame', actionResolved: false }
  }

  return { ...state, currentPlayerIndex: nextIndex, actionResolved: false }
}

export function movePlayer(state: IGameState, playerId: string, newNodeId: number): IGameState {
  const player = state.players.find(p => p.id === playerId)
  if (!player) return state
  return updatePlayer(state, playerId, {
    prevNodeId: player.position,
    position: newNodeId,
  })
}
