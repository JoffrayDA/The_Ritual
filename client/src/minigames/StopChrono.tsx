import { useEffect, useRef, useState } from 'react'
import type { MinigameComponentProps } from './MinigameRouter'
import type { IMinigameResult } from '../types/minigame.types'

export default function StopChrono({ players, myPlayerId, onComplete }: MinigameComponentProps) {
  const [countdown, setCountdown] = useState(3)
  const [started, setStarted] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [stopped, setStopped] = useState(false)
  const [target] = useState(() => 3 + Math.random() * 5) // 3.00 - 8.00
  const startTimeRef = useRef<number>(0)
  const doneRef = useRef(false)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          setStarted(true)
          startTimeRef.current = Date.now()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!started || stopped) return

    function tick() {
      const t = (Date.now() - startTimeRef.current) / 1000
      setElapsed(t)
      if (t < 12) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        // Timeout
        if (!doneRef.current) {
          handleStop()
        }
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [started, stopped])

  function handleStop() {
    if (!started || stopped || doneRef.current) return
    cancelAnimationFrame(rafRef.current)
    doneRef.current = true
    setStopped(true)

    const stopTime = (Date.now() - startTimeRef.current) / 1000
    const diff = Math.abs(stopTime - target)
    // Score inversé : moins d'écart = meilleur. 1000 - diff*100
    const score = Math.max(0, Math.round(1000 - diff * 100))

    const results: IMinigameResult[] = players.map(p => ({
      playerId: p.id,
      score: p.id === myPlayerId ? score : 0,
    }))
    onComplete(results)
  }

  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-950 gap-4">
        <p className="text-white font-bold text-2xl">Stop Chrono ⏱️</p>
        <p className="text-white/60 text-sm text-center px-8">
          Arrête le chrono à <span className="text-yellow-400 font-bold">{target.toFixed(2)}s</span>
        </p>
        <p className="text-yellow-400 text-5xl font-bold">{countdown}</p>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col items-center justify-center h-full bg-gray-950 select-none gap-8"
      onClick={handleStop}
    >
      {/* Cible */}
      <div className="text-center">
        <p className="text-white/50 text-sm uppercase tracking-widest">Cible</p>
        <p className="text-yellow-400 font-bold text-4xl">{target.toFixed(2)}s</p>
      </div>

      {/* Chrono */}
      <div className="text-center">
        <p className={`font-mono font-black text-6xl ${stopped ? 'text-green-400' : 'text-white'}`}>
          {elapsed.toFixed(2)}
        </p>
        <p className="text-white/20 text-xs mt-1">secondes</p>
      </div>

      {/* Bouton */}
      {!stopped ? (
        <div className="w-40 h-40 rounded-full bg-red-600 flex items-center justify-center shadow-2xl active:scale-95 transition-transform">
          <p className="text-white font-bold text-2xl">STOP</p>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-white/60">Écart : {Math.abs(elapsed - target).toFixed(2)}s</p>
          <p className="text-white/40 text-sm mt-2">En attente des autres…</p>
        </div>
      )}
    </div>
  )
}
