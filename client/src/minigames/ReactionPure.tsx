import { useEffect, useRef, useState } from 'react'
import type { MinigameComponentProps } from './MinigameRouter'
import type { IMinigameResult } from '../types/minigame.types'

type Phase = 'waiting' | 'ready' | 'flash' | 'done'

const FLASH_CONFIGS = [
  { color: '#FF2244', label: 'ROUGE', bg: 'from-red-600 to-rose-900' },
  { color: '#2266FF', label: 'BLEU',  bg: 'from-blue-600 to-indigo-900' },
  { color: '#22FF88', label: 'VERT',  bg: 'from-emerald-500 to-teal-900' },
  { color: '#FFD700', label: 'OR',    bg: 'from-yellow-400 to-orange-900' },
  { color: '#CC44FF', label: 'VIOLET',bg: 'from-purple-500 to-violet-900' },
]

export default function ReactionPure({ players, myPlayerId, duration, onComplete }: MinigameComponentProps) {
  const [phase, setPhase] = useState<Phase>('waiting')
  const [flashConfig, setFlashConfig] = useState(FLASH_CONFIGS[0])
  const [myTime, setMyTime] = useState<number | null>(null)
  const [tooEarly, setTooEarly] = useState(false)
  const [countKey, setCountKey] = useState(0)
  const flashTimeRef = useRef<number>(0)
  const doneRef = useRef(false)
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          startGame()
          return 0
        }
        setCountKey(k => k + 1)
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  function startGame() {
    setPhase('ready')
    const delay = 1000 + Math.random() * 3000
    const config = FLASH_CONFIGS[Math.floor(Math.random() * FLASH_CONFIGS.length)]
    setTimeout(() => {
      setFlashConfig(config)
      setPhase('flash')
      flashTimeRef.current = Date.now()
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
      const score = Math.max(0, 10000 - reactionTime)
      const results: IMinigameResult[] = players.map(p => ({
        playerId: p.id,
        score: p.id === myPlayerId ? score : 0,
      }))
      onComplete(results)
    } else if (phase === 'ready') {
      setTooEarly(true)
      setPhase('done')
      doneRef.current = true
      const results: IMinigameResult[] = players.map(p => ({ playerId: p.id, score: 0 }))
      onComplete(results)
    }
  }

  if (phase === 'waiting') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6"
        style={{ background: 'linear-gradient(160deg, #0f0c29, #302b63, #24243e)' }}>
        <div className="text-6xl mb-2">⚡</div>
        <p className="text-white font-black text-3xl tracking-wide">RÉACTION PURE</p>
        <p className="text-white/50 text-sm text-center px-8">Attends le flash… puis tape immédiatement !</p>
        <div className="mt-4 w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,215,0,0.15)', border: '3px solid rgba(255,215,0,0.5)' }}>
          <span key={countKey} className="countdown-number text-yellow-400 text-5xl font-black">{countdown}</span>
        </div>
      </div>
    )
  }

  if (phase === 'ready') {
    return (
      <div
        className="flex flex-col items-center justify-center h-full cursor-pointer select-none"
        style={{ background: 'linear-gradient(160deg, #0f0c29, #302b63, #24243e)' }}
        onClick={handleTap}
      >
        <div className="ready-pulse w-40 h-40 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.2)' }}>
          <div className="ready-pulse w-24 h-24 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.08)', border: '2px solid rgba(255,255,255,0.3)', animationDelay: '0.3s' }}>
            <span className="text-white/30 font-black text-lg">...</span>
          </div>
        </div>
        <p className="text-white/30 text-sm mt-8">Pas encore !</p>
      </div>
    )
  }

  if (phase === 'flash') {
    return (
      <div
        className={`flex flex-col items-center justify-center h-full cursor-pointer select-none bg-gradient-to-b ${flashConfig.bg} flash-in`}
        onClick={handleTap}
      >
        <div className="w-48 h-48 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.25)', boxShadow: `0 0 60px ${flashConfig.color}` }}>
          <p className="text-white font-black text-5xl drop-shadow-lg">TAP !</p>
        </div>
        <p className="text-white/70 font-bold text-lg mt-6 tracking-widest">{flashConfig.label} !</p>
      </div>
    )
  }

  const fast = myTime !== null && myTime < 300
  const decent = myTime !== null && myTime < 600

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6"
      style={{ background: 'linear-gradient(160deg, #0f0c29, #302b63, #24243e)' }}>
      {tooEarly ? (
        <>
          <div className="text-6xl">🚨</div>
          <p className="text-red-400 font-black text-3xl">TROP TÔT !</p>
          <p className="text-white/40 text-sm">Score : 0</p>
        </>
      ) : myTime !== null ? (
        <>
          <div className="text-6xl">{fast ? '⚡' : decent ? '👍' : '🐢'}</div>
          <div className="text-center">
            <p className={`font-black text-5xl ${fast ? 'shimmer-text' : 'text-white'}`}>
              {myTime} ms
            </p>
            <p className="text-white/40 text-sm mt-1">temps de réaction</p>
          </div>
          <div className="px-6 py-3 rounded-full text-sm font-bold"
            style={{ background: fast ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.1)',
                     color: fast ? '#FFD700' : decent ? '#88ff99' : '#ff8888' }}>
            {fast ? 'Fulgurant !' : decent ? 'Rapide !' : 'Un peu lent…'}
          </div>
        </>
      ) : (
        <>
          <div className="text-6xl">😴</div>
          <p className="text-white/60 font-bold text-xl">Trop lent !</p>
        </>
      )}
      <p className="text-white/30 text-xs mt-4">En attente des autres…</p>
    </div>
  )
}
