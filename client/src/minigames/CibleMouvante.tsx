import { useCallback, useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import type { MinigameComponentProps } from './MinigameRouter'
import type { IMinigameResult } from '../types/minigame.types'

const MAX_SHOTS = 5
const TARGET_RADIUS = 30

export default function CibleMouvante({ players, myPlayerId, duration, onComplete }: MinigameComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<PIXI.Application | null>(null)
  const targetRef = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null)
  const gfxRef = useRef<PIXI.Graphics | null>(null)
  const [shotsLeft, setShotsLeft] = useState(MAX_SHOTS)
  const [totalScore, setTotalScore] = useState(0)
  const shotsLeftRef = useRef(MAX_SHOTS)
  const totalScoreRef = useRef(0)
  const [countdown, setCountdown] = useState(3)
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const doneRef = useRef(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); setStarted(true); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!started) return
    const timer = setTimeout(() => {
      if (!doneRef.current) { doneRef.current = true; finish() }
    }, duration)
    return () => clearTimeout(timer)
  }, [started, duration])

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

    // Cible
    const speed = 3
    const angle = Math.random() * Math.PI * 2
    const target = {
      x: w / 2, y: h / 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
    }
    targetRef.current = target

    const gfx = new PIXI.Graphics()
    gfxRef.current = gfx
    app.stage.addChild(gfx)

    // Zone de tap transparent sur tout l'écran
    const hitArea = new PIXI.Graphics()
    hitArea.beginFill(0x000000, 0.001)
    hitArea.drawRect(0, 0, w, h)
    hitArea.endFill()
    hitArea.interactive = true
    hitArea.on('pointerdown', (e: PIXI.InteractionEvent) => {
      if (doneRef.current || shotsLeftRef.current <= 0) return
      const pos = e.data.getLocalPosition(app.stage)
      const dx = pos.x - target.x
      const dy = pos.y - target.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const pts = Math.max(0, Math.round(100 - dist))
      totalScoreRef.current += pts
      setTotalScore(totalScoreRef.current)
      shotsLeftRef.current--
      setShotsLeft(shotsLeftRef.current)

      // Flash hit
      const flash = new PIXI.Graphics()
      flash.beginFill(pts > 50 ? 0xFFD700 : 0xFF4444, 0.8)
      flash.drawCircle(pos.x, pos.y, 15)
      flash.endFill()
      app.stage.addChild(flash)
      setTimeout(() => { if (flash.parent) flash.parent.removeChild(flash); flash.destroy() }, 300)

      if (shotsLeftRef.current <= 0 && !doneRef.current) {
        doneRef.current = true
        setTimeout(() => finish(), 500)
      }
    })
    app.stage.addChild(hitArea)

    // Mouvement + dessin
    app.ticker.add(() => {
      target.x += target.vx
      target.y += target.vy
      if (target.x < TARGET_RADIUS || target.x > app.screen.width - TARGET_RADIUS) target.vx *= -1
      if (target.y < TARGET_RADIUS || target.y > app.screen.height - TARGET_RADIUS) target.vy *= -1

      gfx.clear()
      // Cercles concentriques
      for (let i = 3; i >= 1; i--) {
        const r = TARGET_RADIUS * (i / 3)
        const color = i === 1 ? 0xFF4444 : i === 2 ? 0xFFFFFF : 0x4488FF
        gfx.beginFill(color)
        gfx.drawCircle(target.x, target.y, r)
        gfx.endFill()
      }
      // Croix
      gfx.lineStyle(2, 0x000000, 0.6)
      gfx.moveTo(target.x - TARGET_RADIUS, target.y)
      gfx.lineTo(target.x + TARGET_RADIUS, target.y)
      gfx.moveTo(target.x, target.y - TARGET_RADIUS)
      gfx.lineTo(target.x, target.y + TARGET_RADIUS)
    })

    return () => { app.destroy(true, { children: true }); appRef.current = null }
  }, [])

  useEffect(() => {
    if (!started) return
    return initPixi()
  }, [started, initPixi])

  function finish() {
    setFinished(true)
    const results: IMinigameResult[] = players.map(p => ({
      playerId: p.id,
      score: p.id === myPlayerId ? totalScoreRef.current : 0,
    }))
    onComplete(results)
  }

  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-950 gap-4">
        <p className="text-white font-bold text-2xl">Cible Mouvante 🎯</p>
        <p className="text-white/60 text-sm text-center px-8">{MAX_SHOTS} tirs — vise le centre !</p>
        <p className="text-yellow-400 text-5xl font-bold">{countdown}</p>
      </div>
    )
  }

  if (finished) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-950 gap-4">
        <p className="text-4xl">🎯</p>
        <p className="text-white font-bold text-2xl">{totalScore} pts</p>
        <p className="text-white/40 text-sm">En attente des autres…</p>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="absolute top-3 left-0 right-0 flex justify-between px-4 pointer-events-none">
        <span className="bg-black/60 rounded-xl px-3 py-1 text-white font-bold">Tirs : {shotsLeft}</span>
        <span className="bg-black/60 rounded-xl px-3 py-1 text-yellow-400 font-bold">{totalScore} pts</span>
      </div>
    </div>
  )
}
