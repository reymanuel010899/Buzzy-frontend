import { useRef, useCallback } from "react"

export default function HolographicBanner() {
  const layerRef = useRef<HTMLDivElement>(null)

  const handleMove = useCallback((clientX: number, clientY: number) => {
    const el = layerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * 100
    const y = ((clientY - rect.top) / rect.height) * 100
    el.style.background = `
      radial-gradient(circle at ${x}% ${y}%,
        rgba(255,0,255,0.35) 0%,
        rgba(0,255,255,0.25) 25%,
        rgba(255,215,0,0.2) 50%,
        rgba(138,43,226,0.15) 75%,
        transparent 100%
      )
    `
  }, [])

  const onMouseMove = (e: React.MouseEvent) => handleMove(e.clientX, e.clientY)
  const onTouchMove = (e: React.TouchEvent) => {
    const t = e.touches[0]
    if (t) handleMove(t.clientX, t.clientY)
  }

  return (
    <div
      ref={layerRef}
      onMouseMove={onMouseMove}
      onTouchMove={onTouchMove}
      className="absolute inset-0 pointer-events-auto transition-all duration-75"
      style={{
        background: 'radial-gradient(circle at 50% 50%, rgba(255,0,255,0.2) 0%, rgba(0,255,255,0.15) 50%, transparent 100%)',
        mixBlendMode: 'screen',
      }}
    />
  )
}
