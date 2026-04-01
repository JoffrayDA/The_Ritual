import { useEffect, useRef, useState } from 'react'
import type { MinigameComponentProps } from './MinigameRouter'
import type { IMinigameResult } from '../types/minigame.types'

const GAME_DURATION = 10000 // 10s
const MAX_TAPS_PER_SEC = 20

export default function TurboTap({ players, myPlayerId, onComplete }: MinigameComponentProps) {
  const [taps, setTaps] = useState(0)
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION)
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [countdown, setCountdown] = useState(3)
  const tapsRef = useRef(0)
  const lastSecTaps = useRef(0)
  const lastSecTime = useRef(Date.now())
  const doneRef = useRef(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          setStarted(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!started || finished) return

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev - 100
        if (next <= 0) {
          clearInterval(interval)
          if (!doneRef.current) {
            doneRef.current = true
            setFinished(true)
            const score = tapsRef.current
            const results: IMinigameResult[] = players.map(p => ({
              playerId: p.id,
              score: p.id === myPlayerId ? score : 0,
            }))
            onComplete(results)
          }
          return 0
        }
        return next
      })
    }, 100)

    return () => clearInterval(interval)
  }, [started, finished, players, myPlayerId, onComplete])

  function handleTap() {
    if (!started || finished) return

    // Anti-cheat : max 20 taps/s
    const now = Date.now()
    if (now - lastSecTime.current >= 1000) {
      lastSecTaps.current = 0
      lastSecTime.current = now
    }
    if (lastSecTaps.current >= MAX_TAPS_PER_SEC) return
    lastSecTaps.current++

    tapsRef.current++
    setTaps(tapsRef.current)
  }

  const progress = taps / (MAX_TAPS_PER_SEC * 10) // indicateur relatif

  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-950 gap-4">
        <p className="text-white font-bold text-2xl">Turbo Tap 👆</p>
        <p className="text-white/60 text-sm text-center px-8">Tape le plus vite possible pendant 10s !</p>
        <p className="text-yellow-400 text-5xl font-bold">{countdown}</p>
      </div>
    )
  }

  if (finished) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-950 gap-4">
        <p className="text-4xl">🏁</p>
        <p className="text-white font-bold text-2xl">{taps} taps</p>
        <p className="text-white/40 text-sm">En attente des autres…</p>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col items-center justify-center h-full bg-gray-950 select-none cursor-pointer gap-6"
      onClick={handleTap}
    >
      {/* Timer */}
      <p className="text-yellow-400 font-bold text-3xl">{(timeLeft / 1000).toFixed(1)}s</p>

      {/* Zone de tap */}
      <div
        className="w-48 h-48 rounded-full bg-indigo-600 flex items-center justify-center shadow-2xl active:scale-95 transition-transform"
        style={{ transform: `scale(${1 + Math.min(taps * 0.001, 0.15)})` }}
      >
        <span className="text-6xl select-none">👆</span>
      </div>

      {/* Compteur */}
      <p className="text-white font-black text-4xl">{taps}</p>

      {/* Barre progression */}
      <div className="w-64 h-3 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 transition-all"
          style={{ width: `${Math.min(progress * 100, 100)}%` }}
        />
      </div>
    </div>
  )
}
