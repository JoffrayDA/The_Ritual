import { useCallback, useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import type { MinigameComponentProps } from './MinigameRouter'
import type { IMinigameResult } from '../types/minigame.types'

const PLAYER_COLORS_HEX = [0x6C63FF, 0xFF6B6B, 0x4ECDC4, 0xFFE66D, 0xFF9F43, 0xA29BFE, 0xFD79A8, 0x00B894]
const GAME_DURATION = 60000
const PLAYER_SPEED = 3
const TRAIL_SIZE = 8
const BULLET_SPEED = 6
const RESPAWN_DELAY = 5000

interface PlayerState {
  x: number; y: number; vx: number; vy: number
  alive: boolean; colorIndex: number
  gfx: PIXI.Graphics
  trailTexture: PIXI.RenderTexture
  trailSprite: PIXI.Sprite
  bullets: BulletState[]
  respawnTimer: number
}

interface BulletState {
  x: number; y: number; vx: number; vy: number
  gfx: PIXI.Graphics; ownerId: string
}

function getMapSize(playerCount: number): number {
  if (playerCount <= 4) return 600
  if (playerCount <= 6) return 800
  return 1000
}

export default function PeintureBattle({ players, myPlayerId, duration, onComplete }: MinigameComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<PIXI.Application | null>(null)
  const [countdown, setCountdown] = useState(3)
  const [started, setStarted] = useState(false)
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION)
  const [finished, setFinished] = useState(false)
  const doneRef = useRef(false)
  const joystickRef = useRef({ x: 0, y: 0, active: false })
  const myIndexRef = useRef(players.findIndex(p => p.id === myPlayerId))

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
    if (!started || finished) return
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev - 100
        if (next <= 0) { clearInterval(interval); return 0 }
        return next
      })
    }, 100)
    return () => clearInterval(interval)
  }, [started, finished])

  const initPixi = useCallback(() => {
    if (!containerRef.current || appRef.current) return
    const screenW = containerRef.current.clientWidth
    const screenH = containerRef.current.clientHeight
    const mapSize = getMapSize(players.length)

    const app = new PIXI.Application({
      width: screenW, height: screenH,
      backgroundColor: 0x222233,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    })
    appRef.current = app
    containerRef.current.appendChild(app.view as HTMLCanvasElement)

    const worldContainer = new PIXI.Container()
    app.stage.addChild(worldContainer)

    const playerStates = new Map<string, PlayerState>()
    const myIndex = myIndexRef.current

    // Spawn les joueurs aux coins
    const spawnPositions = [
      { x: 50, y: 50 }, { x: mapSize - 50, y: 50 },
      { x: 50, y: mapSize - 50 }, { x: mapSize - 50, y: mapSize - 50 },
      { x: mapSize / 2, y: 50 }, { x: mapSize / 2, y: mapSize - 50 },
      { x: 50, y: mapSize / 2 }, { x: mapSize - 50, y: mapSize / 2 },
    ]

    players.forEach((player, i) => {
      const spawn = spawnPositions[i % spawnPositions.length]
      const colorIndex = i % PLAYER_COLORS_HEX.length
      const color = PLAYER_COLORS_HEX[colorIndex]

      // Texture de trail (peinture)
      const trailTexture = PIXI.RenderTexture.create({ width: mapSize, height: mapSize })
      const trailSprite = new PIXI.Sprite(trailTexture)
      worldContainer.addChild(trailSprite)

      const gfx = new PIXI.Graphics()
      gfx.beginFill(color)
      gfx.drawCircle(0, 0, 10)
      gfx.endFill()
      // Indicateur joueur courant
      if (player.id === myPlayerId) {
        gfx.lineStyle(3, 0xFFFFFF, 0.8)
        gfx.drawCircle(0, 0, 13)
      }
      gfx.position.set(spawn.x, spawn.y)
      worldContainer.addChild(gfx)

      const state: PlayerState = {
        x: spawn.x, y: spawn.y, vx: 0, vy: 0,
        alive: true, colorIndex,
        gfx, trailTexture, trailSprite,
        bullets: [], respawnTimer: 0,
      }
      playerStates.set(player.id, state)
    })

    // Timer de fin
    const endTimer = setTimeout(() => {
      if (!doneRef.current) {
        doneRef.current = true
        finishGame(app, myPlayerId, myIndex, mapSize, playerStates, players, onComplete, setFinished)
      }
    }, duration)

    // Shoot automatique (toutes les 500ms si en mouvement)
    const shootInterval = setInterval(() => {
      const me = playerStates.get(myPlayerId)
      if (!me || !me.alive) return
      const speed = Math.sqrt(me.vx * me.vx + me.vy * me.vy)
      if (speed < 0.5) return

      const bvx = (me.vx / speed) * BULLET_SPEED
      const bvy = (me.vy / speed) * BULLET_SPEED
      const bulletGfx = new PIXI.Graphics()
      bulletGfx.beginFill(PLAYER_COLORS_HEX[me.colorIndex])
      bulletGfx.drawCircle(0, 0, 5)
      bulletGfx.endFill()
      bulletGfx.position.set(me.x, me.y)
      worldContainer.addChild(bulletGfx)
      me.bullets.push({ x: me.x, y: me.y, vx: bvx, vy: bvy, gfx: bulletGfx, ownerId: myPlayerId })
    }, 500)

    app.ticker.add((delta) => {
      const me = playerStates.get(myPlayerId)
      if (!me) return

      // Mouvement joueur local
      if (me.alive) {
        const jx = joystickRef.current.x
        const jy = joystickRef.current.y
        me.vx = jx * PLAYER_SPEED
        me.vy = jy * PLAYER_SPEED
        me.x = Math.max(10, Math.min(mapSize - 10, me.x + me.vx * delta))
        me.y = Math.max(10, Math.min(mapSize - 10, me.y + me.vy * delta))
        me.gfx.position.set(me.x, me.y)

        // Dessiner le trail
        const trailGfx = new PIXI.Graphics()
        trailGfx.beginFill(PLAYER_COLORS_HEX[me.colorIndex])
        trailGfx.drawCircle(me.x, me.y, TRAIL_SIZE)
        trailGfx.endFill()
        app.renderer.render(trailGfx, { renderTexture: me.trailTexture, clear: false })
        trailGfx.destroy()
      } else {
        me.respawnTimer -= delta * (1000 / 60)
        if (me.respawnTimer <= 0) {
          const spawn = spawnPositions[myIndex % spawnPositions.length]
          me.x = spawn.x; me.y = spawn.y
          me.alive = true
          me.gfx.visible = true
        }
      }

      // Bullets
      me.bullets = me.bullets.filter(bullet => {
        bullet.x += bullet.vx * delta
        bullet.y += bullet.vy * delta
        bullet.gfx.position.set(bullet.x, bullet.y)

        // Sortie map
        if (bullet.x < 0 || bullet.x > mapSize || bullet.y < 0 || bullet.y > mapSize) {
          worldContainer.removeChild(bullet.gfx)
          bullet.gfx.destroy()
          return false
        }

        // Collision avec autres joueurs
        for (const [pid, pstate] of playerStates) {
          if (pid === myPlayerId || !pstate.alive) continue
          const dx = bullet.x - pstate.x
          const dy = bullet.y - pstate.y
          if (dx * dx + dy * dy < 20 * 20) {
            // Hit !
            pstate.alive = false
            pstate.gfx.visible = false
            pstate.respawnTimer = RESPAWN_DELAY
            worldContainer.removeChild(bullet.gfx)
            bullet.gfx.destroy()
            return false
          }
        }
        return true
      })

      // Camera follow
      const camX = Math.max(0, Math.min(mapSize - screenW, me.x - screenW / 2))
      const camY = Math.max(0, Math.min(mapSize - screenH, me.y - screenH / 2))
      worldContainer.position.set(-camX, -camY)
    })

    return () => {
      clearTimeout(endTimer)
      clearInterval(shootInterval)
      app.destroy(true, { children: true })
      appRef.current = null
    }
  }, [players, myPlayerId, duration, onComplete])

  useEffect(() => {
    if (!started) return
    return initPixi()
  }, [started, initPixi])

  function handleJoystickStart(e: React.TouchEvent | React.MouseEvent) {
    joystickRef.current.active = true
    const pos = 'touches' in e ? e.touches[0] : e
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    joystickRef.current.x = Math.max(-1, Math.min(1, (pos.clientX - cx) / (rect.width / 2)))
    joystickRef.current.y = Math.max(-1, Math.min(1, (pos.clientY - cy) / (rect.height / 2)))
  }

  function handleJoystickMove(e: React.TouchEvent | React.MouseEvent) {
    if (!joystickRef.current.active) return
    const pos = 'touches' in e ? e.touches[0] : e
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    joystickRef.current.x = Math.max(-1, Math.min(1, (pos.clientX - cx) / (rect.width / 2)))
    joystickRef.current.y = Math.max(-1, Math.min(1, (pos.clientY - cy) / (rect.height / 2)))
  }

  function handleJoystickEnd() {
    joystickRef.current = { x: 0, y: 0, active: false }
  }

  const myColor = PLAYER_COLORS_HEX[myIndexRef.current % PLAYER_COLORS_HEX.length]
  const myColorCSS = `#${myColor.toString(16).padStart(6, '0')}`
  const timerPct = timeLeft / GAME_DURATION

  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6"
        style={{ background: 'linear-gradient(160deg, #0a0818, #18080a, #080a18)' }}>
        <div className="text-6xl mb-2">🎨</div>
        <p className="text-white font-black text-3xl tracking-wide">PEINTURE BATTLE</p>
        <div className="flex gap-3 mt-1">
          {PLAYER_COLORS_HEX.slice(0, players.length).map((c, i) => (
            <div key={i} className="w-6 h-6 rounded-full"
              style={{ background: `#${c.toString(16).padStart(6, '0')}`,
                       boxShadow: `0 0 10px #${c.toString(16).padStart(6, '0')}88` }} />
          ))}
        </div>
        <p className="text-white/50 text-sm text-center px-8">Couvre le plus de terrain avec ta couleur !</p>
        <div className="mt-2 w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,215,0,0.15)', border: '3px solid rgba(255,215,0,0.5)' }}>
          <span className="countdown-number text-yellow-400 text-5xl font-black">{countdown}</span>
        </div>
      </div>
    )
  }

  if (finished) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4"
        style={{ background: 'linear-gradient(160deg, #0a0818, #18080a, #080a18)' }}>
        <div className="text-6xl">🎨</div>
        <p className="text-white font-black text-2xl">Calcul du score…</p>
        <div className="w-8 h-8 rounded-full animate-spin border-2 border-white/20 border-t-white/80 mt-2" />
        <p className="text-white/30 text-xs mt-2">En attente des autres…</p>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="absolute inset-0" />
      {/* Timer bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 pointer-events-none">
        <div className="h-full transition-all duration-100"
          style={{
            width: `${timerPct * 100}%`,
            background: timerPct > 0.5 ? '#4ade80' : timerPct > 0.25 ? '#facc15' : '#f87171',
          }} />
      </div>
      {/* HUD */}
      <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm rounded-2xl px-4 py-2 border border-white/10 pointer-events-none">
        <span className="font-black tabular-nums"
          style={{ color: timerPct > 0.5 ? '#4ade80' : timerPct > 0.25 ? '#facc15' : '#f87171' }}>
          {(timeLeft / 1000).toFixed(0)}s
        </span>
      </div>
      {/* Couleur du joueur */}
      <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm rounded-2xl px-3 py-2 border border-white/10 pointer-events-none flex items-center gap-2">
        <div className="w-4 h-4 rounded-full" style={{ background: myColorCSS, boxShadow: `0 0 8px ${myColorCSS}` }} />
        <span className="text-white/60 text-xs">Toi</span>
      </div>
      {/* Joystick */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 w-36 h-36 rounded-full select-none touch-none"
        style={{
          background: 'rgba(0,0,0,0.5)',
          border: `2px solid ${myColorCSS}55`,
          backdropFilter: 'blur(8px)',
          boxShadow: `0 0 20px ${myColorCSS}33`,
        }}
        onTouchStart={handleJoystickStart as unknown as React.TouchEventHandler}
        onTouchMove={handleJoystickMove as unknown as React.TouchEventHandler}
        onTouchEnd={handleJoystickEnd}
        onMouseDown={handleJoystickStart as unknown as React.MouseEventHandler}
        onMouseMove={handleJoystickMove as unknown as React.MouseEventHandler}
        onMouseUp={handleJoystickEnd}
      >
        <div className="flex items-center justify-center h-full">
          <div className="w-12 h-12 rounded-full"
            style={{ background: myColorCSS, boxShadow: `0 0 15px ${myColorCSS}88`, opacity: 0.8 }} />
        </div>
      </div>
    </div>
  )
}

function finishGame(
  app: PIXI.Application,
  myPlayerId: string,
  _myIndex: number,
  mapSize: number,
  playerStates: Map<string, PlayerState>,
  players: MinigameComponentProps['players'],
  onComplete: MinigameComponentProps['onComplete'],
  setFinished: (v: boolean) => void,
) {
  setFinished(true)

  // Calculer la surface couverte par extraction de pixels
  const me = playerStates.get(myPlayerId)
  let score = 0

  if (me) {
    try {
      const pixels = app.renderer.extract.pixels(me.trailSprite)
      let colored = 0
      const total = mapSize * mapSize
      for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] > 50) colored++ // canal alpha > 50
      }
      const coverage = colored / total
      score = Math.round(coverage * 100 * 100) // score = coverage% * 100
    } catch {
      score = 0
    }
  }

  const results: IMinigameResult[] = players.map(p => ({
    playerId: p.id,
    score: p.id === myPlayerId ? score : 0,
  }))
  onComplete(results)
}
