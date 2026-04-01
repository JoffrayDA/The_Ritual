import * as PIXI from 'pixi.js'
import type { IPlayer } from '../types/game.types'

const FACE_DOTS: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]],
  2: [[0.25, 0.25], [0.75, 0.75]],
  3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
  4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
  5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
  6: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.5], [0.75, 0.5], [0.25, 0.75], [0.75, 0.75]],
}

export class DiceAnimation {
  private app: PIXI.Application
  private container: PIXI.Container | null = null

  constructor(app: PIXI.Application) {
    this.app = app
  }

  play(result: number): Promise<void> {
    return new Promise(resolve => {
      // Supprimer animation précédente
      if (this.container) {
        this.app.stage.removeChild(this.container)
        this.container.destroy({ children: true })
      }

      const cx = this.app.screen.width / 2
      const cy = this.app.screen.height / 2
      const SIZE = 80

      const container = new PIXI.Container()
      this.container = container
      this.app.stage.addChild(container)

      // Fond semi-transparent
      const bg = new PIXI.Graphics()
      bg.beginFill(0x000000, 0.5)
      bg.drawRect(0, 0, this.app.screen.width, this.app.screen.height)
      bg.endFill()
      container.addChild(bg)

      // Dé
      const die = new PIXI.Container()
      die.position.set(cx, cy - 60)
      container.addChild(die)

      // Face du dé
      const face = new PIXI.Graphics()
      face.beginFill(0xffffff)
      face.lineStyle(3, 0x333333)
      face.drawRoundedRect(-SIZE / 2, -SIZE / 2, SIZE, SIZE, 10)
      face.endFill()
      die.addChild(face)

      // Points
      const dots = FACE_DOTS[result] || []
      dots.forEach(([rx, ry]) => {
        const dot = new PIXI.Graphics()
        dot.beginFill(0x222222)
        dot.drawCircle(0, 0, 7)
        dot.endFill()
        dot.position.set((rx - 0.5) * (SIZE - 20), (ry - 0.5) * (SIZE - 20))
        die.addChild(dot)
      })

      // Chiffre résultat
      const label = new PIXI.Text(`${result}`, {
        fontSize: 32,
        fill: 0xffd700,
        fontWeight: 'bold',
      })
      label.anchor.set(0.5)
      label.position.set(cx, cy + 20)
      container.addChild(label)

      // Animation : shake + bounce
      let frame = 0
      const totalFrames = 60 // ~1s à 60fps
      const ticker = (delta: number) => {
        frame += delta
        const progress = frame / totalFrames

        if (progress < 0.5) {
          // Phase shake
          die.x = cx + Math.sin(frame * 1.5) * 10
          die.y = (cy - 60) + Math.cos(frame * 2) * 8
          die.rotation = Math.sin(frame * 0.5) * 0.3
        } else {
          // Phase settle
          const t = (progress - 0.5) * 2
          die.x = cx + (die.x - cx) * (1 - t * 0.1)
          die.y = (cy - 60) + (die.y - (cy - 60)) * (1 - t * 0.1)
          die.rotation *= 0.9
        }

        if (frame >= totalFrames) {
          this.app.ticker.remove(ticker)
          // Auto-dismiss après 1s
          setTimeout(() => {
            if (this.container === container) {
              this.app.stage.removeChild(container)
              container.destroy({ children: true })
              this.container = null
            }
            resolve()
          }, 800)
        }
      }

      this.app.ticker.add(ticker)
    })
  }

  playDuelDraw(players: IPlayer[], targetId: string): Promise<void> {
    return new Promise(resolve => {
      if (this.container) {
        this.app.stage.removeChild(this.container)
        this.container.destroy({ children: true })
      }

      const cx = this.app.screen.width / 2
      const cy = this.app.screen.height / 2
      const container = new PIXI.Container()
      this.container = container
      this.app.stage.addChild(container)

      // Fond
      const bg = new PIXI.Graphics()
      bg.beginFill(0x000000, 0.7)
      bg.drawRect(0, 0, this.app.screen.width, this.app.screen.height)
      bg.endFill()
      container.addChild(bg)

      const title = new PIXI.Text('DUEL !', {
        fontSize: 36,
        fill: 0xaa44ff,
        fontWeight: 'bold',
      })
      title.anchor.set(0.5)
      title.position.set(cx, cy - 80)
      container.addChild(title)

      // Afficher les avatars en cercle
      const radius = 70
      players.forEach((player, i) => {
        const angle = (i / players.length) * Math.PI * 2 - Math.PI / 2
        const px = cx + Math.cos(angle) * radius
        const py = cy + Math.sin(angle) * radius

        const isTarget = player.id === targetId
        const g = new PIXI.Graphics()
        g.beginFill(isTarget ? 0xaa44ff : 0x444444)
        g.drawCircle(0, 0, 22)
        g.endFill()
        g.position.set(px, py)
        container.addChild(g)

        const label = new PIXI.Text(player.avatar || '?', { fontSize: 20 })
        label.anchor.set(0.5)
        label.position.set(px, py)
        container.addChild(label)
      })

      // Flèche animée tournant vers la cible
      const targetPlayer = players.find(p => p.id === targetId)
      const targetLabel = new PIXI.Text(
        `⚔️ ${targetPlayer?.name || '?'} est désigné(e) !`,
        { fontSize: 18, fill: 0xffd700, fontWeight: 'bold' }
      )
      targetLabel.anchor.set(0.5)
      targetLabel.position.set(cx, cy + 100)
      container.addChild(targetLabel)

      setTimeout(() => {
        if (this.container === container) {
          this.app.stage.removeChild(container)
          container.destroy({ children: true })
          this.container = null
        }
        resolve()
      }, 2500)
    })
  }
}
