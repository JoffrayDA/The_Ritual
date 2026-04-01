import type { IGameState, IPlayer } from '../types/game.types'
import { createGameState } from './GameState'
import { generateRoomCode } from '../utils/roomCode'

class RoomManager {
  private rooms = new Map<string, IGameState>()
  private cleanupTimers = new Map<string, ReturnType<typeof setTimeout>>()

  createRoom(hostId: string, hostName: string): { roomCode: string; gameState: IGameState } {
    const roomCode = generateRoomCode(new Set(this.rooms.keys()))
    const gameState = createGameState(roomCode, hostId, hostName)
    this.rooms.set(roomCode, gameState)
    return { roomCode, gameState }
  }

  getRoom(roomCode: string): IGameState | undefined {
    return this.rooms.get(roomCode)
  }

  setRoom(roomCode: string, state: IGameState): void {
    this.rooms.set(roomCode, state)
  }

  roomExists(roomCode: string): boolean {
    return this.rooms.has(roomCode)
  }

  deleteRoom(roomCode: string): void {
    this.rooms.delete(roomCode)
    const timer = this.cleanupTimers.get(roomCode)
    if (timer) {
      clearTimeout(timer)
      this.cleanupTimers.delete(roomCode)
    }
  }

  scheduleCleanup(roomCode: string, delayMs = 5 * 60 * 1000): void {
    const existing = this.cleanupTimers.get(roomCode)
    if (existing) clearTimeout(existing)
    const timer = setTimeout(() => this.deleteRoom(roomCode), delayMs)
    this.cleanupTimers.set(roomCode, timer)
  }

  cancelCleanup(roomCode: string): void {
    const timer = this.cleanupTimers.get(roomCode)
    if (timer) {
      clearTimeout(timer)
      this.cleanupTimers.delete(roomCode)
    }
  }

  getActiveRoomsCount(): number {
    return this.rooms.size
  }

  findPlayerRoom(playerId: string): IGameState | undefined {
    for (const state of this.rooms.values()) {
      if (state.players.some(p => p.id === playerId)) return state
    }
    return undefined
  }
}

// Singleton
export const roomManager = new RoomManager()
