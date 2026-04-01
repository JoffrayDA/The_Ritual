import { useCallback, useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import type { MinigameComponentProps } from './MinigameRouter'
import type { IMinigameResult } from '../types/minigame.types'

const GAME_DURATION = 30000
const PLATFORM_W = 160
const PLATFORM_H = 16
const BALL_RADIUS = 12

export default function Equilibre({ players, myPlayerId, duration, onComplete }: MinigameComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<PIXI.Application | null>(null)
  const survivalRef = useRef(0)
  const startTimeRef = useRef(0)
  const [countdown, setCountdown] = useState(3)
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [gyroAvailable, setGyroAvailable] = useState(true)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const doneRef = useRef(false)

  useEffect(() => {
    // Check HTTPS pour gyroscope
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      setGyroAvailable(false)
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); handleStart(); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  async function handleStart() {
    // iOS 13+ permission
    if (typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function') {
      try {
        const perm = await (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission()
        if (perm !== 'granted') {
          setPermissionDenied(true)
          finish(0)
          return
        }
      } catch {
        setPermissionDenied(true)
        finish(0)
        return
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
      backgroundColor: 0x111122,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    })
    appRef.current = app
    containerRef.current.appendChild(app.view as HTMLCanvasElement)

    // Plateau
    const platform = new PIXI.Graphics()
    platform.beginFill(0x4488FF)
    platform.drawRoundedRect(-PLATFORM_W / 2, -PLATFORM_H / 2, PLATFORM_W, PLATFORM_H, 4)
    platform.endFill()
    platform.position.set(w / 2, h * 0.65)
    app.stage.addChild(platform)

    // Balle
    const ball = new PIXI.Graphics()
    ball.beginFill(0xFF4444)
    ball.drawCircle(0, 0, BALL_RADIUS)
    ball.endFill()
    ball.position.set(w / 2, h * 0.65 - PLATFORM_H / 2 - BALL_RADIUS)
    app.stage.addChild(ball)

    let ballVX = 0
    let ballX = w / 2
    let ballY = ball.y
    let tiltX = 0 // gamma (-90 à 90)

    function onOrientation(e: DeviceOrientationEvent) {
      tiltX = (e.gamma ?? 0) * 0.05
    }
    window.addEventListener('deviceorientation', onOrientation)

    startTimeRef.current = Date.now()

    app.ticker.add((delta) => {
      if (doneRef.current) return

      // Physique balle
      ballVX += tiltX * delta
      ballVX *= 0.92 // friction
      ballX += ballVX * delta

      // Gravité vers le bas
      const platformY = h * 0.65 - PLATFORM_H / 2 - BALL_RADIUS
      if (Math.abs(ballX - platform.x) < PLATFORM_W / 2 + BALL_RADIUS * 0.5) {
        ballY = platformY
        // Amortissement
        ballVX *= 0.98
      } else {
        ballY += 4 * delta
      }

      ball.position.set(ballX, ballY)
      platform.position.set(w / 2, h * 0.65)

      // Mort si la balle sort de l'écran
      if (ballY > h + 20) {
        if (!doneRef.current) {
          doneRef.current = true
          const survivalTime = Date.now() - startTimeRef.current
          survivalRef.current = survivalTime
          window.removeEventListener('deviceorientation', onOrientation)
          finish(survivalTime)
        }
      }
    })

    // Timeout global
    setTimeout(() => {
      if (!doneRef.current) {
        doneRef.current = true
        const survivalTime = Date.now() - startTimeRef.current
        survivalRef.current = survivalTime
        window.removeEventListener('deviceorientation', onOrientation)
        finish(survivalTime)
      }
    }, duration)

    return () => {
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

  if (!gyroAvailable || permissionDenied) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-950 gap-4 px-8">
        <p className="text-4xl">📱</p>
        <p className="text-white font-bold text-xl text-center">
          {permissionDenied ? 'Permission refusée' : 'Gyroscope indisponible'}
        </p>
        <p className="text-white/50 text-sm text-center">
          {permissionDenied ? 'Accès au gyroscope refusé.' : 'Connexion sécurisée requise (HTTPS).'}
        </p>
        <p className="text-white/40 text-sm">Score 0 attribué.</p>
      </div>
    )
  }

  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-950 gap-4">
        <p className="text-white font-bold text-2xl">Équilibre ⚖️</p>
        <p className="text-white/60 text-sm text-center px-8">Garde la balle sur le plateau en penchant ton téléphone !</p>
        <p className="text-yellow-400 text-5xl font-bold">{countdown}</p>
      </div>
    )
  }

  if (finished) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-950 gap-4">
        <p className="text-4xl">⚖️</p>
        <p className="text-white font-bold text-2xl">{(survivalRef.current / 1000).toFixed(1)}s</p>
        <p className="text-white/40 text-sm">En attente des autres…</p>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="absolute top-3 left-0 right-0 flex justify-center pointer-events-none">
        <span className="bg-black/60 rounded-xl px-3 py-1 text-white text-sm">
          Penche ton téléphone pour garder la balle !
        </span>
      </div>
    </div>
  )
}
