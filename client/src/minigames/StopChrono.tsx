import { useEffect, useRef, useState } from 'react'
import type { MinigameComponentProps } from './MinigameRouter'
import type { IMinigameResult } from '../types/minigame.types'

export default function StopChrono({ players, myPlayerId, onComplete }: MinigameComponentProps) {
  const [countdown, setCountdown] = useState(3)
  const [countKey, setCountKey] = useState(0)
  const [started, setStarted] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [stopped, setStopped] = useState(false)
  const [target] = useState(() => 3 + Math.random() * 5)
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
        setCountKey(k => k + 1)
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
        if (!doneRef.current) handleStop()
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
    const score = Math.max(0, Math.round(1000 - diff * 100))

    const results: IMinigameResult[] = players.map(p => ({
      playerId: p.id,
      score: p.id === myPlayerId ? score : 0,
    }))
    onComplete(results)
  }

  const diff = Math.abs(elapsed - target)
  const timerProgress = Math.min(elapsed / 12, 1)
  // "chaud/froid" indicator
  const nearness = Math.max(0, 1 - diff * 2) // 0→1 quand on approche la cible
  const warmColor = `hsl(${Math.floor(nearness * 120)}, 80%, 55%)`

  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6"
        style={{ background: 'linear-gradient(160deg, #0a1a0a, #0a0a2e, #1a0a1a)' }}>
        <div className="text-6xl mb-2">⏱️</div>
        <p className="text-white font-black text-3xl tracking-wide">STOP CHRONO</p>
        <div className="bg-white/10 rounded-2xl px-8 py-4 text-center border border-white/20">
          <p className="text-white/50 text-xs uppercase tracking-widest mb-1">Objectif</p>
          <p className="text-yellow-400 font-black text-4xl">{target.toFixed(2)}s</p>
        </div>
        <p className="text-white/40 text-sm text-center px-8">Appuie sur STOP au bon moment !</p>
        <div className="mt-2 w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,215,0,0.15)', border: '3px solid rgba(255,215,0,0.5)' }}>
          <span key={countKey} className="countdown-number text-yellow-400 text-5xl font-black">{countdown}</span>
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col items-center justify-center h-full select-none gap-8 relative"
      style={{ background: 'linear-gradient(160deg, #0a1a0a, #0a0a2e, #1a0a1a)' }}
      onClick={handleStop}
    >
      {/* Barre de progression du temps */}
      <div className="absolute top-0 left-0 right-0 h-1.5"
        style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div className="h-full transition-none rounded-full"
          style={{ width: `${timerProgress * 100}%`, background: warmColor }} />
      </div>

      {/* Cible */}
      <div className="bg-white/10 rounded-2xl px-8 py-3 text-center border border-white/15">
        <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Cible</p>
        <p className="text-yellow-400 font-black text-4xl tabular-nums">{target.toFixed(2)}s</p>
      </div>

      {/* Chrono principal */}
      <div className="text-center">
        <p className={`font-mono font-black text-7xl tabular-nums transition-colors duration-200 ${stopped ? 'text-green-400' : 'text-white'}`}
          style={!stopped ? { textShadow: `0 0 30px ${warmColor}88` } : {}}>
          {elapsed.toFixed(2)}
        </p>
        <p className="text-white/20 text-xs mt-1 tracking-widest uppercase">secondes</p>
      </div>

      {/* Bouton STOP */}
      {!stopped ? (
        <div className="flex flex-col items-center gap-3">
          <div className="w-44 h-44 rounded-full flex items-center justify-center transition-transform active:scale-90"
            style={{
              background: `radial-gradient(circle at 35% 35%, #ef4444cc, #7f1d1d)`,
              boxShadow: '0 0 40px rgba(239,68,68,0.5), inset 0 0 20px rgba(255,255,255,0.1)',
            }}>
            <p className="text-white font-black text-3xl tracking-widest">STOP</p>
          </div>
          <p className="text-white/25 text-xs">Tape pour arrêter</p>
        </div>
      ) : (
        <div className="text-center flex flex-col items-center gap-3">
          {/* Score visuel */}
          <div className="text-5xl">{diff < 0.1 ? '🎯' : diff < 0.3 ? '🔥' : diff < 0.7 ? '👍' : '😬'}</div>
          <div className="bg-white/10 rounded-2xl px-6 py-3 border border-white/15">
            <p className="text-white/50 text-xs uppercase tracking-widest mb-1">Écart</p>
            <p className="text-white font-bold text-2xl tabular-nums">{diff.toFixed(2)}s</p>
          </div>
          <p className="text-white/30 text-xs mt-2">En attente des autres…</p>
        </div>
      )}
    </div>
  )
}
