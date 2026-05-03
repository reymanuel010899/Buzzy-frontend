import { useEffect, useRef } from "react"
import type { BannerData } from "../../../redux/reducers/bannerReducer"

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  alpha: number
  color: string
}

const PRIZE_COLORS = ['#FFD700', '#FFA500', '#FF69B4', '#00FFFF', '#ADFF2F']
const ACHIEVEMENT_COLORS = ['#FFD700', '#FFC200', '#FFE066', '#FFFACD']
const ALERT_COLORS = ['#FF4444', '#FF6B6B', '#FF8E8E']
const DEFAULT_COLORS = ['#A78BFA', '#7C3AED', '#60A5FA']

function getColors(type: BannerData['type'], accent: string): string[] {
  if (type === 'PRIZE') return PRIZE_COLORS
  if (type === 'ACHIEVEMENT') return ACHIEVEMENT_COLORS
  if (type === 'ALERT') return ALERT_COLORS
  return [accent, ...DEFAULT_COLORS]
}

export default function ParticlesBanner({ banner }: { banner: BannerData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    const colors = getColors(banner.type, banner.accent_color)
    const particles: Particle[] = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 1.2,
      vy: -Math.random() * 1.5 - 0.5,
      radius: Math.random() * 3 + 1,
      alpha: Math.random(),
      color: colors[Math.floor(Math.random() * colors.length)],
    }))

    let animId: number
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const p of particles) {
        ctx.save()
        ctx.globalAlpha = p.alpha
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.fill()
        ctx.restore()

        p.x += p.vx
        p.y += p.vy
        p.alpha -= 0.004

        if (p.alpha <= 0 || p.y < 0) {
          p.x = Math.random() * canvas.width
          p.y = canvas.height + 5
          p.alpha = Math.random() * 0.8 + 0.2
          p.vy = -Math.random() * 1.5 - 0.5
        }
      }
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(animId)
  }, [banner.type, banner.accent_color])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  )
}
