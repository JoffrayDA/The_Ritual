import { useEffect, useState } from 'react'
import type { MinigameComponentProps } from './MinigameRouter'
import type { IMinigameResult } from '../types/minigame.types'

type Arrow = '↑' | '↓' | '←' | '→'
const ARROWS: Arrow[] = ['↑', '↓', '←', '→']

function generateSequence(length: number): Arrow[] {
  return Array.from({ length }, () => ARROWS[Math.floor(Math.random() * 4)])
}

type Phase = 'countdown' | 'show' | 'input' | 'success' | 'fail' | 'done'

export default function Sequence({ players, myPlayerId, duration, onComplete }: MinigameComponentProps) {
  const [countdown, setCountdown] = useState(3)
  const [phase, setPhase] = useState<Phase>('countdown')
  const [sequence, setSequence] = useState<Arrow[]>(generateSequence(3))
  const [inputIndex, setInputIndex] = useState(0)
  const [score, setScore] = useState(0)
  const doneRef = { current: false }

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          showSequence(sequence)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Timeout global
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
    }, 2000 + seq.length * 300)
  }

  function handleArrow(arrow: Arrow) {
    if (phase !== 'input') return

    if (arrow === sequence[inputIndex]) {
      const nextIndex = inputIndex + 1
      if (nextIndex === sequence.length) {
        // Séquence réussie
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
        }, 800)
      } else {
        setInputIndex(nextIndex)
      }
    } else {
      // Erreur
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

  if (phase === 'countdown') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-950 gap-4">
        <p className="text-white font-bold text-2xl">Séquence 🧠</p>
        <p className="text-white/60 text-sm text-center px-8">Mémorise et reproduis les flèches !</p>
        <p className="text-yellow-400 text-5xl font-bold">{countdown}</p>
      </div>
    )
  }

  if (phase === 'show') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-950 gap-6">
        <p className="text-white/60 text-sm uppercase tracking-widest">Mémorise !</p>
        <div className="flex gap-3 flex-wrap justify-center px-4">
          {sequence.map((arrow, i) => (
            <span key={i} className="text-4xl font-bold text-yellow-400 bg-white/10 rounded-xl px-3 py-2">
              {arrow}
            </span>
          ))}
        </div>
      </div>
    )
  }

  if (phase === 'success') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-950 gap-4">
        <p className="text-4xl">✅</p>
        <p className="text-green-400 font-bold text-2xl">Parfait !</p>
        <p className="text-white/40">Séquence de {score} flèches</p>
      </div>
    )
  }

  if (phase === 'fail' || phase === 'done') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-950 gap-4">
        <p className="text-4xl">{phase === 'fail' ? '❌' : '🏁'}</p>
        <p className="text-white font-bold text-2xl">Score : {score}</p>
        <p className="text-white/40 text-sm">En attente des autres…</p>
      </div>
    )
  }

  // Phase 'input'
  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-950 gap-6 select-none">
      <p className="text-white/50 text-sm">{inputIndex}/{sequence.length}</p>

      {/* Progression visuelle */}
      <div className="flex gap-2">
        {sequence.map((_, i) => (
          <div key={i} className={`w-3 h-3 rounded-full ${i < inputIndex ? 'bg-green-400' : i === inputIndex ? 'bg-yellow-400' : 'bg-white/20'}`} />
        ))}
      </div>

      {/* Boutons flèches */}
      <div className="grid grid-cols-3 gap-3 w-48">
        <div />
        <button className="text-3xl bg-white/10 rounded-xl py-4 active:bg-white/30" onClick={() => handleArrow('↑')}>↑</button>
        <div />
        <button className="text-3xl bg-white/10 rounded-xl py-4 active:bg-white/30" onClick={() => handleArrow('←')}>←</button>
        <button className="text-3xl bg-white/10 rounded-xl py-4 active:bg-white/30" onClick={() => handleArrow('↓')}>↓</button>
        <button className="text-3xl bg-white/10 rounded-xl py-4 active:bg-white/30" onClick={() => handleArrow('→')}>→</button>
      </div>
    </div>
  )
}
