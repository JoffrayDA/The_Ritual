import * as PIXI from 'pixi.js'
import type { IPlayer } from '../types/game.types'

const PLAYER_COLORS = [
  0x6C63FF, // violet
  0xFF6B6B, // rouge-corail
  0x00CEC9, // teal
  0xFDCB6E, // or
  0xFF9F43, // orange
  0xA29BFE, // lavande
  0xFD79A8, // rose
  0x55EFC4, // menthe
]

const PLAYER_RIM = [
  0x3A2FCC,
  0xCC2222,
  0x007A77,
  0xCC9900,
  0xCC6600,
  0x6655CC,
  0xCC3377,
  0x00AA77,
]

export class PlayerSprite {
  private app: PIXI.Application
  private container: PIXI.Container
  private circle: PIXI.Graphics
  private avatarText: PIXI.Text
  private nameText: PIXI.Text
  private colorIndex: number

  constructor(app: PIXI.Application, player: IPlayer, parentContainer: PIXI.Container) {
    this.app = app
    this.colorIndex = 0

    this.container = new PIXI.Container()
    parentContainer.addChild(this.container)

    this.circle = new PIXI.Graphics()
    this.container.addChild(this.circle)

    this.avatarText = new PIXI.Text(player.avatar || '?', { fontSize: 13 })
    this.avatarText.anchor.set(0.5)
    this.avatarText.position.set(0, 0.5)
    this.container.addChild(this.avatarText)

    this.nameText = new PIXI.Text(player.name, {
      fontSize: 9,
      fill: 0xFFFFFF,
      fontWeight: 'bold',
      stroke: 0x000000,
      strokeThickness: 3,
      dropShadow: true,
      dropShadowColor: 0x000000,
      dropShadowDistance: 1,
    })
    this.nameText.anchor.set(0.5)
    this.nameText.position.set(0, -26)
    this.container.addChild(this.nameText)

    this._draw()
  }

  private _draw(): void {
    const color = PLAYER_COLORS[this.colorIndex % PLAYER_COLORS.length]
    const rim   = PLAYER_RIM[this.colorIndex % PLAYER_RIM.length]
    const R = 15

    this.circle.clear()

    // Halo
    this.circle.beginFill(color, 0.15); this.circle.drawCircle(0, 0, R + 6); this.circle.endFill()
    this.circle.beginFill(color, 0.25); this.circle.drawCircle(0, 0, R + 3); this.circle.endFill()

    // Ombre
    this.circle.beginFill(0x000000, 0.55)
    this.circle.drawCircle(1, 2, R)
    this.circle.endFill()

    // Bordure
    this.circle.beginFill(rim)
    this.circle.drawCircle(0, 0, R + 1.5)
    this.circle.endFill()

    // Fill
    this.circle.beginFill(color)
    this.circle.drawCircle(0, 0, R)
    this.circle.endFill()

    // Reflet orbe
    this.circle.beginFill(0xFFFFFF, 0.20)
    this.circle.drawEllipse(0, -R * 0.18, R * 0.70, R * 0.45)
    this.circle.endFill()

    this.circle.beginFill(0xFFFFFF, 0.65)
    this.circle.drawEllipse(-R * 0.28, -R * 0.32, R * 0.26, R * 0.16)
    this.circle.endFill()
  }

  setColorIndex(index: number): void {
    this.colorIndex = index
    this._draw()
  }

  setPosition(x: number, y: number): void {
    this.container.position.set(x, y)
  }

  updatePlayer(player: IPlayer): void {
    this.avatarText.text = player.avatar || '?'
    this.container.alpha = player.isConnected ? 1 : 0.35
  }

  moveTo(targetX: number, targetY: number): Promise<void> {
    return new Promise(resolve => {
      const startX = this.container.x
      const startY = this.container.y
      const DURATION = 320

      let elapsed = 0
      const ticker = (delta: number) => {
        elapsed += (delta / 60) * 1000
        const t    = Math.min(elapsed / DURATION, 1)
        const ease = 1 - Math.pow(1 - t, 3)

        this.container.x = startX + (targetX - startX) * ease
        this.container.y = startY + (targetY - startY) * ease

        if (t >= 1) {
          this.app.ticker.remove(ticker)
          this.container.position.set(targetX, targetY)
          resolve()
        }
      }
      this.app.ticker.add(ticker)
    })
  }

  destroy(): void {
    this.container.destroy({ children: true })
  }
}
