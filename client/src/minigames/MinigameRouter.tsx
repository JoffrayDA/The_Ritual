import { lazy, Suspense, useEffect, useState } from 'react'
import { socket } from '../hooks/useSocket'
import type { IGameState, MinigameName } from '../types/game.types'
import type { IMinigameResult } from '../types/minigame.types'
import { Spinner } from '../components/ui/Spinner'

const IMPORT_MAP: Record<MinigameName, () => Promise<{ default: React.ComponentType<MinigameComponentProps> }>> = {
  'sequence':       () => import('./Sequence'),
  'turbo-tap':      () => import('./TurboTap'),
  'stop-chrono':    () => import('./StopChrono'),
  'tir-de-gun':     () => import('./TirDeGun'),
  'reaction-pure':  () => import('./ReactionPure'),
  'cible-mouvante': () => import('./CibleMouvante'),
  'equilibre':      () => import('./Equilibre'),
  'peinture-battle':() => import('./PeintureBattle'),
  'labyrinthe':     () => import('./Labyrinthe'),
}

export interface MinigameComponentProps {
  players: IGameState['players']
  myPlayerId: string
  duration: number
  seed?: string
  onComplete: (results: IMinigameResult[]) => void
}

interface MinigameRouterProps {
  gameState: IGameState
  myPlayerId: string
  roomCode: string
}

interface ActiveMinigame {
  name: MinigameName
  duration: number
  seed?: string
}

// Cache module-level : évite de rater l'event si le composant n'est pas encore monté
let _pendingMinigame: ActiveMinigame | null = null
socket.on('minigame-started', ({ name, duration, seed }: { name: MinigameName; duration: number; seed?: string }) => {
  _pendingMinigame = { name, duration, seed }
})

export default function MinigameRouter({ gameState, myPlayerId, roomCode }: MinigameRouterProps) {
  const [active, setActive] = useState<ActiveMinigame | null>(_pendingMinigame)
  const [showResults, setShowResults] = useState<{
    results: Array<{ playerId: string; score: number; rank: number }>
    winnerId: string
    moneyAwarded: number
  } | null>(null)

  useEffect(() => {
    // Sync depuis le cache si l'event est arrivé avant le montage
    if (_pendingMinigame && !active) {
      setActive(_pendingMinigame)
    }

    function onMinigameStarted({ name, duration, seed }: { name: MinigameName; duration: number; seed?: string }) {
      _pendingMinigame = { name, duration, seed }
      setActive({ name, duration, seed })
      setShowResults(null)
    }

    function onMinigameResults(payload: {
      results: Array<{ playerId: string; score: number; rank: number }>
      winnerId: string
      moneyAwarded: number
    }) {
      _pendingMinigame = null
      setActive(null)
      setShowResults(payload)
      setTimeout(() => setShowResults(null), 3500)
    }

    socket.on('minigame-started', onMinigameStarted)
    socket.on('minigame-results', onMinigameResults)

    return () => {
      socket.off('minigame-started', onMinigameStarted)
      socket.off('minigame-results', onMinigameResults)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleComplete(results: IMinigameResult[]) {
    _pendingMinigame = null
    setActive(null)
    const myResult = results.find(r => r.playerId === myPlayerId)
    socket.emit('submit-minigame-result', {
      roomCode,
      playerId: myPlayerId,
      score: myResult?.score ?? 0,
    })
  }

  if (showResults) {
    const winner = gameState.players.find(p => p.id === showResults.winnerId)
    return (
      <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-4 z-50 px-6">
        <p className="text-4xl">🏅</p>
        <p className="text-white font-bold text-xl text-center">
          {winner?.name || '???'} remporte le mini-jeu !
        </p>
        <p className="text-yellow-400">+{showResults.moneyAwarded} 🪙</p>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          {showResults.results.map(r => {
            const player = gameState.players.find(p => p.id === r.playerId)
            return (
              <div key={r.playerId} className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-2">
                <span className="text-white/40 w-5">#{r.rank}</span>
                <span>{player?.avatar || '❓'}</span>
                <span className="text-white flex-1">{player?.name || '???'}</span>
                <span className="text-white/60 text-sm">{r.score}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (!active) return null

  const importFn = IMPORT_MAP[active.name]
  if (!importFn) return null

  const MinigameComponent = lazy(importFn)

  return (
    <div className="absolute inset-0 bg-gray-950 z-40">
      <Suspense fallback={
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-3">
            <Spinner size={32} />
            <p className="text-white/60 text-sm">Chargement du mini-jeu…</p>
          </div>
        </div>
      }>
        <MinigameComponent
          players={gameState.players}
          myPlayerId={myPlayerId}
          duration={active.duration}
          seed={active.seed}
          onComplete={handleComplete}
        />
      </Suspense>
    </div>
  )
}
