import { useCallback, useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import type { MinigameComponentProps } from './MinigameRouter'
import type { IMinigameResult } from '../types/minigame.types'

const GAME_DURATION = 15000

interface Target {
  id: number
  x: number
  y: number
  radius: number
  vx: number
  vy: number
}

export default function TirDeGun({ players, myPlayerId, onComplete }: MinigameComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<PIXI.Application | null>(null)
  const targetsRef = useRef<Map<number, { gfx: PIXI.Graphics; data: Target }>>(new Map())
  const scoreRef = useRef(0)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION)
  const [finished, setFinished] = useState(false)
  const [countdown, setCountdown] = useState(3)
  const [started, setStarted] = useState(false)
  const doneRef = useRef(false)
  let nextId = 0

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

  const initPixi = useCallback(() => {
    if (!containerRef.current || appRef.current) return
    const w = containerRef.current.clientWidth
    const h = containerRef.current.clientHeight

    const app = new PIXI.Application({
      width: w, height: h,
      backgroundColor: 0x111122,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    })
    appRef.current = app
    containerRef.current.appendChild(app.view as HTMLCanvasElement)

    // Spawn cibles
    const spawnInterval = setInterval(() => {
      if (doneRef.current) { clearInterval(spawnInterval); return }
      spawnTarget(app)
    }, 800)

    // Déplacement des cibles
    app.ticker.add(() => {
      targetsRef.current.forEach(({ gfx, data }) => {
        data.x += data.vx
        data.y += data.vy
        if (data.x < 0 || data.x > app.screen.width) data.vx *= -1
        if (data.y < 0 || data.y > app.screen.height) data.vy *= -1
        // Rétrécir avec le temps
        data.radius = Math.max(8, data.radius - 0.01)
        gfx.position.set(data.x, data.y)
        gfx.scale.set(data.radius / 20)
      })
    })

    return () => {
      clearInterval(spawnInterval)
      app.destroy(true, { children: true })
      appRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!started) return
    const cleanup = initPixi()
    return cleanup
  }, [started, initPixi])

  function spawnTarget(app: PIXI.Application) {
    const id = nextId++
    const radius = 20
    const x = radius + Math.random() * (app.screen.width - radius * 2)
    const y = radius + Math.random() * (app.screen.height - radius * 2)
    const speed = 1 + Math.random() * 2
    const angle = Math.random() * Math.PI * 2

    const gfx = new PIXI.Graphics()
    gfx.beginFill(0xFF4444)
    gfx.lineStyle(3, 0xFFFFFF, 0.8)
    gfx.drawCircle(0, 0, radius)
    gfx.endFill()
    // Croix au centre
    gfx.lineStyle(2, 0xFFFFFF)
    gfx.moveTo(-8, 0); gfx.lineTo(8, 0)
    gfx.moveTo(0, -8); gfx.lineTo(0, 8)
    gfx.position.set(x, y)
    gfx.interactive = true
    gfx.cursor = 'crosshair'

    const target: Target = { id, x, y, radius, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed }
    targetsRef.current.set(id, { gfx, data: target })

    gfx.on('pointerdown', () => {
      if (doneRef.current) return
      app.stage.removeChild(gfx)
      gfx.destroy()
      targetsRef.current.delete(id)
      scoreRef.current++
      setScore(scoreRef.current)
    })

    app.stage.addChild(gfx)
  }

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
            const results: IMinigameResult[] = players.map(p => ({
              playerId: p.id,
              score: p.id === myPlayerId ? scoreRef.current : 0,
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

  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-950 gap-4">
        <p className="text-white font-bold text-2xl">Tir de Gun 🎯</p>
        <p className="text-white/60 text-sm text-center px-8">Tape sur les cibles pendant 15s !</p>
        <p className="text-yellow-400 text-5xl font-bold">{countdown}</p>
      </div>
    )
  }

  if (finished) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-950 gap-4">
        <p className="text-4xl">🎯</p>
        <p className="text-white font-bold text-2xl">{score} hits</p>
        <p className="text-white/40 text-sm">En attente des autres…</p>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="absolute inset-0" />
      {/* HUD */}
      <div className="absolute top-3 left-0 right-0 flex justify-between px-4 pointer-events-none">
        <span className="bg-black/60 rounded-xl px-3 py-1 text-white font-bold">🎯 {score}</span>
        <span className="bg-black/60 rounded-xl px-3 py-1 text-yellow-400 font-bold">{(timeLeft / 1000).toFixed(1)}s</span>
      </div>
    </div>
  )
}
