import type { IGameState, MinigameName } from './game.types'

// Client → Server
export interface CreateRoomPayload {
  playerName: string
}

export interface JoinRoomPayload {
  roomCode: string
  playerName: string
}

export interface SelectAvatarPayload {
  roomCode: string
  avatar: string
}

export interface StartGamePayload {
  roomCode: string
}

export interface RollDicePayload {
  roomCode: string
}

export interface ChooseDirectionPayload {
  roomCode: string
  nodeId: number
}

export interface MovementCompletePayload {
  roomCode: string
}

export interface TargetChosenPayload {
  roomCode: string
  targetPlayerId: string
}

export interface WhiteActionChosenPayload {
  roomCode: string
  choice: 'money' | 'drink'
}

export interface BlackActionChosenPayload {
  roomCode: string
  choice: 'money' | 'drink'
}

export interface SubmitMinigameResultPayload {
  roomCode: string
  playerId: string
  score: number
}

export interface ReconnectToRoomPayload {
  roomCode: string
  playerName: string
}

export interface BuyPintePayload {
  roomCode: string
}

export interface LeaveRoomPayload {
  roomCode: string
}

// Server → Client
export interface GameStateUpdatedPayload {
  gameState: IGameState
}

export interface ErrorPayload {
  code: string
  message: string
}

export interface DiceRolledPayload {
  result: number
  targetNodeId: number
}

export interface ChooseDirectionEventPayload {
  options: number[]
}

export interface DuelTargetSelectedPayload {
  targetPlayerId: string
}

export interface CaseResolvedPayload {
  type: string
  playerId: string
  targetPlayerId?: string
}

export interface MinigameStartedPayload {
  name: MinigameName
  duration: number
  seed?: string
}

export interface MinigameResultsPayload {
  results: Array<{ playerId: string; score: number; rank: number }>
  winnerId: string
  moneyAwarded: number
}

export interface ShopOpenedPayload {
  playerId: string
}
