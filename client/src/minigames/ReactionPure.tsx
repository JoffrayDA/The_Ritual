import { useEffect, useRef, useState } from 'react'
import type { MinigameComponentProps } from './MinigameRouter'
import type { IMinigameResult } from '../types/minigame.types'

type Phase = 'waiting' | 'ready' | 'flash' | 'done'

const FLASH_COLORS = ['#FF4444', '#4488FF', '#44FF88', '#FFD700', '#FF44FF']

export default function ReactionPure({ players, myPlayerId, duration, onComplete }: MinigameComponentProps) {
  const [phase, setPhase] = useState<Phase>('waiting')
  const [flashColor, setFlashColor] = useState('#FF4444')
  const [myTime, setMyTime] = useState<number | null>(null)
  const flashTimeRef = useRef<number>(0)
  const doneRef = useRef(false)
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    // Compte à rebours 3s
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          startGame()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  function startGame() {
    setPhase('ready')
    const delay = 1000 + Math.random() * 3000
    const color = FLASH_COLORS[Math.floor(Math.random() * FLASH_COLORS.length)]
    setTimeout(() => {
      setFlashColor(color)
      setPhase('flash')
      flashTimeRef.current = Date.now()

      // Timeout si personne ne tape
      setTimeout(() => {
        if (!doneRef.current) {
          doneRef.current = true
          setPhase('done')
          const results: IMinigameResult[] = players.map(p => ({ playerId: p.id, score: 0 }))
          onComplete(results)
        }
      }, duration)
    }, delay)
  }

  function handleTap() {
    if (phase === 'flash' && !doneRef.current) {
      doneRef.current = true
      const reactionTime = Date.now() - flashTimeRef.current
      setMyTime(reactionTime)
      setPhase('done')

      // Score inversé : moins = mieux. On envoie 10000 - reactionTime comme score
      const score = Math.max(0, 10000 - reactionTime)
      const results: IMinigameResult[] = players.map(p => ({
        playerId: p.id,
        score: p.id === myPlayerId ? score : 0,
      }))
      onComplete(results)
    } else if (phase === 'ready') {
      // Trop tôt
      setPhase('done')
      doneRef.current = true
      const results: IMinigameResult[] = players.map(p => ({ playerId: p.id, score: 0 }))
      onComplete(results)
    }
  }

  if (phase === 'waiting') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 bg-gray-950">
        <p className="text-white font-bold text-2xl">Réaction Pure ⚡</p>
        <p className="text-white/60 text-sm text-center px-8">Attends le flash... puis tape !</p>
        <p className="text-yellow-400 text-5xl font-bold">{countdown}</p>
      </div>
    )
  }

  if (phase === 'ready') {
    return (
      <div
        className="flex flex-col items-center justify-center h-full bg-gray-950 cursor-pointer select-none"
        onClick={handleTap}
      >
        <p className="text-white/40 text-xl">Prêt...</p>
        <p className="text-white/20 text-sm mt-4">Ne tape pas encore !</p>
      </div>
    )
  }

  if (phase === 'flash') {
    return (
      <div
        className="flex flex-col items-center justify-center h-full cursor-pointer select-none"
        style={{ backgroundColor: flashColor }}
        onClick={handleTap}
      >
        <p className="text-white font-black text-4xl drop-shadow-lg">TAP !</p>
      </div>
    )
  }

  // Done
  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-950 gap-4">
      <p className="text-4xl">{myTime !== null && myTime < 5000 ? '⚡' : '😴'}</p>
      {myTime !== null ? (
        <>
          <p className="text-white font-bold text-2xl">{myTime} ms</p>
          <p className="text-white/60 text-sm">Ton temps de réaction</p>
        </>
      ) : (
        <p className="text-red-400 font-bold text-xl">Trop tôt !</p>
      )}
      <p className="text-white/40 text-sm">En attente des autres…</p>
    </div>
  )
}
