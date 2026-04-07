import { useCallback, useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import type { MinigameComponentProps } from './MinigameRouter'
import type { IMinigameResult } from '../types/minigame.types'

const CELL_SIZE = 40
const COLS = 11
const ROWS = 11
const FOG_RADIUS = 3

interface Maze {
  hWalls: boolean[][]
  vWalls: boolean[][]
}

function generateMaze(cols: number, rows: number, seed: string): Maze {
  let s = seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  function rand() {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
  const hWalls: boolean[][] = Array.from({ length: rows + 1 }, () => Array.from({ length: cols }, () => true))
  const vWalls: boolean[][] = Array.from({ length: rows }, () => Array.from({ length: cols + 1 }, () => true))
  const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false))

  function carve(cx: number, cy: number) {
    visited[cy][cx] = true
    const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]].sort(() => rand() - 0.5)
    for (const [dx, dy] of dirs) {
      const nx = cx + dx, ny = cy + dy
      if (nx < 0 || nx >= cols || ny < 0 || ny >= rows || visited[ny][nx]) continue
      if (dx === 1) vWalls[cy][cx + 1] = false
      else if (dx === -1) vWalls[cy][cx] = false
      else if (dy === 1) hWalls[cy + 1][cx] = false
      else if (dy === -1) hWalls[cy][cx] = false
      carve(nx, ny)
    }
  }
  carve(0, 0)
  return { hWalls, vWalls }
}

