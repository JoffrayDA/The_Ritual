import type { IGameState } from '../types/game.types'
import {
  movePlayer, setPhase, setActionResolved,
  advanceTurn as advanceTurnState, setActiveMinigame,
} from './GameState'
import type { MinigameName } from '../types/game.types'

const MINIGAME_POOL: MinigameName[] = [
  'sequence', 'turbo-tap', 'stop-chrono', 'tir-de-gun',
  'reaction-pure', 'cible-mouvante', 'equilibre', 'peinture-battle', 'labyrinthe',
]

export class StateMachine {
  rollDice(
    gameState: IGameState,
    playerId: string,
  ): { newState: IGameState; diceResult: number; targetNodeId: number; fork: boolean; forkOptions: number[] } {
    const playerIndex = gameState.players.findIndex(p => p.id === playerId)
    if (playerIndex !== gameState.currentPlayerIndex) {
      throw new Error('NOT_YOUR_TURN')
    }
    if (gameState.phase !== 'playing') {
      throw new Error('WRONG_PHASE')
    }

    const player = gameState.players[playerIndex]
    const diceResult = Math.floor(Math.random() * 6) + 1

    // Calculer la nouvelle position en suivant le chemin
    let currentNodeId = player.position
    let prevNodeId = player.prevNodeId

    for (let step = 0; step < diceResult; step++) {
      const currentNode = gameState.board[currentNodeId]
      // Exclure le nœud précédent pour éviter le demi-tour (sauf si c'est le seul voisin)
      const forwardNeighbors = currentNode.neighbors.filter(n => n !== prevNodeId)
      const candidates = forwardNeighbors.length > 0 ? forwardNeighbors : currentNode.neighbors

      if (candidates.length > 1 && step === diceResult - 1) {
        // Fork sur la dernière case : demander au joueur de choisir
        return {
          newState: gameState,
          diceResult,
          targetNodeId: currentNodeId,
          fork: true,
          forkOptions: candidates,
        }
      }

      // Choisir aléatoirement si plusieurs options (fork en milieu de chemin)
      prevNodeId = currentNodeId
      currentNodeId = candidates[Math.floor(Math.random() * candidates.length)]
    }

    const newState = movePlayer(
      setActionResolved(gameState, false),
      playerId,
      currentNodeId,
    )

    return { newState, diceResult, targetNodeId: currentNodeId, fork: false, forkOptions: [] }
  }

  applyDirectionChoice(
    gameState: IGameState,
    playerId: string,
    nodeId: number,
  ): IGameState {
    const player = gameState.players.find(p => p.id === playerId)
    if (!player) throw new Error('PLAYER_NOT_FOUND')

    // Valider que le nœud est un voisin valide du nœud actuel (hors prevNodeId)
    const currentNode = gameState.board[player.position]
    const forwardNeighbors = currentNode.neighbors.filter(n => n !== player.prevNodeId)
    const valid = forwardNeighbors.length > 0 ? forwardNeighbors : currentNode.neighbors
    if (!valid.includes(nodeId)) throw new Error('INVALID_DIRECTION')

    return movePlayer(setActionResolved(gameState, false), playerId, nodeId)
  }

  selectNextMinigame(round: number): MinigameName {
    return MINIGAME_POOL[(round - 1) % MINIGAME_POOL.length]
  }

  startMinigamePhase(gameState: IGameState): IGameState {
    const minigameName = this.selectNextMinigame(gameState.round)
    return setActiveMinigame(setPhase(gameState, 'minigame'), minigameName)
  }

  finalizeMinigamePhase(gameState: IGameState): IGameState {
    const next = advanceTurnState(setPhase(gameState, 'playing'))
    return setActiveMinigame(next, undefined)
  }
}

export const stateMachine = new StateMachine()
