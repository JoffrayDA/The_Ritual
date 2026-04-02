import * as PIXI from 'pixi.js'
import type { IBoardNode } from '../types/game.types'

// ─── Palette ───────────────────────────────────────────────────────────────

const NODE_R: Record<IBoardNode['type'], number> = {
  start: 18, red: 13, blue: 13, white: 13, black: 13, duel: 14, shop: 14,
}

const NODE_COLOR: Record<IBoardNode['type'], number> = {
  start: 0xFFCC00,
  red:   0xFF2244,
  blue:  0x11AAFF,
  white: 0xCCDDEE,
  black: 0xAA44FF,
  duel:  0xFF11BB,
  shop:  0xFFAA00,
}

const NODE_RIM: Record<IBoardNode['type'], number> = {
  start: 0xCC8800,
  red:   0xBB0022,
  blue:  0x0055BB,
  white: 0x7788AA,
  black: 0x5500AA,
  duel:  0xBB0077,
  shop:  0xBB7700,
}

const TYPE_LABEL: Partial<Record<IBoardNode['type'], string>> = {
  start: '▶',
  shop:  '$',
  duel:  '✕',
}

// Nœuds appartenant au raccourci
const SHORTCUT_IDS = new Set([24, 25, 26, 27, 28])

// ─── BoardRenderer ─────────────────────────────────────────────────────────

export class BoardRenderer {
  private app: PIXI.Application
  private boardContainer: PIXI.Container
  private spriteLayer: PIXI.Container

  constructor(app: PIXI.Application) {
    this.app = app
    this.boardContainer = new PIXI.Container()
    this.spriteLayer    = new PIXI.Container()
    app.stage.addChild(this.boardContainer)
    app.stage.addChild(this.spriteLayer)
  }

  get spriteLayerRef(): PIXI.Container { return this.spriteLayer }

  // ── Rendu principal ─────────────────────────────────────────────────────

  render(board: IBoardNode[]): void {
    this.boardContainer.removeChildren()
    const w = this.app.screen.width
    const h = this.app.screen.height

    this._drawBackground(w, h)
    this._drawPaths(board, w, h)
    this._drawNodes(board, w, h)
  }

  // ── Fond ────────────────────────────────────────────────────────────────

  private _drawBackground(w: number, h: number): void {
    const bg = new PIXI.Graphics()

    // Base sombre
    bg.beginFill(0x080E18)
    bg.drawRect(0, 0, w, h)
    bg.endFill()

    // Lueur centrale radiale (simulée par cercles concentriques)
    const cx = w * 0.50, cy = h * 0.52
    const radii  = [h * 0.55, h * 0.42, h * 0.30, h * 0.18]
    const alphas = [0.04,     0.05,     0.06,     0.04]
    radii.forEach((r, i) => {
      bg.beginFill(0x1A3A6A, alphas[i])
      bg.drawCircle(cx, cy, r)
      bg.endFill()
    })

    this.boardContainer.addChild(bg)

    // Étoiles (pseudo-aléatoire déterministe)
    const stars = new PIXI.Graphics()
    let seed = 137
    const rng = () => { seed = (seed * 1664525 + 1013904223) & 0xFFFFFFFF; return (seed >>> 0) / 0xFFFFFFFF }

    for (let i = 0; i < 120; i++) {
      const sx    = rng() * w
      const sy    = rng() * h
      const size  = rng() < 0.15 ? 1.5 : 1
      const alpha = 0.15 + rng() * 0.55
      stars.beginFill(0xFFFFFF, alpha)
      stars.drawCircle(sx, sy, size)
      stars.endFill()
    }
    this.boardContainer.addChild(stars)
  }

  // ── Chemins ─────────────────────────────────────────────────────────────

