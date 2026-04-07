import { useEffect, useRef, useState } from 'react'
import type { MinigameComponentProps } from './MinigameRouter'
import type { IMinigameResult } from '../types/minigame.types'

const GAME_DURATION = 10000
const MAX_TAPS_PER_SEC = 20

interface Ripple { id: number; x: number; y: number }

export default function TurboTap({ players, myPlayerId, onComplete }: MinigameComponentProps) {
  const [taps, setTaps] = useState(0)
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION)
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [countdown, setCountdown] = useState(3)
  const [countKey, setCountKey] = useState(0)
  const [ripples, setRipples] = useState<Ripple[]>([])
  const [shake, setShake] = useState(false)
  const tapsRef = useRef(0)
  const lastSecTaps = useRef(0)
  const lastSecTime = useRef(Date.now())
  const doneRef = useRef(false)
  const rippleId = useRef(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          setStarted(true)
          return 0
        }
        setCountKey(k => k + 1)
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

  function handleTap(e: React.MouseEvent | React.TouchEvent) {
    if (!started || finished) return

    const now = Date.now()
    if (now - lastSecTime.current >= 1000) {
      lastSecTaps.current = 0
      lastSecTime.current = now
    }
    if (lastSecTaps.current >= MAX_TAPS_PER_SEC) return
    lastSecTaps.current++

    tapsRef.current++
    setTaps(tapsRef.current)

    // Ripple
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0]?.clientX ?? rect.left + rect.width / 2 : e.clientX
    const clientY = 'touches' in e ? e.touches[0]?.clientY ?? rect.top + rect.height / 2 : e.clientY
    const rx = ((clientX - rect.left) / rect.width) * 100
    const ry = ((clientY - rect.top) / rect.height) * 100
    const id = rippleId.current++
    setRipples(r => [...r, { id, x: rx, y: ry }])
    setTimeout(() => setRipples(r => r.filter(rr => rr.id !== id)), 600)

    // Shake every 10 taps
    if (tapsRef.current % 10 === 0) {
      setShake(true)
      setTimeout(() => setShake(false), 200)
    }
  }

  const progress = Math.min(taps / (MAX_TAPS_PER_SEC * 10), 1)
  const timerPct = timeLeft / GAME_DURATION
  const scale = 1 + Math.min(taps * 0.001, 0.2)

  // Dynamic color based on progress
  const buttonColor = `hsl(${240 - Math.floor(progress * 120)}, 80%, 55%)`

  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6"
        style={{ background: 'linear-gradient(160deg, #0a0a1a, #1a0a2e, #0a1a2e)' }}>
        <div className="text-6xl mb-2">👆</div>
        <p className="text-white font-black text-3xl tracking-wide">TURBO TAP</p>
        <p className="text-white/50 text-sm text-center px-8">Tape le plus vite possible pendant 10s !</p>
        <div className="mt-4 w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,215,0,0.15)', border: '3px solid rgba(255,215,0,0.5)' }}>
          <span key={countKey} className="countdown-number text-yellow-400 text-5xl font-black">{countdown}</span>
        </div>
      </div>
    )
  }

  if (finished) {
    const great = taps >= 120
    const ok = taps >= 70
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6"
        style={{ background: 'linear-gradient(160deg, #0a0a1a, #1a0a2e, #0a1a2e)' }}>
        <div className="text-6xl">🏁</div>
        <p className={`font-black text-5xl ${great ? 'shimmer-text' : 'text-white'}`}>{taps}</p>
        <p className="text-white/50 text-sm">taps en 10 secondes</p>
        <div className="px-6 py-3 rounded-full text-sm font-bold mt-2"
          style={{ background: great ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.1)',
                   color: great ? '#FFD700' : ok ? '#88ff99' : '#aaa' }}>
          {great ? 'Monstre !' : ok ? 'Bien joué !' : 'Pas mal…'}
        </div>
        <p className="text-white/30 text-xs mt-4">En attente des autres…</p>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col items-center justify-center h-full select-none cursor-pointer gap-6 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #0a0a1a, #1a0a2e, #0a1a2e)' }}
      onClick={handleTap}
      onTouchStart={handleTap}
    >
      {/* Ripples */}
      {ripples.map(r => (
        <span key={r.id} className="pointer-events-none absolute rounded-full"
          style={{
            left: `${r.x}%`, top: `${r.y}%`,
            width: 60, height: 60,
            marginLeft: -30, marginTop: -30,
            background: `${buttonColor}55`,
            animation: 'tap-ripple 0.6s ease-out forwards',
          }} />
      ))}

      {/* Timer bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5"
        style={{ background: 'rgba(255,255,255,0.1)' }}>
        <div className="h-full transition-all duration-100"
          style={{
            width: `${timerPct * 100}%`,
            background: timerPct > 0.5 ? '#4ade80' : timerPct > 0.25 ? '#facc15' : '#f87171',
          }} />
      </div>

      {/* Timer */}
      <p className="text-white/70 font-bold text-2xl tabular-nums">
        {(timeLeft / 1000).toFixed(1)}s
      </p>

      {/* Bouton tap */}
      <div
        className={`relative rounded-full flex items-center justify-center transition-transform duration-75 active:scale-90 ${shake ? 'scale-110' : ''}`}
        style={{
          width: 180, height: 180,
          background: `radial-gradient(circle at 35% 35%, ${buttonColor}cc, ${buttonColor}44)`,
          boxShadow: `0 0 ${20 + taps * 0.3}px ${buttonColor}88, inset 0 0 20px rgba(255,255,255,0.1)`,
          transform: `scale(${scale})`,
        }}
      >
        <span className="text-5xl select-none">👆</span>
        {/* Anneau externe */}
        <div className="absolute inset-0 rounded-full pointer-events-none"
          style={{ border: `3px solid ${buttonColor}66` }} />
      </div>

      {/* Compteur */}
      <p className="font-black text-5xl text-white tabular-nums" style={{ textShadow: `0 0 20px ${buttonColor}` }}>
        {taps}
      </p>

      {/* Barre de progression */}
      <div className="w-64 h-3 rounded-full overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div
          className="h-full rounded-full transition-all duration-100"
          style={{ width: `${progress * 100}%`, background: `linear-gradient(90deg, #6366f1, ${buttonColor})` }}
        />
      </div>
    </div>
  )
}
