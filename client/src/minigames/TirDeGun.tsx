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
  hue: number
}

function makeStarfield(app: PIXI.Application): PIXI.Graphics {
  const stars = new PIXI.Graphics()
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * app.screen.width
    const y = Math.random() * app.screen.height
    const r = Math.random() * 1.5 + 0.3
    const alpha = Math.random() * 0.5 + 0.2
    stars.beginFill(0xffffff, alpha)
    stars.drawCircle(x, y, r)
    stars.endFill()
  }
  return stars
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
  const [countKey, setCountKey] = useState(0)
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
        setCountKey(k => k + 1)
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
      backgroundColor: 0x050510,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    })
    appRef.current = app
    containerRef.current.appendChild(app.view as HTMLCanvasElement)

    // Étoiles de fond
    app.stage.addChild(makeStarfield(app))

    // Grille subtile
    const grid = new PIXI.Graphics()
    grid.lineStyle(1, 0x223366, 0.3)
    for (let x = 0; x < w; x += 40) { grid.moveTo(x, 0); grid.lineTo(x, h) }
    for (let y = 0; y < h; y += 40) { grid.moveTo(0, y); grid.lineTo(w, y) }
    app.stage.addChild(grid)

    const spawnInterval = setInterval(() => {
      if (doneRef.current) { clearInterval(spawnInterval); return }
      spawnTarget(app)
    }, 800)

    app.ticker.add(() => {
      targetsRef.current.forEach(({ gfx, data }) => {
        data.x += data.vx
        data.y += data.vy
        if (data.x < 0 || data.x > app.screen.width) data.vx *= -1
        if (data.y < 0 || data.y > app.screen.height) data.vy *= -1
        data.radius = Math.max(10, data.radius - 0.008)
        gfx.position.set(data.x, data.y)
        gfx.scale.set(data.radius / 22)
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
    const radius = 22
    const x = radius + Math.random() * (app.screen.width - radius * 2)
    const y = radius + Math.random() * (app.screen.height - radius * 2)
    const speed = 1.2 + Math.random() * 2.5
    const angle = Math.random() * Math.PI * 2
    const hue = Math.floor(Math.random() * 360)
    const hexColor = hslToHex(hue, 80, 55)

    const gfx = new PIXI.Graphics()
    // Halo externe
    gfx.beginFill(hexColor, 0.15)
    gfx.drawCircle(0, 0, radius + 8)
    gfx.endFill()
    // Corps principal
    gfx.beginFill(hexColor, 0.9)
    gfx.drawCircle(0, 0, radius)
    gfx.endFill()
    // Anneau blanc
    gfx.lineStyle(2, 0xffffff, 0.8)
    gfx.drawCircle(0, 0, radius)
    // Centre
    gfx.lineStyle(0)
    gfx.beginFill(0xffffff, 0.95)
    gfx.drawCircle(0, 0, 5)
    gfx.endFill()
    // Croix
    gfx.lineStyle(2, 0x000000, 0.7)
    gfx.moveTo(-10, 0); gfx.lineTo(10, 0)
    gfx.moveTo(0, -10); gfx.lineTo(0, 10)

    gfx.position.set(x, y)
    gfx.interactive = true
    gfx.cursor = 'crosshair'

    const target: Target = { id, x, y, radius, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, hue }
    targetsRef.current.set(id, { gfx, data: target })

    gfx.on('pointerdown', () => {
      if (doneRef.current) return
      // Explosion
      spawnExplosion(app, x, y, hexColor)
      app.stage.removeChild(gfx)
      gfx.destroy()
      targetsRef.current.delete(id)
      scoreRef.current++
      setScore(scoreRef.current)
    })

    app.stage.addChild(gfx)
  }

  function spawnExplosion(app: PIXI.Application, x: number, y: number, color: number) {
    for (let i = 0; i < 8; i++) {
      const p = new PIXI.Graphics()
      p.beginFill(color, 0.9)
      p.drawCircle(0, 0, 4)
      p.endFill()
      p.position.set(x, y)
      const angle = (i / 8) * Math.PI * 2
      const speed = 3 + Math.random() * 4
      let vx = Math.cos(angle) * speed
      let vy = Math.sin(angle) * speed
      let life = 1
      app.stage.addChild(p)

      const tick = () => {
        life -= 0.06
        vx *= 0.92; vy *= 0.92
        p.x += vx; p.y += vy
        p.alpha = life
        if (life <= 0) {
          app.ticker.remove(tick)
          if (p.parent) p.parent.removeChild(p)
          p.destroy()
        }
      }
      app.ticker.add(tick)
    }
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

  const timerPct = timeLeft / GAME_DURATION

  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6"
        style={{ background: 'linear-gradient(160deg, #050510, #0a0a30, #100510)' }}>
        <div className="text-6xl mb-2">🎯</div>
        <p className="text-white font-black text-3xl tracking-wide">TIR DE GUN</p>
        <p className="text-white/50 text-sm text-center px-8">Tape sur les cibles pendant 15s !</p>
        <div className="mt-4 w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,215,0,0.15)', border: '3px solid rgba(255,215,0,0.5)' }}>
          <span key={countKey} className="countdown-number text-yellow-400 text-5xl font-black">{countdown}</span>
        </div>
      </div>
    )
  }

  if (finished) {
    const great = score >= 15
    const ok = score >= 8
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6"
        style={{ background: 'linear-gradient(160deg, #050510, #0a0a30, #100510)' }}>
        <div className="text-6xl">🎯</div>
        <p className={`font-black text-5xl ${great ? 'shimmer-text' : 'text-white'}`}>{score} hits</p>
        <div className="px-6 py-3 rounded-full bg-white/10 text-sm font-bold"
          style={{ color: great ? '#FFD700' : ok ? '#88ff99' : '#aaa' }}>
          {great ? 'Sniper de l\'année !' : ok ? 'Bon tireur !' : 'Pas mal !'}
        </div>
        <p className="text-white/30 text-xs mt-4">En attente des autres…</p>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="absolute inset-0" />
      {/* HUD */}
      <div className="absolute top-3 left-0 right-0 flex justify-between px-3 pointer-events-none">
        <div className="bg-black/70 backdrop-blur-sm rounded-2xl px-4 py-2 flex items-center gap-2 border border-white/10">
          <span className="text-lg">🎯</span>
          <span className="text-white font-black text-xl">{score}</span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="bg-black/70 backdrop-blur-sm rounded-2xl px-4 py-2 border border-white/10">
            <span className="font-bold tabular-nums"
              style={{ color: timerPct > 0.5 ? '#4ade80' : timerPct > 0.25 ? '#facc15' : '#f87171' }}>
              {(timeLeft / 1000).toFixed(1)}s
            </span>
          </div>
          <div className="w-28 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-100"
              style={{ width: `${timerPct * 100}%`,
                       background: timerPct > 0.5 ? '#4ade80' : timerPct > 0.25 ? '#facc15' : '#f87171' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

function hslToHex(h: number, s: number, l: number): number {
  s /= 100; l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
  }
  return (Math.round(f(0) * 255) << 16) | (Math.round(f(8) * 255) << 8) | Math.round(f(4) * 255)
}
