import * as PIXI from 'pixi.js'
import type { IBoardNode } from '../types/game.types'

const NODE_RADIUS = 13

const NODE_FILL: Record<IBoardNode['type'], number> = {
  start:  0xFFD700,
  red:    0xFF3355,
  blue:   0x2299FF,
  white:  0xCCDDEE,
  black:  0x8855CC,
  duel:   0xCC22FF,
  shop:   0xFFAA00,
}

const NODE_BORDER: Record<IBoardNode['type'], number> = {
  start:  0xCC9900,
  red:    0xCC0022,
  blue:   0x0055BB,
  white:  0x889BAA,
  black:  0x552299,
  duel:   0x9900CC,
  shop:   0xCC7700,
}

const NODE_LABEL: Partial<Record<IBoardNode['type'], string>> = {
  start: '▶',
  shop:  '$',
  duel:  '✕',
}

const PATH_COLOR   = 0x2A4066
const PATH_GLOW    = 0x335599
const SHORTCUT_COLOR = 0x553388
const BG_COLOR     = 0x0B1622

export class BoardRenderer {
  private app: PIXI.Application
  private boardContainer: PIXI.Container
  private spriteLayer: PIXI.Container

  constructor(app: PIXI.Application) {
    this.app = app
    this.boardContainer = new PIXI.Container()
    this.spriteLayer = new PIXI.Container()
    app.stage.addChild(this.boardContainer)
    app.stage.addChild(this.spriteLayer)
  }

  get spriteLayerRef(): PIXI.Container {
    return this.spriteLayer
  }

  render(boardData: IBoardNode[]): void {
    this.boardContainer.removeChildren()

    const w = this.app.screen.width
    const h = this.app.screen.height

    // --- Fond ---
    const bg = new PIXI.Graphics()
    bg.beginFill(BG_COLOR)
    bg.drawRect(0, 0, w, h)
    bg.endFill()
    this.boardContainer.addChild(bg)

    // Grille de points décorative
    this._drawDotGrid(w, h)

    // --- Connexions ---
    // Passe 1 : lueur large
    const linesGlow = new PIXI.Graphics()
    // Passe 2 : trait net
    const linesSolid = new PIXI.Graphics()

    boardData.forEach(node => {
      node.neighbors.forEach(neighborId => {
        if (neighborId <= node.id) return
        const neighbor = boardData[neighborId]
        const x1 = node.x * w,     y1 = node.y * h
        const x2 = neighbor.x * w, y2 = neighbor.y * h

        // Raccourci vs chemin principal : couleurs différentes
        const isShortcut =
          (node.id >= 24 && node.id <= 28) ||
          (neighborId >= 24 && neighborId <= 28)

        const glowColor  = isShortcut ? 0x7722CC : PATH_GLOW
        const solidColor = isShortcut ? SHORTCUT_COLOR : PATH_COLOR

        linesGlow.lineStyle(10, glowColor, 0.12)
        linesGlow.moveTo(x1, y1)
        linesGlow.lineTo(x2, y2)

        linesGlow.lineStyle(6, glowColor, 0.10)
        linesGlow.moveTo(x1, y1)
        linesGlow.lineTo(x2, y2)

        linesSolid.lineStyle(2.5, solidColor, 0.85)
        linesSolid.moveTo(x1, y1)
        linesSolid.lineTo(x2, y2)
      })
    })

    this.boardContainer.addChild(linesGlow)
    this.boardContainer.addChild(linesSolid)

    // --- Nœuds ---
    boardData.forEach(node => {
      const nx = node.x * w
      const ny = node.y * h
      const fill   = NODE_FILL[node.type]
      const border = NODE_BORDER[node.type]
      const isSpecial = node.type === 'start' || node.type === 'shop' || node.type === 'duel'

      const g = new PIXI.Graphics()

      // Halo extérieur (nœuds spéciaux)
      if (isSpecial) {
        g.beginFill(fill, 0.08)
        g.drawCircle(0, 0, NODE_RADIUS + 9)
        g.endFill()
        g.beginFill(fill, 0.15)
        g.drawCircle(0, 0, NODE_RADIUS + 5)
        g.endFill()
      }

      // Ombre portée
      g.beginFill(0x000000, 0.40)
      g.drawCircle(1, 2, NODE_RADIUS)
      g.endFill()

      // Bordure colorée
      g.beginFill(border)
      g.drawCircle(0, 0, NODE_RADIUS + 1.5)
      g.endFill()

      // Remplissage principal
      g.beginFill(fill)
      g.drawCircle(0, 0, NODE_RADIUS)
      g.endFill()

      // Reflet brillant (ellipse haut-gauche)
      g.beginFill(0xFFFFFF, 0.40)
      g.drawEllipse(
        -NODE_RADIUS * 0.22,
        -NODE_RADIUS * 0.32,
        NODE_RADIUS * 0.36,
        NODE_RADIUS * 0.22,
      )
      g.endFill()

      g.position.set(nx, ny)
      this.boardContainer.addChild(g)

      // Icône / label
      const label = NODE_LABEL[node.type]
      if (label) {
        const text = new PIXI.Text(label, {
          fontSize: node.type === 'start' ? 9 : 8,
          fill: node.type === 'white' ? 0x223344 : 0xFFFFFF,
          fontWeight: 'bold',
        })
        text.anchor.set(0.5)
        text.position.set(nx, ny + 0.5)
        this.boardContainer.addChild(text)
      }

      // Numéro de case (petit, discret)
      const idText = new PIXI.Text(String(node.id), {
        fontSize: 6,
        fill: 0xFFFFFF,
        alpha: 0.5,
      })
      idText.anchor.set(0.5)
      idText.position.set(nx + NODE_RADIUS + 5, ny - NODE_RADIUS - 2)
      this.boardContainer.addChild(idText)
    })
  }

  private _drawDotGrid(w: number, h: number): void {
    const dots = new PIXI.Graphics()
    const step = 28
    for (let x = step; x < w; x += step) {
      for (let y = step; y < h; y += step) {
        dots.beginFill(0x1A2E44, 1)
        dots.drawCircle(x, y, 1)
        dots.endFill()
      }
    }
    this.boardContainer.addChild(dots)
  }

  getNodePosition(nodeId: number, boardData: IBoardNode[]): { x: number; y: number } {
    const node = boardData[nodeId]
    if (!node) return { x: 0, y: 0 }
    return {
      x: node.x * this.app.screen.width,
      y: node.y * this.app.screen.height,
    }
  }
}