  private _drawPaths(board: IBoardNode[], w: number, h: number): void {
    // 4 couches séparées pour bonne superposition
    const glow1  = new PIXI.Graphics() // lueur large
    const glow2  = new PIXI.Graphics() // lueur moyenne
    const road   = new PIXI.Graphics() // route sombre
    const center = new PIXI.Graphics() // filet central brillant
    const dash   = new PIXI.Graphics() // tirets raccourci

    board.forEach(node => {
      node.neighbors.forEach(nid => {
        if (nid <= node.id) return
        const nb = board[nid]
        const x1 = node.x * w, y1 = node.y * h
        const x2 = nb.x * w,   y2 = nb.y * h

        const shortcut = SHORTCUT_IDS.has(node.id) || SHORTCUT_IDS.has(nid)

        if (shortcut) {
          // Raccourci : lueur violette + tirets
          glow1.lineStyle(22, 0x9922FF, 0.06)
          glow1.moveTo(x1, y1); glow1.lineTo(x2, y2)
          glow2.lineStyle(12, 0xBB44FF, 0.12)
          glow2.moveTo(x1, y1); glow2.lineTo(x2, y2)
          road.lineStyle(6, 0x1A0A30, 0.7)
          road.moveTo(x1, y1); road.lineTo(x2, y2)
          this._drawDash(dash, x1, y1, x2, y2, 0xCC55FF, 8, 5, 2.0)
        } else {
          // Chemin principal : lueur bleue + filet continu
          glow1.lineStyle(22, 0x2255CC, 0.06)
          glow1.moveTo(x1, y1); glow1.lineTo(x2, y2)
          glow2.lineStyle(12, 0x3366EE, 0.12)
          glow2.moveTo(x1, y1); glow2.lineTo(x2, y2)
          road.lineStyle(6, 0x0A1020, 0.75)
          road.moveTo(x1, y1); road.lineTo(x2, y2)
          center.lineStyle(1.8, 0x4477DD, 0.80)
          center.moveTo(x1, y1); center.lineTo(x2, y2)
        }
      })
    })

    this.boardContainer.addChild(glow1)
    this.boardContainer.addChild(glow2)
    this.boardContainer.addChild(road)
    this.boardContainer.addChild(center)
    this.boardContainer.addChild(dash)
  }

  private _drawDash(
    g: PIXI.Graphics,
    x1: number, y1: number,
    x2: number, y2: number,
    color: number, dash: number, gap: number, width: number,
  ): void {
    const dx  = x2 - x1, dy = y2 - y1
    const len = Math.sqrt(dx * dx + dy * dy)
    const ux  = dx / len, uy = dy / len
    let d = 0

    g.lineStyle(width, color, 0.85)
    while (d < len) {
      const end = Math.min(d + dash, len)
      g.moveTo(x1 + ux * d,   y1 + uy * d)
      g.lineTo(x1 + ux * end, y1 + uy * end)
      d += dash + gap
    }
  }

  // ── Nœuds ───────────────────────────────────────────────────────────────

  private _drawNodes(board: IBoardNode[], w: number, h: number): void {
    board.forEach(node => {
      const nx    = node.x * w
      const ny    = node.y * h
      const r     = NODE_R[node.type]
      const color = NODE_COLOR[node.type]
      const rim   = NODE_RIM[node.type]

      const g = new PIXI.Graphics()

      // — Halo extérieur (3 anneaux pour effet bloom) —
      g.beginFill(color, 0.06); g.drawCircle(0, 0, r + 12); g.endFill()
      g.beginFill(color, 0.12); g.drawCircle(0, 0, r +  7); g.endFill()
      g.beginFill(color, 0.22); g.drawCircle(0, 0, r +  3); g.endFill()

      // — Ombre portée —
      g.beginFill(0x000000, 0.55)
      g.drawCircle(1.5, 3, r)
      g.endFill()

      // — Bordure (rim) —
      g.beginFill(rim)
      g.drawCircle(0, 0, r + 1.5)
      g.endFill()

      // — Remplissage principal —
      g.beginFill(color)
      g.drawCircle(0, 0, r)
      g.endFill()

      // — Lueur interne (effet orbe 3D) : demi-ellipse claire en haut —
      g.beginFill(0xFFFFFF, 0.18)
      g.drawEllipse(0, -r * 0.20, r * 0.72, r * 0.50)
      g.endFill()

      // — Reflet spéculaire (tache brillante haut-gauche) —
      g.beginFill(0xFFFFFF, 0.60)
      g.drawEllipse(-r * 0.28, -r * 0.35, r * 0.28, r * 0.17)
      g.endFill()

      g.position.set(nx, ny)
      this.boardContainer.addChild(g)

      // — Icône / label —
      const label = TYPE_LABEL[node.type]
      if (label) {
        const textColor = node.type === 'white' ? 0x334455 : 0xFFFFFF
        const txt = new PIXI.Text(label, {
          fontSize:        node.type === 'start' ? 10 : 9,
          fill:            textColor,
          fontWeight:      'bold',
          dropShadow:      true,
          dropShadowColor: 0x000000,
          dropShadowDistance: 1,
        })
        txt.anchor.set(0.5)
        txt.position.set(nx, ny + 0.5)
        this.boardContainer.addChild(txt)
      }
    })
  }

  // ── Utilitaire ──────────────────────────────────────────────────────────

  getNodePosition(nodeId: number, board: IBoardNode[]): { x: number; y: number } {
    const node = board[nodeId]
    if (!node) return { x: 0, y: 0 }
    return { x: node.x * this.app.screen.width, y: node.y * this.app.screen.height }
  }
}
