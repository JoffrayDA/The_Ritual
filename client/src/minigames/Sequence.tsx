import { useEffect, useState } from 'react'
import type { MinigameComponentProps } from './MinigameRouter'
import type { IMinigameResult } from '../types/minigame.types'

type Arrow = '↑' | '↓' | '←' | '→'
const ARROWS: Arrow[] = ['↑', '↓', '←', '→']

const ARROW_COLORS: Record<Arrow, { bg: string; glow: string; label: string }> = {
  '↑': { bg: 'from-blue-500 to-blue-800',   glow: '#3b82f6', label: 'HAUT' },
  '↓': { bg: 'from-red-500 to-red-800',     glow: '#ef4444', label: 'BAS' },
  '←': { bg: 'from-purple-500 to-purple-800',glow: '#a855f7', label: 'GAUCHE' },
  '→': { bg: 'from-green-500 to-green-800', glow: '#22c55e', label: 'DROITE' },
}

function generateSequence(length: number): Arrow[] {
  return Array.from({ length }, () => ARROWS[Math.floor(Math.random() * 4)])
}

type Phase = 'countdown' | 'show' | 'input' | 'success' | 'fail' | 'done'

export default function Sequence({ players, myPlayerId, duration, onComplete }: MinigameComponentProps) {
  const [countdown, setCountdown] = useState(3)
  const [countKey, setCountKey] = useState(0)
  const [phase, setPhase] = useState<Phase>('countdown')
  const [sequence, setSequence] = useState<Arrow[]>(generateSequence(3))
  const [inputIndex, setInputIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [flashArrow, setFlashArrow] = useState<Arrow | null>(null)
  const [wrongFlash, setWrongFlash] = useState(false)
  const doneRef = { current: false }

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          showSequence(sequence)
          return 0
        }
        setCountKey(k => k + 1)
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!doneRef.current) {
        doneRef.current = true
        submitResult(score)
      }
    }, duration)
    return () => clearTimeout(timer)
  }, [duration, score])

  function showSequence(seq: Arrow[]) {
    setPhase('show')
    setTimeout(() => {
      setInputIndex(0)
      setPhase('input')
    }, 2000 + seq.length * 350)
  }

  function handleArrow(arrow: Arrow) {
    if (phase !== 'input') return

    if (arrow === sequence[inputIndex]) {
      setFlashArrow(arrow)
      setTimeout(() => setFlashArrow(null), 180)

      const nextIndex = inputIndex + 1
      if (nextIndex === sequence.length) {
        const newScore = sequence.length
        setScore(newScore)
        setPhase('success')
        setTimeout(() => {
          if (!doneRef.current) {
            const newSeq = generateSequence(Math.min(sequence.length + 1, 8))
            setSequence(newSeq)
            setInputIndex(0)
            showSequence(newSeq)
          }
        }, 900)
      } else {
        setInputIndex(nextIndex)
      }
    } else {
      setWrongFlash(true)
      setTimeout(() => setWrongFlash(false), 400)
      setPhase('fail')
      if (!doneRef.current) {
        doneRef.current = true
        submitResult(score)
      }
    }
  }

  function submitResult(finalScore: number) {
    setPhase('done')
    const results: IMinigameResult[] = players.map(p => ({
      playerId: p.id,
      score: p.id === myPlayerId ? finalScore : 0,
    }))
    onComplete(results)
  }

  const BG = 'linear-gradient(160deg, #0a0a1e, #1a0a2e, #0a1a0a)'

  if (phase === 'countdown') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6" style={{ background: BG }}>
        <div className="text-6xl mb-2">🧠</div>
        <p className="text-white font-black text-3xl tracking-wide">SÉQUENCE</p>
        <p className="text-white/50 text-sm text-center px-8">Mémorise et reproduis les flèches !</p>
        <div className="mt-4 w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,215,0,0.15)', border: '3px solid rgba(255,215,0,0.5)' }}>
          <span key={countKey} className="countdown-number text-yellow-400 text-5xl font-black">{countdown}</span>
        </div>
      </div>
    )
  }

  if (phase === 'show') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-8" style={{ background: BG }}>
        <p className="text-white/70 text-sm uppercase tracking-widest font-bold">Mémorise !</p>
        <div className="flex gap-3 flex-wrap justify-center px-4 max-w-xs">
          {sequence.map((arrow, i) => {
            const cfg = ARROW_COLORS[arrow]
            return (
              <span key={i}
                className={`text-3xl font-black bg-gradient-to-b ${cfg.bg} rounded-2xl px-4 py-3 text-white`}
                style={{ boxShadow: `0 4px 20px ${cfg.glow}66`, animationDelay: `${i * 0.1}s` }}>
                {arrow}
              </span>
            )
          })}
        </div>
        <p className="text-white/30 text-xs">{sequence.length} flèches</p>
      </div>
    )
  }

  if (phase === 'success') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4" style={{ background: BG }}>
        <div className="text-6xl flash-in">✅</div>
        <p className="text-green-400 font-black text-3xl">PARFAIT !</p>
        <p className="text-white/40 text-sm">Séquence de {score} flèches réussie</p>
        <p className="text-yellow-400/60 text-xs mt-2">Prochaine : {score + 1} flèches…</p>
      </div>
    )
  }

  if (phase === 'fail' || phase === 'done') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4" style={{ background: BG }}>
        <div className="text-6xl">{phase === 'fail' ? '❌' : '🏁'}</div>
        <p className="text-white font-black text-3xl">Score : {score}</p>
        <div className="px-6 py-2 rounded-full bg-white/10 text-white/50 text-sm">
          {score >= 6 ? 'Impressionnant !' : score >= 3 ? 'Pas mal !' : 'Continue !'}
        </div>
        <p className="text-white/30 text-xs mt-4">En attente des autres…</p>
      </div>
    )
  }

  // Phase 'input'
  const currentArrow = sequence[inputIndex]
  const currentCfg = ARROW_COLORS[currentArrow]

  return (
    <div className={`flex flex-col items-center justify-center h-full gap-6 select-none transition-colors duration-150 ${wrongFlash ? 'bg-red-900/40' : ''}`}
      style={{ background: wrongFlash ? undefined : BG }}>
      {/* Progression dots */}
      <div className="flex gap-2 items-center">
        {sequence.map((arr, i) => {
          const done = i < inputIndex
          const current = i === inputIndex
          const cfg = ARROW_COLORS[arr]
          return (
            <div key={i}
              className={`rounded-full transition-all duration-200 ${current ? 'w-5 h-5' : 'w-3 h-3'}`}
              style={{
                background: done ? '#22c55e' : current ? cfg.glow : 'rgba(255,255,255,0.15)',
                boxShadow: current ? `0 0 12px ${cfg.glow}` : 'none',
              }} />
          )
        })}
      </div>

      {/* Indicateur de la prochaine flèche */}
      <div className="text-center">
        <p className="text-white/30 text-xs uppercase tracking-widest mb-2">{inputIndex + 1} / {sequence.length}</p>
        <div className={`text-6xl w-24 h-24 rounded-2xl bg-gradient-to-b ${currentCfg.bg} flex items-center justify-center font-black`}
          style={{ boxShadow: `0 0 30px ${currentCfg.glow}66` }}>
          ?
        </div>
      </div>

      {/* Boutons flèches */}
      <div className="grid grid-cols-3 gap-3 w-52">
        <div />
        <ArrowBtn arrow="↑" onPress={handleArrow} flash={flashArrow === '↑'} />
        <div />
        <ArrowBtn arrow="←" onPress={handleArrow} flash={flashArrow === '←'} />
        <ArrowBtn arrow="↓" onPress={handleArrow} flash={flashArrow === '↓'} />
        <ArrowBtn arrow="→" onPress={handleArrow} flash={flashArrow === '→'} />
      </div>
    </div>
  )
}

function ArrowBtn({ arrow, onPress, flash }: { arrow: Arrow; onPress: (a: Arrow) => void; flash: boolean }) {
  const cfg = ARROW_COLORS[arrow]
  return (
    <button
      className={`h-16 rounded-2xl text-3xl font-black text-white transition-all duration-100 active:scale-90 bg-gradient-to-b ${cfg.bg}`}
      style={{
        boxShadow: flash ? `0 0 25px ${cfg.glow}, 0 0 50px ${cfg.glow}55` : `0 4px 15px ${cfg.glow}33`,
        transform: flash ? 'scale(0.92)' : undefined,
      }}
      onClick={() => onPress(arrow)}
    >
      {arrow}
    </button>
  )
}
