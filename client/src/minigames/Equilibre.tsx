import { useCallback, useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import type { MinigameComponentProps } from './MinigameRouter'
import type { IMinigameResult } from '../types/minigame.types'

const PLATFORM_W = 160
const PLATFORM_H = 14
const BALL_RADIUS = 13

export default function Equilibre({ players, myPlayerId, duration, onComplete }: MinigameComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<PIXI.Application | null>(null)
  const survivalRef = useRef(0)
  const startTimeRef = useRef(0)
  const [countdown, setCountdown] = useState(3)
  const [countKey, setCountKey] = useState(0)
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [gyroAvailable, setGyroAvailable] = useState(true)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [survivalDisplay, setSurvivalDisplay] = useState(0)
  const doneRef = useRef(false)

  useEffect(() => {
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      setGyroAvailable(false)
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); handleStart(); return 0 }
        setCountKey(k => k + 1)
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  async function handleStart() {
    if (typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function') {
      try {
        const perm = await (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission()
        if (perm !== 'granted') { setPermissionDenied(true); finish(0); return }
      } catch {
        setPermissionDenied(true); finish(0); return
      }
    }
    setStarted(true)
  }

  const initPixi = useCallback(() => {
    if (!containerRef.current || appRef.current) return
    const w = containerRef.current.clientWidth
    const h = containerRef.current.clientHeight

    const app = new PIXI.Application({
      width: w, height: h,
      backgroundColor: 0x050a18,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    })
    appRef.current = app
    containerRef.current.appendChild(app.view as HTMLCanvasElement)

    // Fond: dégradé simulé avec des couches
    const bgGrad = new PIXI.Graphics()
    bgGrad.beginFill(0x0a1020, 1)
    bgGrad.drawRect(0, 0, w, h)
    bgGrad.endFill()
    app.stage.addChild(bgGrad)

    // Grille subtile sol
    const floor = new PIXI.Graphics()
    floor.lineStyle(1, 0x223355, 0.2)
    for (let x = 0; x < w; x += 30) { floor.moveTo(x, h * 0.5); floor.lineTo(x, h) }
    floor.moveTo(0, h * 0.85); floor.lineTo(w, h * 0.85)
    app.stage.addChild(floor)

    // Plateau
    const platform = new PIXI.Graphics()
    platform.beginFill(0x3366cc)
    platform.drawRoundedRect(-PLATFORM_W / 2, -PLATFORM_H / 2, PLATFORM_W, PLATFORM_H, 6)
    platform.endFill()
    // Reflet sur le plateau
    platform.beginFill(0x88aaff, 0.25)
    platform.drawRoundedRect(-PLATFORM_W / 2 + 4, -PLATFORM_H / 2 + 2, PLATFORM_W - 8, 4, 2)
    platform.endFill()
    platform.position.set(w / 2, h * 0.65)
    app.stage.addChild(platform)

    // Balle
    const ball = new PIXI.Graphics()
    ball.beginFill(0xff3344)
    ball.drawCircle(0, 0, BALL_RADIUS)
    ball.endFill()
    // Reflet sur la balle
    ball.beginFill(0xff9999, 0.5)
    ball.drawCircle(-BALL_RADIUS * 0.3, -BALL_RADIUS * 0.35, BALL_RADIUS * 0.4)
    ball.endFill()
    ball.position.set(w / 2, h * 0.65 - PLATFORM_H / 2 - BALL_RADIUS)
    app.stage.addChild(ball)

    // Ombre balle
    const shadow = new PIXI.Graphics()
    shadow.beginFill(0x000000, 0.35)
    shadow.drawEllipse(0, 0, BALL_RADIUS + 4, 5)
    shadow.endFill()
    app.stage.addChild(shadow)

    let ballVX = 0
    let ballX = w / 2
    let ballY = ball.y
    let tiltX = 0

    function onOrientation(e: DeviceOrientationEvent) {
      tiltX = (e.gamma ?? 0) * 0.05
    }
    window.addEventListener('deviceorientation', onOrientation)
    startTimeRef.current = Date.now()

    // Survival timer display
    const survivalInterval = setInterval(() => {
      if (!doneRef.current) setSurvivalDisplay(Date.now() - startTimeRef.current)
    }, 100)

    app.ticker.add((delta) => {
      if (doneRef.current) return

      ballVX += tiltX * delta
      ballVX *= 0.92
      ballX += ballVX * delta

      const platformY = h * 0.65 - PLATFORM_H / 2 - BALL_RADIUS
      if (Math.abs(ballX - platform.x) < PLATFORM_W / 2 + BALL_RADIUS * 0.4) {
        ballY = platformY
        ballVX *= 0.98
      } else {
        ballY += 5 * delta
      }

      ball.position.set(ballX, ballY)
      shadow.position.set(ballX, platform.y - PLATFORM_H / 2 + 3)
      shadow.alpha = Math.max(0, 1 - (ballY - platformY) / (h * 0.2))
      platform.position.set(w / 2, h * 0.65)

      if (ballY > h + 20) {
        if (!doneRef.current) {
          doneRef.current = true
          clearInterval(survivalInterval)
          const survivalTime = Date.now() - startTimeRef.current
          survivalRef.current = survivalTime
          window.removeEventListener('deviceorientation', onOrientation)
          finish(survivalTime)
        }
      }
    })

    setTimeout(() => {
      if (!doneRef.current) {
        doneRef.current = true
        clearInterval(survivalInterval)
        const survivalTime = Date.now() - startTimeRef.current
        survivalRef.current = survivalTime
        window.removeEventListener('deviceorientation', onOrientation)
        finish(survivalTime)
      }
    }, duration)

    return () => {
      clearInterval(survivalInterval)
      window.removeEventListener('deviceorientation', onOrientation)
      app.destroy(true, { children: true })
      appRef.current = null
    }
  }, [duration])

  useEffect(() => {
    if (!started) return
    return initPixi()
  }, [started, initPixi])

  function finish(survivalMs: number) {
    setFinished(true)
    const results: IMinigameResult[] = players.map(p => ({
      playerId: p.id,
      score: p.id === myPlayerId ? survivalMs : 0,
    }))
    onComplete(results)
  }

  const BG = 'linear-gradient(160deg, #050a18, #0a1428, #050a18)'

  if (!gyroAvailable || permissionDenied) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-8" style={{ background: BG }}>
        <div className="text-6xl">📱</div>
        <p className="text-white font-black text-xl text-center">
          {permissionDenied ? 'Permission refusée' : 'Gyroscope indisponible'}
        </p>
        <p className="text-white/40 text-sm text-center">
          {permissionDenied ? 'Accès au gyroscope refusé.' : 'Connexion sécurisée requise (HTTPS).'}
        </p>
        <p className="text-white/30 text-xs">Score 0 attribué.</p>
      </div>
    )
  }

  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6" style={{ background: BG }}>
        <div className="text-6xl mb-2">⚖️</div>
        <p className="text-white font-black text-3xl tracking-wide">ÉQUILIBRE</p>
        <p className="text-white/50 text-sm text-center px-8">Garde la balle sur le plateau en penchant ton téléphone !</p>
        <div className="mt-4 w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,215,0,0.15)', border: '3px solid rgba(255,215,0,0.5)' }}>
          <span key={countKey} className="countdown-number text-yellow-400 text-5xl font-black">{countdown}</span>
        </div>
      </div>
    )
  }

  if (finished) {
    const secs = survivalRef.current / 1000
    const great = secs >= 20
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6" style={{ background: BG }}>
        <div className="text-6xl">{great ? '🏆' : secs >= 10 ? '⚖️' : '😅'}</div>
        <p className={`font-black text-5xl tabular-nums ${great ? 'shimmer-text' : 'text-white'}`}>
          {secs.toFixed(1)}s
        </p>
        <p className="text-white/40 text-sm">{great ? 'Maître de l\'équilibre !' : secs >= 10 ? 'Bien tenu !' : 'Chute !'}</p>
        <p className="text-white/30 text-xs mt-4">En attente des autres…</p>
      </div>
    )
  }

  const displaySecs = (survivalDisplay / 1000).toFixed(1)

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="absolute top-3 left-0 right-0 flex justify-between px-3 pointer-events-none">
        <div className="bg-black/70 backdrop-blur-sm rounded-2xl px-4 py-2 border border-white/10">
          <span className="text-white/50 text-xs">Survie </span>
          <span className="text-green-400 font-black tabular-nums">{displaySecs}s</span>
        </div>
        <div className="bg-black/70 backdrop-blur-sm rounded-2xl px-4 py-2 border border-white/10">
          <span className="text-white/40 text-xs">Penche le téléphone !</span>
        </div>
      </div>
    </div>
  )
}
