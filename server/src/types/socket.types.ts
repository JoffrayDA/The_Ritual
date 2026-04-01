import type { MinigameName } from './game.types'

// Client → Server events
export interface ClientToServerEvents {
  'create-room': (payload: { playerName: string }) => void
  'join-room': (payload: { roomCode: string; playerName: string }) => void
  'select-avatar': (payload: { roomCode: string; avatar: string }) => void
  'start-game': (payload: { roomCode: string }) => void
  'roll-dice': (payload: { roomCode: string }) => void
  'choose-direction': (payload: { roomCode: string; nodeId: number }) => void
  'movement-complete': (payload: { roomCode: string }) => void
  'target-chosen': (payload: { roomCode: string; targetPlayerId: string }) => void
  'white-action-chosen': (payload: { roomCode: string; choice: 'money' | 'drink' }) => void
  'black-action-chosen': (payload: { roomCode: string; choice: 'money' | 'drink' }) => void
  'submit-minigame-result': (payload: { roomCode: string; playerId: string; score: number }) => void
  'reconnect-to-room': (payload: { roomCode: string; playerName: string }) => void
  'buy-pinte': (payload: { roomCode: string }) => void
  'leave-room': (payload: { roomCode: string }) => void
}

// Server → Client events
export interface ServerToClientEvents {
  'game-state-updated': (payload: { gameState: import('./game.types').IGameState }) => void
  'error': (payload: { code: string; message: string }) => void
  'fatal-error': (payload: { message: string }) => void
  'dice-rolled': (payload: { result: number; targetNodeId: number }) => void
  'choose-direction': (payload: { options: number[] }) => void
  'case-resolved': (payload: { type: string; playerId: string; targetPlayerId?: string }) => void
  'duel-target-selected': (payload: { targetPlayerId: string }) => void
  'choose-target': (payload: { sourcePlayerId: string }) => void
  'choose-white-action': (payload: { playerId: string }) => void
  'choose-black-action': (payload: { playerId: string }) => void
  'shop-opened': (payload: { playerId: string }) => void
  'minigame-started': (payload: { name: MinigameName; duration: number; seed?: string }) => void
  'minigame-results': (payload: { results: Array<{ playerId: string; score: number; rank: number }>; winnerId: string; moneyAwarded: number }) => void
  'host-disconnected': (payload: { message: string }) => void
}
