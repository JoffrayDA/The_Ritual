import type { IPlayer, MinigameName } from './game.types'

export interface IMinigameResult {
  playerId: string
  score: number
  rank?: number
}

export interface IMinigameProps {
  players: IPlayer[]
  myPlayerId: string
  onComplete: (results: IMinigameResult[]) => void
}

export type { MinigameName }
