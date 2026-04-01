import { useEffect, useRef } from 'react'
import * as PIXI from 'pixi.js'

interface PixiAppProps {
  onReady: (app: PIXI.Application) => void
}

export default function PixiApp({ onReady }: PixiAppProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const pixiAppRef = useRef<PIXI.Application | null>(null)

  useEffect(() => {
    // Guard : ne pas recréer si déjà initialisé
    if (pixiAppRef.current) return
    if (!containerRef.current) return

    const container = containerRef.current
    const w = container.clientWidth
    const h = container.clientHeight

    const app = new PIXI.Application({
      width: w,
      height: h,
      backgroundColor: 0x1a1a2e,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: true,
    })

    pixiAppRef.current = app
    container.appendChild(app.view as HTMLCanvasElement)
    onReady(app)

    return () => {
      if (pixiAppRef.current) {
        pixiAppRef.current.destroy(true, { children: true })
        pixiAppRef.current = null
      }
    }
  }, [onReady])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ touchAction: 'none' }}
    />
  )
}
