export interface IPlayer {
  id: string
  name: string
  avatar: string
  position: number
  prevNodeId: number | null
  money: number
  pintes: number
  isConnected: boolean
}

export interface IBoardNode {
  id: number
  type: 'start' | 'red' | 'blue' | 'white' | 'black' | 'duel' | 'shop'
  neighbors: number[]
  // Coordonnées normalisées 0.0–1.0 (multiplier par la taille canvas au render)
  x: number
  y: number
}

export interface IGameState {
  roomCode: string
  phase: 'lobby' | 'playing' | 'minigame' | 'results' | 'game-over'
  players: IPlayer[]
  currentPlayerIndex: number
  round: number
  maxRounds: number
  board: IBoardNode[]
  activeMinigame?: MinigameName
  actionResolved: boolean
  hostId: string
}

export type MinigameName =
  | 'sequence'
  | 'turbo-tap'
  | 'stop-chrono'
  | 'tir-de-gun'
  | 'reaction-pure'
  | 'cible-mouvante'
  | 'equilibre'
  | 'peinture-battle'
  | 'labyrinthe'
