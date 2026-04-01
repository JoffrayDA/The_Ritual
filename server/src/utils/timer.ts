type TimerCallback = () => void

class TurnTimer {
  private timers = new Map<string, ReturnType<typeof setTimeout>>()

  start(roomCode: string, callback: TimerCallback, delayMs = 60000): void {
    this.cancel(roomCode)
    const timer = setTimeout(() => {
      this.timers.delete(roomCode)
      callback()
    }, delayMs)
    this.timers.set(roomCode, timer)
  }

  cancel(roomCode: string): void {
    const timer = this.timers.get(roomCode)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(roomCode)
    }
  }

  isRunning(roomCode: string): boolean {
    return this.timers.has(roomCode)
  }
}

export const turnTimer = new TurnTimer()
