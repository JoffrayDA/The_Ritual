import { useCallback, useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import type { MinigameComponentProps } from './MinigameRouter'
import type { IMinigameResult } from '../types/minigame.types'

const MAX_SHOTS = 5
const TARGET_RADIUS = 32

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
  const [countKey, setCountKey] = useState(0)
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [lastPts, setLastPts] = useState<number | null>(null)
  const doneRef = useRef(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); setStarted(true); return 0 }
        setCountKey(k => k + 1)
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
      backgroundColor: 0x050a10,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    })
    appRef.current = app
    containerRef.current.appendChild(app.view as HTMLCanvasElement)

    // Fond étoilé
    const stars = new PIXI.Graphics()
    for (let i = 0; i < 60; i++) {
      const alpha = Math.random() * 0.4 + 0.1
      stars.beginFill(0xffffff, alpha)
      stars.drawCircle(Math.random() * w, Math.random() * h, Math.random() * 1.2 + 0.3)
      stars.endFill()
    }
    app.stage.addChild(stars)

    // Cercles de visée déco
    const decoRings = new PIXI.Graphics()
    decoRings.lineStyle(1, 0x224466, 0.25)
    for (let r = 60; r < Math.max(w, h); r += 60) {
      decoRings.drawCircle(w / 2, h / 2, r)
    }
    app.stage.addChild(decoRings)

    const speed = 3.5
    const angle = Math.random() * Math.PI * 2
    const target = { x: w / 2, y: h / 2, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed }
    targetRef.current = target

    const gfx = new PIXI.Graphics()
    gfxRef.current = gfx
    app.stage.addChild(gfx)

    // Zone de tap
    const hitArea = new PIXI.Graphics()
    hitArea.beginFill(0x000000, 0.001)
    hitArea.drawRect(0, 0, w, h)
    hitArea.endFill()
    hitArea.interactive = true

    hitArea.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
      if (doneRef.current || shotsLeftRef.current <= 0) return
      const pos = e.getLocalPosition(app.stage)
      const dx = pos.x - target.x
      const dy = pos.y - target.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const pts = Math.max(0, Math.round(100 - dist))
      totalScoreRef.current += pts
      setTotalScore(totalScoreRef.current)
      setLastPts(pts)
      setTimeout(() => setLastPts(null), 800)
      shotsLeftRef.current--
      setShotsLeft(shotsLeftRef.current)

      // Flash hit avec couleur selon qualité
      const flashColor = pts >= 80 ? 0xFFD700 : pts >= 50 ? 0x22FF88 : pts >= 20 ? 0xFF8844 : 0xFF4444
      const flash = new PIXI.Graphics()
      // Anneau flash
      flash.lineStyle(3, flashColor, 1)
      flash.drawCircle(pos.x, pos.y, 20)
      // Centre
      flash.beginFill(flashColor, 0.7)
      flash.drawCircle(pos.x, pos.y, 8)
      flash.endFill()
      app.stage.addChild(flash)

      let flashLife = 1
      const flashTick = () => {
        flashLife -= 0.08
        flash.alpha = flashLife
        flash.scale.set(1 + (1 - flashLife) * 1.5)
        if (flashLife <= 0) {
          app.ticker.remove(flashTick)
          if (flash.parent) flash.parent.removeChild(flash)
          flash.destroy()
        }
      }
      app.ticker.add(flashTick)

      if (shotsLeftRef.current <= 0 && !doneRef.current) {
        doneRef.current = true
        setTimeout(() => finish(), 600)
      }
    })
    app.stage.addChild(hitArea)

    let time = 0
    app.ticker.add((delta) => {
      time += delta
      target.x += target.vx
      target.y += target.vy
      if (target.x < TARGET_RADIUS || target.x > app.screen.width - TARGET_RADIUS) target.vx *= -1
      if (target.y < TARGET_RADIUS || target.y > app.screen.height - TARGET_RADIUS) target.vy *= -1

      gfx.clear()
      // Halo externe pulsant
      const pulse = 0.08 + Math.sin(time * 0.1) * 0.04
      gfx.beginFill(0x4488FF, pulse)
      gfx.drawCircle(target.x, target.y, TARGET_RADIUS + 14)
      gfx.endFill()

      // Cercles concentriques (cible)
      const colors = [0x1a1a4a, 0x3355aa, 0xffffff, 0xff2244]
      const radii  = [TARGET_RADIUS, TARGET_RADIUS * 0.7, TARGET_RADIUS * 0.45, TARGET_RADIUS * 0.2]
      for (let i = 0; i < 4; i++) {
        gfx.beginFill(colors[i])
        gfx.drawCircle(target.x, target.y, radii[i])
        gfx.endFill()
      }
      // Lignes de visée
      gfx.lineStyle(1.5, 0xffffff, 0.4)
      gfx.moveTo(target.x - TARGET_RADIUS - 15, target.y)
      gfx.lineTo(target.x + TARGET_RADIUS + 15, target.y)
      gfx.moveTo(target.x, target.y - TARGET_RADIUS - 15)
      gfx.lineTo(target.x, target.y + TARGET_RADIUS + 15)
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
      <div className="flex flex-col items-center justify-center h-full gap-6"
        style={{ background: 'linear-gradient(160deg, #050a10, #0a1020, #100510)' }}>
        <div className="text-6xl mb-2">🎯</div>
        <p className="text-white font-black text-3xl tracking-wide">CIBLE MOUVANTE</p>
        <div className="bg-white/10 rounded-2xl px-8 py-3 text-center border border-white/20">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-1">{MAX_SHOTS} tirs · Vise le centre !</p>
          <p className="text-yellow-400 font-bold text-lg">Centre = 100 pts</p>
        </div>
        <div className="mt-2 w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,215,0,0.15)', border: '3px solid rgba(255,215,0,0.5)' }}>
          <span key={countKey} className="countdown-number text-yellow-400 text-5xl font-black">{countdown}</span>
        </div>
      </div>
    )
  }

  if (finished) {
    const maxPts = MAX_SHOTS * 100
    const pct = totalScoreRef.current / maxPts
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6"
        style={{ background: 'linear-gradient(160deg, #050a10, #0a1020, #100510)' }}>
        <div className="text-6xl">{pct >= 0.8 ? '🏆' : pct >= 0.5 ? '🎯' : '😅'}</div>
        <p className={`font-black text-5xl ${pct >= 0.8 ? 'shimmer-text' : 'text-white'}`}>
          {totalScoreRef.current} pts
        </p>
        <div className="w-48 h-3 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, background: 'linear-gradient(90deg, #6366f1, #FFD700)' }} />
        </div>
        <p className="text-white/40 text-sm">{Math.round(pct * 100)}% de précision</p>
        <p className="text-white/30 text-xs mt-2">En attente des autres…</p>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="absolute inset-0" />

      {/* Points flottants */}
      {lastPts !== null && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="font-black text-4xl"
            style={{
              color: lastPts >= 80 ? '#FFD700' : lastPts >= 50 ? '#22FF88' : lastPts >= 20 ? '#FF8844' : '#FF4444',
              animation: 'float-up 0.8s ease-out forwards',
              textShadow: '0 2px 10px rgba(0,0,0,0.8)',
            }}>
            +{lastPts}
          </p>
        </div>
      )}

      <div className="absolute top-3 left-0 right-0 flex justify-between px-3 pointer-events-none">
        {/* Tirs restants */}
        <div className="bg-black/70 backdrop-blur-sm rounded-2xl px-4 py-2 border border-white/10 flex items-center gap-2">
          <span className="text-sm">💥</span>
          <div className="flex gap-1">
            {Array.from({ length: MAX_SHOTS }).map((_, i) => (
              <div key={i} className="w-3 h-3 rounded-full"
                style={{ background: i < shotsLeft ? '#ef4444' : 'rgba(255,255,255,0.15)' }} />
            ))}
          </div>
        </div>
        {/* Score */}
        <div className="bg-black/70 backdrop-blur-sm rounded-2xl px-4 py-2 border border-white/10">
          <span className="text-yellow-400 font-black text-xl tabular-nums">{totalScore}</span>
          <span className="text-white/40 text-xs ml-1">pts</span>
        </div>
      </div>
    </div>
  )
}
