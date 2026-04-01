import { useCallback, useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import type { MinigameComponentProps } from './MinigameRouter'
import type { IMinigameResult } from '../types/minigame.types'

const CELL_SIZE = 40
const COLS = 11
const ROWS = 11
const FOG_RADIUS = 3

interface Maze {
  // hWalls[r][c] = true → mur horizontal entre la ligne r-1 et r (au-dessus de la cellule r,c)
  hWalls: boolean[][]
  // vWalls[r][c] = true → mur vertical à gauche de la cellule r,c
  vWalls: boolean[][]
}

function generateMaze(cols: number, rows: number, seed: string): Maze {
  let s = seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  function rand() {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }

  // hWalls[r][c]: mur au-dessus de (r,c) — initié à true sauf bords
  const hWalls: boolean[][] = Array.from({ length: rows + 1 }, (_, r) =>
    Array.from({ length: cols }, () => true)
  )
  // vWalls[r][c]: mur à gauche de (r,c) — initié à true sauf bords
  const vWalls: boolean[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols + 1 }, () => true)
  )
  const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false))

  function carve(cx: number, cy: number) {
    visited[cy][cx] = true
    const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]].sort(() => rand() - 0.5)
    for (const [dx, dy] of dirs) {
      const nx = cx + dx, ny = cy + dy
      if (nx < 0 || nx >= cols || ny < 0 || ny >= rows || visited[ny][nx]) continue
      if (dx === 1) vWalls[cy][cx + 1] = false      // passage vers la droite
      else if (dx === -1) vWalls[cy][cx] = false    // passage vers la gauche
      else if (dy === 1) hWalls[cy + 1][cx] = false // passage vers le bas
      else if (dy === -1) hWalls[cy][cx] = false    // passage vers le haut
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
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const doneRef = useRef(false)
  const playerPosRef = useRef({ x: 0, y: 0 })
  const tryMoveRef = useRef<(dx: number, dy: number) => void>(() => {})
  const startTimeRef = useRef(0)

  const exitX = Math.floor(COLS / 2)
  const exitY = Math.floor(ROWS / 2)

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); setStarted(true); return 0 }
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
      backgroundColor: 0x111122,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    })
    appRef.current = app
    containerRef.current.appendChild(app.view as HTMLCanvasElement)

    const mazeSeed = seed || 'default'
    const { hWalls, vWalls } = generateMaze(COLS, ROWS, mazeSeed)

    const worldContainer = new PIXI.Container()
    app.stage.addChild(worldContainer)

    // Dessiner le labyrinthe
    const mazeGfx = new PIXI.Graphics()
    mazeGfx.lineStyle(3, 0x4488FF, 1)
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

    // Sortie au centre
    const exitGfx = new PIXI.Graphics()
    exitGfx.beginFill(0xFFD700, 0.5)
    exitGfx.drawCircle(exitX * CELL_SIZE + CELL_SIZE / 2, exitY * CELL_SIZE + CELL_SIZE / 2, CELL_SIZE / 2 - 4)
    exitGfx.endFill()
    const exitLabel = new PIXI.Text('🏁', { fontSize: 20 })
    exitLabel.anchor.set(0.5)
    exitLabel.position.set(exitX * CELL_SIZE + CELL_SIZE / 2, exitY * CELL_SIZE + CELL_SIZE / 2)
    worldContainer.addChild(exitGfx)
    worldContainer.addChild(exitLabel)

    // Spawn joueur
    const myIndex = players.findIndex(p => p.id === myPlayerId)
    const spawns = [{ x: 0, y: 0 }, { x: COLS - 1, y: 0 }, { x: 0, y: ROWS - 1 }, { x: COLS - 1, y: ROWS - 1 }]
    const spawn = spawns[myIndex % spawns.length]
    playerPosRef.current = { ...spawn }

    const playerGfx = new PIXI.Graphics()
    playerGfx.beginFill(0xFF4444)
    playerGfx.drawCircle(0, 0, 10)
    playerGfx.endFill()
    worldContainer.addChild(playerGfx)

    const fogGfx = new PIXI.Graphics()
    app.stage.addChild(fogGfx)

    function updateView() {
      const { x, y } = playerPosRef.current
      const px = x * CELL_SIZE + CELL_SIZE / 2
      const py = y * CELL_SIZE + CELL_SIZE / 2
      playerGfx.position.set(px, py)
      worldContainer.position.set(screenW / 2 - px, screenH / 2 - py)

      // Fog of war
      fogGfx.clear()
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (Math.abs(c - x) > FOG_RADIUS || Math.abs(r - y) > FOG_RADIUS) {
            fogGfx.beginFill(0x000000, 0.92)
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

    // Swipe
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

  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-950 gap-4">
        <p className="text-white font-bold text-2xl">Labyrinthe 🌀</p>
        <p className="text-white/60 text-sm text-center px-8">Atteins le centre 🏁 ! Swipe ou boutons directionnels.</p>
        <p className="text-yellow-400 text-5xl font-bold">{countdown}</p>
      </div>
    )
  }

  if (finished) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-950 gap-4">
        <p className="text-4xl">🌀</p>
        <p className="text-white font-bold text-xl">Temps écoulé !</p>
        <p className="text-white/40 text-sm">En attente des autres…</p>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="absolute inset-0" />
      {/* Boutons directionnels */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 grid grid-cols-3 gap-2">
        <div />
        <button className="w-14 h-14 bg-white/20 rounded-xl text-2xl active:bg-white/40" onClick={() => tryMoveRef.current(0, -1)}>↑</button>
        <div />
        <button className="w-14 h-14 bg-white/20 rounded-xl text-2xl active:bg-white/40" onClick={() => tryMoveRef.current(-1, 0)}>←</button>
        <button className="w-14 h-14 bg-white/20 rounded-xl text-2xl active:bg-white/40" onClick={() => tryMoveRef.current(0, 1)}>↓</button>
        <button className="w-14 h-14 bg-white/20 rounded-xl text-2xl active:bg-white/40" onClick={() => tryMoveRef.current(1, 0)}>→</button>
      </div>
    </div>
  )
}
