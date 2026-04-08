import * as PIXI from 'pixi.js'
import type { IPlayer } from '../types/game.types'

// ── Face dot positions (normalized 0-1) ──────────────────────────────────────
const FACE_DOTS: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]],
  2: [[0.25, 0.25], [0.75, 0.75]],
  3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
  4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
  5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
  6: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.5], [0.75, 0.5], [0.25, 0.75], [0.75, 0.75]],
}

const S  = 70   // face size
const D  = 14   // isometric depth

// ── Build a 3D-looking die face ───────────────────────────────────────────────
function buildDieFace(face: number): PIXI.Container {
  const c = new PIXI.Container()

  // Right panel (dark side)
  const rp = new PIXI.Graphics()
  rp.beginFill(0xb0b0b0)
  rp.moveTo( S/2,      -S/2)
  rp.lineTo( S/2 + D,  -S/2 - D)
  rp.lineTo( S/2 + D,   S/2 - D)
  rp.lineTo( S/2,       S/2)
  rp.closePath()
  rp.endFill()
  rp.lineStyle(1.5, 0x808080, 0.7)
  rp.moveTo( S/2, -S/2)
  rp.lineTo( S/2 + D, -S/2 - D)
  rp.lineTo( S/2 + D,  S/2 - D)
  rp.lineTo( S/2,  S/2)
  c.addChild(rp)

  // Top panel (light side)
  const tp = new PIXI.Graphics()
  tp.beginFill(0xe2e2e2)
  tp.moveTo(-S/2,     -S/2)
  tp.lineTo( S/2,     -S/2)
  tp.lineTo( S/2 + D, -S/2 - D)
  tp.lineTo(-S/2 + D, -S/2 - D)
  tp.closePath()
  tp.endFill()
  tp.lineStyle(1.5, 0x808080, 0.7)
  tp.moveTo(-S/2, -S/2)
  tp.lineTo( S/2, -S/2)
  tp.lineTo( S/2 + D, -S/2 - D)
  tp.lineTo(-S/2 + D, -S/2 - D)
  c.addChild(tp)

  // Front face (white)
  const fp = new PIXI.Graphics()
  fp.beginFill(0xf8f8f8)
  fp.lineStyle(2, 0x909090, 1)
  fp.drawRoundedRect(-S/2, -S/2, S, S, 10)
  fp.endFill()
  // Subtle top-left highlight
  fp.beginFill(0xffffff, 0.18)
  fp.drawRoundedRect(-S/2 + 3, -S/2 + 3, S * 0.55, S * 0.4, 8)
  fp.endFill()
  c.addChild(fp)

  // Dots
  const dots = FACE_DOTS[face] || []
  dots.forEach(([rx, ry]) => {
    const g = new PIXI.Graphics()
    g.beginFill(0x1a1a1a)
    g.drawCircle(0, 0, 7)
    g.endFill()
    // Specular on dot
    g.beginFill(0x555555, 0.45)
    g.drawCircle(-1.5, -2, 2.5)
    g.endFill()
    g.position.set((rx - 0.5) * (S - 20), (ry - 0.5) * (S - 20))
    c.addChild(g)
  })

  return c
}