export default function Labyrinthe({ players, myPlayerId, duration, seed, onComplete }: MinigameComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<PIXI.Application | null>(null)
  const [countdown, setCountdown] = useState(3)
  const [countKey, setCountKey] = useState(0)
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const doneRef = useRef(false)
  const playerPosRef = useRef({ x: 0, y: 0 })
  const tryMoveRef = useRef<(dx: number, dy: number) => void>(() => {})
  const startTimeRef = useRef(0)
  const [steps, setSteps] = useState(0)
  const stepsRef = useRef(0)

  const exitX = Math.floor(COLS / 2)
  const exitY = Math.floor(ROWS / 2)

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

  const initPixi = useCallback(() => {
    if (!containerRef.current || appRef.current) return
    const screenW = containerRef.current.clientWidth
    const screenH = containerRef.current.clientHeight

    const app = new PIXI.Application({
      width: screenW, height: screenH,
      backgroundColor: 0x04080f,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    })
    appRef.current = app
    containerRef.current.appendChild(app.view as HTMLCanvasElement)

    const mazeSeed = seed || 'default'
    const { hWalls, vWalls } = generateMaze(COLS, ROWS, mazeSeed)

    const worldContainer = new PIXI.Container()
    app.stage.addChild(worldContainer)

    // Sol coloré par cellule (ambiance)
    const floorGfx = new PIXI.Graphics()
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const isExit = c === exitX && r === exitY
        floorGfx.beginFill(isExit ? 0x1a3000 : (r + c) % 2 === 0 ? 0x080c14 : 0x0a1018)
        floorGfx.drawRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE)
        floorGfx.endFill()
      }
    }
    worldContainer.addChild(floorGfx)

    // Murs du labyrinthe
    const mazeGfx = new PIXI.Graphics()
    mazeGfx.lineStyle(3, 0x2255aa, 0.9)
    for (let r = 0; r <= ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (hWalls[r]?.[c]) {
          mazeGfx.moveTo(c * CELL_SIZE, r * CELL_SIZE)
          mazeGfx.lineTo((c + 1) * CELL_SIZE, r * CELL_SIZE)
        }
      }
    }
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c <= COLS; c++) {
        if (vWalls[r]?.[c]) {
          mazeGfx.moveTo(c * CELL_SIZE, r * CELL_SIZE)
          mazeGfx.lineTo(c * CELL_SIZE, (r + 1) * CELL_SIZE)
        }
      }
    }
    worldContainer.addChild(mazeGfx)

    // Sortie (centre)
    const exitGfx = new PIXI.Graphics()
    exitGfx.beginFill(0xFFD700, 0.3)
    exitGfx.drawCircle(exitX * CELL_SIZE + CELL_SIZE / 2, exitY * CELL_SIZE + CELL_SIZE / 2, CELL_SIZE / 2 - 3)
    exitGfx.endFill()
    exitGfx.lineStyle(2, 0xFFD700, 0.8)
    exitGfx.drawCircle(exitX * CELL_SIZE + CELL_SIZE / 2, exitY * CELL_SIZE + CELL_SIZE / 2, CELL_SIZE / 2 - 3)
    worldContainer.addChild(exitGfx)

    const exitLabel = new PIXI.Text('🏁', { fontSize: 22 })
    exitLabel.anchor.set(0.5)
    exitLabel.position.set(exitX * CELL_SIZE + CELL_SIZE / 2, exitY * CELL_SIZE + CELL_SIZE / 2)
    worldContainer.addChild(exitLabel)

    // Joueur
    const myIndex = players.findIndex(p => p.id === myPlayerId)
    const spawns = [{ x: 0, y: 0 }, { x: COLS - 1, y: 0 }, { x: 0, y: ROWS - 1 }, { x: COLS - 1, y: ROWS - 1 }]
    const spawn = spawns[myIndex % spawns.length]
    playerPosRef.current = { ...spawn }

    const playerGfx = new PIXI.Graphics()
    // Corps
    playerGfx.beginFill(0xff3355)
    playerGfx.drawCircle(0, 0, 11)
    playerGfx.endFill()
    // Reflet
    playerGfx.beginFill(0xff9999, 0.4)
    playerGfx.drawCircle(-3, -4, 5)
    playerGfx.endFill()
    // Anneau
    playerGfx.lineStyle(2, 0xffffff, 0.5)
    playerGfx.drawCircle(0, 0, 11)
    worldContainer.addChild(playerGfx)

    // Trail du joueur
    const trailGfx = new PIXI.Graphics()
    worldContainer.addChildAt(trailGfx, worldContainer.children.indexOf(floorGfx) + 1)

    const fogGfx = new PIXI.Graphics()
    app.stage.addChild(fogGfx)

    const trailPoints: { x: number; y: number; alpha: number }[] = []

    function updateView() {
      const { x, y } = playerPosRef.current
      const px = x * CELL_SIZE + CELL_SIZE / 2
      const py = y * CELL_SIZE + CELL_SIZE / 2
      playerGfx.position.set(px, py)

      // Trail
      trailPoints.push({ x: px, y: py, alpha: 0.35 })
      if (trailPoints.length > 30) trailPoints.shift()
      trailGfx.clear()
      trailPoints.forEach((pt, i) => {
        trailGfx.beginFill(0xff3355, pt.alpha * (i / trailPoints.length))
        trailGfx.drawCircle(pt.x, pt.y, 5 * (i / trailPoints.length))
        trailGfx.endFill()
      })

      worldContainer.position.set(screenW / 2 - px, screenH / 2 - py)

      // Fog of war
      fogGfx.clear()
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const dist = Math.abs(c - x) + Math.abs(r - y)
          if (dist > FOG_RADIUS) {
            const alpha = Math.min(0.95, 0.7 + (dist - FOG_RADIUS) * 0.1)
            fogGfx.beginFill(0x000000, alpha)
            fogGfx.drawRect(
              c * CELL_SIZE + worldContainer.x,
              r * CELL_SIZE + worldContainer.y,
              CELL_SIZE, CELL_SIZE,
            )
            fogGfx.endFill()
          }
        }
      }
    }

    function canMove(cx: number, cy: number, dx: number, dy: number): boolean {
      if (dx === 1) return !vWalls[cy]?.[cx + 1]
      if (dx === -1) return !vWalls[cy]?.[cx]
      if (dy === 1) return !hWalls[cy + 1]?.[cx]
      if (dy === -1) return !hWalls[cy]?.[cx]
      return false
    }

    function tryMove(dx: number, dy: number) {
      if (doneRef.current) return
      const { x, y } = playerPosRef.current
      const nx = x + dx, ny = y + dy
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return
      if (!canMove(x, y, dx, dy)) return
      playerPosRef.current = { x: nx, y: ny }
      stepsRef.current++
      setSteps(stepsRef.current)
      updateView()

      if (nx === exitX && ny === exitY && !doneRef.current) {
        doneRef.current = true
        const elapsed = Date.now() - startTimeRef.current
        const score = Math.max(0, duration - elapsed)
        finishGame(score)
      }
    }

    tryMoveRef.current = tryMove
    startTimeRef.current = Date.now()
    updateView()

    let touchStartX = 0, touchStartY = 0
    const canvas = app.view as HTMLCanvasElement
    canvas.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY }, { passive: true })
    canvas.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - touchStartX
      const dy = e.changedTouches[0].clientY - touchStartY
      if (Math.abs(dx) > Math.abs(dy)) tryMove(dx > 0 ? 1 : -1, 0)
      else tryMove(0, dy > 0 ? 1 : -1)
    }, { passive: true })

    const endTimer = setTimeout(() => {
      if (!doneRef.current) {
        doneRef.current = true
        const { x, y } = playerPosRef.current
        const dist = Math.abs(x - exitX) + Math.abs(y - exitY)
        finishGame(Math.max(0, 500 - dist * 30))
      }
    }, duration)

    function finishGame(score: number) {
      setFinished(true)
      const results: IMinigameResult[] = players.map(p => ({
        playerId: p.id,
        score: p.id === myPlayerId ? score : 0,
      }))
      onComplete(results)
    }

    return () => {
      clearTimeout(endTimer)
      app.destroy(true, { children: true })
      appRef.current = null
    }
  }, [seed, players, myPlayerId, duration, onComplete, exitX, exitY])

  useEffect(() => {
    if (!started) return
    return initPixi()
  }, [started, initPixi])

  const BG = 'linear-gradient(160deg, #04080f, #080c18, #04080f)'

  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6" style={{ background: BG }}>
        <div className="text-6xl mb-2">🌀</div>
        <p className="text-white font-black text-3xl tracking-wide">LABYRINTHE</p>
        <p className="text-white/50 text-sm text-center px-8">Atteins le centre 🏁 ! Swipe ou boutons directionnels.</p>
        <div className="bg-white/10 rounded-xl px-4 py-2 text-white/40 text-xs text-center border border-white/10">
          Attention au brouillard de guerre !
        </div>
        <div className="mt-2 w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,215,0,0.15)', border: '3px solid rgba(255,215,0,0.5)' }}>
          <span key={countKey} className="countdown-number text-yellow-400 text-5xl font-black">{countdown}</span>
        </div>
      </div>
    )
  }

  if (finished) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4" style={{ background: BG }}>
        <div className="text-6xl">🌀</div>
        <p className="text-white font-black text-2xl">Terminé !</p>
        <p className="text-white/40 text-sm">{stepsRef.current} déplacements</p>
        <p className="text-white/30 text-xs mt-4">En attente des autres…</p>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="absolute inset-0" />
      {/* Boutons directionnels */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 grid grid-cols-3 gap-2">
        <div />
        <button
          className="w-14 h-14 rounded-2xl text-2xl font-black active:scale-90 transition-transform"
          style={{ background: 'rgba(51,102,204,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(100,150,255,0.4)' }}
          onClick={() => tryMoveRef.current(0, -1)}>↑</button>
        <div />
        <button
          className="w-14 h-14 rounded-2xl text-2xl font-black active:scale-90 transition-transform"
          style={{ background: 'rgba(51,102,204,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(100,150,255,0.4)' }}
          onClick={() => tryMoveRef.current(-1, 0)}>←</button>
        <button
          className="w-14 h-14 rounded-2xl text-2xl font-black active:scale-90 transition-transform"
          style={{ background: 'rgba(51,102,204,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(100,150,255,0.4)' }}
          onClick={() => tryMoveRef.current(0, 1)}>↓</button>
        <button
          className="w-14 h-14 rounded-2xl text-2xl font-black active:scale-90 transition-transform"
          style={{ background: 'rgba(51,102,204,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(100,150,255,0.4)' }}
          onClick={() => tryMoveRef.current(1, 0)}>→</button>
      </div>
      {/* Steps counter */}
      <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm rounded-2xl px-3 py-2 border border-white/10 pointer-events-none">
        <span className="text-white/50 text-xs">Pas : </span>
        <span className="text-blue-400 font-black">{steps}</span>
      </div>
    </div>
  )
}
