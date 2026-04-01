import * as PIXI from 'pixi.js'
import type { IPlayer } from '../types/game.types'

// Couleurs uniques par index de joueur
const PLAYER_COLORS = [0x6C63FF, 0xFF6B6B, 0x4ECDC4, 0xFFE66D, 0xFF9F43, 0xA29BFE, 0xFD79A8, 0x00B894]

export class PlayerSprite {
  private app: PIXI.Application
  private container: PIXI.Container
  private circle: PIXI.Graphics
  private avatarText: PIXI.Text
  private nameText: PIXI.Text
  private player: IPlayer
  private colorIndex: number

  constructor(app: PIXI.Application, player: IPlayer, parentContainer: PIXI.Container) {
    this.app = app
    this.player = player

    // Déterminer l'index de couleur basé sur l'id du joueur (stable)
    this.colorIndex = 0

    this.container = new PIXI.Container()
    parentContainer.addChild(this.container)

    // Cercle coloré
    this.circle = new PIXI.Graphics()
    this.container.addChild(this.circle)

    // Emoji avatar
    this.avatarText = new PIXI.Text(player.avatar || '?', { fontSize: 14 })
    this.avatarText.anchor.set(0.5)
    this.container.addChild(this.avatarText)

    // Nom au dessus
    this.nameText = new PIXI.Text(player.name, {
      fontSize: 9,
      fill: 0xffffff,
      stroke: 0x000000,
      strokeThickness: 2,
    })
    this.nameText.anchor.set(0.5)
    this.nameText.position.set(0, -22)
    this.container.addChild(this.nameText)

    this.drawCircle()
  }

  private drawCircle(): void {
    const color = PLAYER_COLORS[this.colorIndex % PLAYER_COLORS.length]
    this.circle.clear()
    this.circle.lineStyle(2, 0xffffff, 0.8)
    this.circle.beginFill(color, 0.9)
    this.circle.drawCircle(0, 0, 14)
    this.circle.endFill()
  }

  setColorIndex(index: number): void {
    this.colorIndex = index
    this.drawCircle()
  }

  setPosition(x: number, y: number): void {
    this.container.position.set(x, y)
  }

  updatePlayer(player: IPlayer): void {
    this.player = player
    this.avatarText.text = player.avatar || '?'
    // Opacité réduite si déconnecté
    this.container.alpha = player.isConnected ? 1 : 0.4
  }

  moveTo(targetX: number, targetY: number): Promise<void> {
    return new Promise(resolve => {
      const startX = this.container.x
      const startY = this.container.y
      const DURATION = 300 // ms par case (simplifié : on anime directement vers la destination)

      let elapsed = 0

      const ticker = (delta: number) => {
        elapsed += (delta / 60) * 1000 // delta en frames, convertir en ms

        const t = Math.min(elapsed / DURATION, 1)
        // Easing ease-out
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