// ── Landing particle burst ────────────────────────────────────────────────────
function spawnParticles(
  app: PIXI.Application,
  parent: PIXI.Container,
  x: number,
  y: number,
) {
  const COUNT = 18
  for (let i = 0; i < COUNT; i++) {
    const angle  = (i / COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.5
    const speed  = 1.5 + Math.random() * 4
    const radius = 1.5 + Math.random() * 3

    const gfx = new PIXI.Graphics()
    const rng = Math.random()
    const color = rng > 0.55 ? 0xFFD700 : rng > 0.25 ? 0xffffff : 0xff9944
    gfx.beginFill(color, 0.9)
    gfx.drawCircle(0, 0, radius)
    gfx.endFill()
    gfx.position.set(x + (Math.random() - 0.5) * 25, y + (Math.random() - 0.5) * 12)
    parent.addChild(gfx)

    let vx = Math.cos(angle) * speed
    let vy = Math.sin(angle) * speed - 2   // upward bias
    let life = 1.0

    const tick = (delta: number) => {
      vy   += delta * 0.2   // gravity
      vx   *= 0.97
      gfx.x += vx * delta
      gfx.y += vy * delta
      life  -= delta * 0.028
      gfx.alpha = Math.max(0, life)
      if (life <= 0) {
        app.ticker.remove(tick)
        if (gfx.parent) gfx.parent.removeChild(gfx)
        gfx.destroy()
      }
    }
    app.ticker.add(tick)
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number) { return a + (b - a) * t }
function easeOut2(t: number) { return 1 - (1 - t) * (1 - t) }
function easeIn2(t:  number) { return t * t }
function clamp01(t: number)  { return Math.max(0, Math.min(1, t)) }

// ═════════════════════════════════════════════════════════════════════════════
export class DiceAnimation {
  private app: PIXI.Application
  private container: PIXI.Container | null = null

  constructor(app: PIXI.Application) {
    this.app = app
  }

  // ── Main throw animation ─────────────────────────────────────────────────
  play(result: number): Promise<void> {
    return new Promise(resolve => {
      // Cleanup previous
      if (this.container) {
        this.app.stage.removeChild(this.container)
        this.container.destroy({ children: true })
      }

      const app = this.app
      const W   = app.screen.width
      const H   = app.screen.height

      // Landing spot: upper-center of screen (over the board)
      const landX = W / 2
      const landY = H * 0.40

      // ── Scene root ──
      const scene = new PIXI.Container()
      this.container = scene
      app.stage.addChild(scene)

      // Darkened backdrop
      const bg = new PIXI.Graphics()
      bg.beginFill(0x000000, 0.7)
      bg.drawRect(0, 0, W, H)
      bg.endFill()
      bg.alpha = 0
      scene.addChild(bg)

      // Shadow ellipse under the die
      const shadow = new PIXI.Graphics()
      shadow.beginFill(0x000000, 0.45)
      shadow.drawEllipse(0, 0, S * 0.8, S * 0.22)
      shadow.endFill()
      shadow.position.set(landX, landY + S / 2 + 6)
      shadow.alpha = 0
      shadow.scale.set(0.1, 0.1)
      scene.addChild(shadow)

      // Die positional container (position + z-rotation)
      const pos = new PIXI.Container()
      // Die scale container (scaleX spin, scaleXY squash)
      const die = new PIXI.Container()
      pos.addChild(die)
      scene.addChild(pos)

      // Starting position: from below the screen, random x offset
      const startX = W / 2 + (Math.random() - 0.5) * 50
      const startY = H + S + 20
      const apexY  = landY - H * 0.40    // go way up above landing spot
      pos.position.set(startX, startY)

      // Initial random face
      let curFace = 1 + Math.floor(Math.random() * 6)
      let faceGfx = buildDieFace(curFace)
      die.addChild(faceGfx)

      function swapFace(f: number) {
        die.removeChild(faceGfx)
        faceGfx.destroy({ children: true })
        curFace = f
        faceGfx = buildDieFace(f)
        die.addChild(faceGfx)
      }

      // ── Phase timing (frames @ 60fps) ────────────────────────────────────
      //   LAUNCH  : 0  → 18   (0.30s) — shoot upward
      //   APEX    : 18 → 53   (0.58s) — float at top, slow spin
      //   FALL    : 53 → 74   (0.35s) — fall fast
      //   SQUASH  : 74 → 84   (0.17s) — first contact squash/stretch
      //   BOUNCE  : 84 → 106  (0.37s) — two bounces
      //   SETTLE  : 106→ 114  (0.13s) — come to rest
      //   Total   : 114 frames ≈ 1.9s
      const F_LAUNCH = 18
      const F_APEX   = 35
      const F_FALL   = 21
      const F_SQUASH = 10
      const F_BOUNCE = 22
      const F_SETTLE = 8

      const P_LAUNCH = 0
      const P_APEX   = P_LAUNCH + F_LAUNCH        // 18
      const P_FALL   = P_APEX   + F_APEX          // 53
      const P_SQUASH = P_FALL   + F_FALL          // 74
      const P_BOUNCE = P_SQUASH + F_SQUASH        // 84
      const P_SETTLE = P_BOUNCE + F_BOUNCE        // 106
      const P_DONE   = P_SETTLE + F_SETTLE        // 114

      let frame       = 0
      let spinAngle   = 0           // for cos-based y-axis spin
      let lastCosSgn  = 1           // track zero crossings
      let squashFired = false
      let doneFired   = false

      // ── Ticker ───────────────────────────────────────────────────────────
      const ticker = (delta: number) => {
        frame += delta

        // Backdrop fade in over first 25 frames
        bg.alpha = Math.min(0.7, frame / 25 * 0.7)

        // ── Spin speed varies by phase ──
        const spinSpeed =
          frame < P_APEX   ? 0.32 :
          frame < P_FALL   ? 0.20 :
          frame < P_SQUASH ? 0.28 : 0

        spinAngle += delta * spinSpeed

        // ── Face swap on spin zero-crossing (scaleX ≈ 0) ──
        if (frame < P_SQUASH) {
          const cosV  = Math.cos(spinAngle)
          const sgn   = Math.sign(cosV) || 1
          if (sgn !== lastCosSgn && Math.abs(cosV) < 0.18) {
            const nearLanding = frame > P_FALL + F_FALL * 0.55
            swapFace(nearLanding ? result : 1 + Math.floor(Math.random() * 6))
            lastCosSgn = sgn
          }
        }

        // ──────────────────────────────────────────────────────────────────
        if (frame < P_APEX) {
          // === LAUNCH ===
          const t = clamp01(frame / F_LAUNCH)
          pos.x = lerp(startX, landX, t)
          pos.y = lerp(startY, apexY, easeOut2(t))
          pos.rotation = lerp(0, Math.PI * 1.3, t) * (startX > landX ? 1 : -1)
          die.scale.x = Math.cos(spinAngle)
          die.scale.y = 1
          shadow.alpha = 0.05
          shadow.scale.set(0.12, 0.12)

        } else if (frame < P_FALL) {
          // === APEX — float ===
          const t   = clamp01((frame - P_APEX) / F_APEX)
          const osc = Math.sin(t * Math.PI) * 10          // gentle float arc
          pos.x = landX + Math.sin(t * Math.PI * 1.5) * 5
          pos.y = apexY - osc
          pos.rotation *= 0.94                            // drift to upright
          die.scale.x = Math.cos(spinAngle)
          die.scale.y = 1
          shadow.alpha = lerp(0.08, 0.18, t)
          shadow.scale.set(lerp(0.2, 0.4, t), lerp(0.2, 0.4, t))

        } else if (frame < P_SQUASH) {
          // === FALL ===
          const t  = clamp01((frame - P_FALL) / F_FALL)
          const ez = easeIn2(t)
          pos.x = landX
          pos.y = lerp(apexY, landY, ez)
          pos.rotation *= 0.87
          die.scale.x = Math.cos(spinAngle)
          die.scale.y = 1
          shadow.alpha  = lerp(0.2, 0.55, ez)
          const ss = lerp(0.4, 1.0, ez)
          shadow.scale.set(ss, ss)

        } else if (frame < P_BOUNCE) {
          // === SQUASH — first contact ===
          const t = clamp01((frame - P_SQUASH) / F_SQUASH)
          pos.x = landX
          pos.y = landY
          pos.rotation = 0
          die.scale.x = 1   // no more spin

          if (!squashFired) {
            squashFired = true
            swapFace(result)                              // reveal final face

            // Screen shake via scene offset
            let shakeF = 12
            const shakeTick = (d: number) => {
              shakeF -= d
              const amt = (shakeF / 12) * 5.5
              scene.x = Math.sin(shakeF * 1.6) * amt
              scene.y = Math.sin(shakeF * 2.3) * amt * 0.5
              if (shakeF <= 0) {
                scene.position.set(0, 0)
                app.ticker.remove(shakeTick)
              }
            }
            app.ticker.add(shakeTick)

            spawnParticles(app, scene, landX, landY)
          }

          // Squash first half → stretch second half
          if (t < 0.45) {
            const sq = 1 - (t / 0.45) * 0.40       // compress to 0.6
            die.scale.set(1 / sq, sq)               // expand width to conserve "volume"
          } else {
            const un = (t - 0.45) / 0.55
            die.scale.set(
              lerp(1 / 0.60, 1.0, un),
              lerp(0.60, 1.0, un),
            )
          }

          shadow.alpha = 0.55
          shadow.scale.set(1, 1)

        } else if (frame < P_SETTLE) {
          // === BOUNCE ===
          const t = clamp01((frame - P_BOUNCE) / F_BOUNCE)
          pos.x = landX
          pos.rotation = 0

          // Sub-phases:  rise → small squash → small rise → come down
          let bounceY = 0

          if (t < 0.40) {
            // First arc up
            bounceY = -Math.sin((t / 0.40) * Math.PI) * S * 0.40
            die.scale.set(lerp(1 / 0.60, 1, t / 0.40), lerp(0.60, 1, t / 0.40))
          } else if (t < 0.54) {
            // Second squash (lighter)
            const t2 = (t - 0.40) / 0.14
            const sq2 = 1 - t2 * 0.22
            bounceY = 0
            die.scale.set(1 / sq2, sq2)
          } else if (t < 1.0) {
            // Second arc (smaller)
            const t3 = (t - 0.54) / 0.46
            bounceY = -Math.sin(t3 * Math.PI) * S * 0.17
            die.scale.set(lerp(1 / 0.78, 1, t3), lerp(0.78, 1, t3))
          }

          pos.y = landY + bounceY
          shadow.alpha = lerp(0.5, 0.4, Math.abs(bounceY) / (S * 0.40))

        } else if (frame < P_DONE) {
          // === SETTLE ===
          pos.position.set(landX, landY)
          pos.rotation = 0
          die.scale.set(1, 1)
          shadow.alpha = 0.40

        } else if (!doneFired) {
          // === RESULT DISPLAY ===
          doneFired = true
          app.ticker.remove(ticker)

          pos.position.set(landX, landY)
          die.scale.set(1, 1)
          shadow.alpha = 0.40

          // Pulsing golden ring around die
          const ring = new PIXI.Graphics()
          ring.lineStyle(3, 0xFFD700, 0.9)
          ring.drawRoundedRect(-S / 2 - 9, -S / 2 - 9, S + 18, S + 18, 16)
          pos.addChild(ring)

          let ringT = 0
          const ringTick = (d: number) => {
            ringT += d * 0.07
            ring.alpha = 0.45 + Math.sin(ringT) * 0.35
          }
          app.ticker.add(ringTick)

          // Large result number below the die
          const numText = new PIXI.Text(`${result}`, {
            fontSize: 54,
            fill: 0xFFD700,
            fontWeight: 'bold',
            dropShadow: true,
            dropShadowColor: 0x000000,
            dropShadowBlur: 6,
            dropShadowDistance: 3,
          })
          numText.anchor.set(0.5)
          numText.position.set(landX, landY + S / 2 + 42)
          numText.alpha = 0
          scene.addChild(numText)

          // Fade in number
          let na = 0
          const numTick = (d: number) => {
            na = Math.min(1, na + d * 0.07)
            numText.alpha = na
            if (na >= 1) app.ticker.remove(numTick)
          }
          app.ticker.add(numTick)

          // Auto-dismiss after 1.3s with fade-out
          setTimeout(() => {
            app.ticker.remove(ringTick)
            if (this.container === scene) {
              let fa = 1
              const fadeTick = (d: number) => {
                fa -= d * 0.06
                scene.alpha = Math.max(0, fa)
                if (fa <= 0) {
                  app.ticker.remove(fadeTick)
                  if (scene.parent) app.stage.removeChild(scene)
                  scene.destroy({ children: true })
                  this.container = null
                }
              }
              app.ticker.add(fadeTick)
            }
            resolve()
          }, 1300)
        }
      }

      app.ticker.add(ticker)
    })
  }

  // ── Duel draw animation ──────────────────────────────────────────────────
  playDuelDraw(players: IPlayer[], targetId: string): Promise<void> {
    return new Promise(resolve => {
      if (this.container) {
        this.app.stage.removeChild(this.container)
        this.container.destroy({ children: true })
      }

      const app = this.app
      const W   = app.screen.width
      const H   = app.screen.height
      const cx  = W / 2
      const cy  = H / 2

      const scene = new PIXI.Container()
      this.container = scene
      app.stage.addChild(scene)

      // Backdrop
      const bg = new PIXI.Graphics()
      bg.beginFill(0x000000, 0.75)
      bg.drawRect(0, 0, W, H)
      bg.endFill()
      bg.alpha = 0
      scene.addChild(bg)

      let bgA = 0
      const bgTick = (d: number) => {
        bgA = Math.min(0.75, bgA + d * 0.06)
        bg.alpha = bgA
        if (bgA >= 0.75) app.ticker.remove(bgTick)
      }
      app.ticker.add(bgTick)

      // Title
      const title = new PIXI.Text('⚔️  DUEL !', {
        fontSize: 40,
        fill: 0xaa44ff,
        fontWeight: 'bold',
        dropShadow: true,
        dropShadowColor: 0x330066,
        dropShadowBlur: 8,
        dropShadowDistance: 2,
      })
      title.anchor.set(0.5)
      title.position.set(cx, cy - 90)
      title.alpha = 0
      scene.addChild(title)

      let titleA = 0
      const titleTick = (d: number) => {
        titleA = Math.min(1, titleA + d * 0.07)
        title.alpha = titleA
        if (titleA >= 1) app.ticker.remove(titleTick)
      }
      app.ticker.add(titleTick)

      // Player avatars in circle
      const radius = 72
      players.forEach((player, i) => {
        const angle = (i / players.length) * Math.PI * 2 - Math.PI / 2
        const px = cx + Math.cos(angle) * radius
        const py = cy + Math.sin(angle) * radius
        const isTarget = player.id === targetId

        const g = new PIXI.Graphics()
        if (isTarget) {
          g.lineStyle(3, 0xaa44ff, 1)
          g.beginFill(0x330055)
        } else {
          g.beginFill(0x333344)
        }
        g.drawCircle(0, 0, 24)
        g.endFill()
        g.position.set(px, py)
        scene.addChild(g)

        // Glow ring for target
        if (isTarget) {
          let glowT = 0
          const glowTick = (d: number) => {
            glowT += d * 0.08
            g.alpha = 0.7 + Math.sin(glowT) * 0.3
          }
          app.ticker.add(glowTick)
        }

        const label = new PIXI.Text(player.avatar || '?', { fontSize: 20 })
        label.anchor.set(0.5)
        label.position.set(px, py)
        scene.addChild(label)
      })

      // Target announcement
      const targetPlayer = players.find(p => p.id === targetId)
      const announcement = new PIXI.Text(
        `${targetPlayer?.name || '?'} doit boire !`,
        {
          fontSize: 20,
          fill: 0xFFD700,
          fontWeight: 'bold',
          dropShadow: true,
          dropShadowColor: 0x000000,
          dropShadowDistance: 2,
        }
      )
      announcement.anchor.set(0.5)
      announcement.position.set(cx, cy + 108)
      announcement.alpha = 0
      scene.addChild(announcement)

      setTimeout(() => {
        let aa = 0
        const annTick = (d: number) => {
          aa = Math.min(1, aa + d * 0.06)
          announcement.alpha = aa
          if (aa >= 1) app.ticker.remove(annTick)
        }
        app.ticker.add(annTick)
      }, 600)

      setTimeout(() => {
        if (this.container === scene) {
          let fa = 1
          const fadeTick = (d: number) => {
            fa -= d * 0.05
            scene.alpha = Math.max(0, fa)
            if (fa <= 0) {
              app.ticker.remove(fadeTick)
              if (scene.parent) app.stage.removeChild(scene)
              scene.destroy({ children: true })
              this.container = null
            }
          }
          app.ticker.add(fadeTick)
        }
        resolve()
      }, 2800)
    })
  }
}
