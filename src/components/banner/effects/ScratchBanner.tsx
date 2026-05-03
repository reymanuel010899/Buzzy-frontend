import { useEffect, useRef, useState } from "react"

interface Props {
  revealContent: string
  accentColor: string
  onFullyScratched?: () => void
}

export default function ScratchBanner({ revealContent, accentColor, onFullyScratched }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [revealed, setRevealed] = useState(false)
  const isDrawing = useRef(false)
  const scratchedPixels = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    // Capa que se rasca
    ctx.fillStyle = accentColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Texto de "rasca aquí"
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.font = 'bold 13px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('✦ Rasca para revelar ✦', canvas.width / 2, canvas.height / 2)
  }, [accentColor])

  const scratch = (x: number, y: number) => {
    const canvas = canvasRef.current
    if (!canvas || revealed) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.arc(x, y, 22, 0, Math.PI * 2)
    ctx.fill()

    // Calcular % raspado
    scratchedPixels.current += Math.PI * 22 * 22
    const total = canvas.width * canvas.height
    if (scratchedPixels.current / total > 0.45) {
      setRevealed(true)
      onFullyScratched?.()
    }
  }

  const getPos = (canvas: HTMLCanvasElement, clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect()
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {/* Contenido revelado debajo */}
      <div className="absolute inset-0 flex items-center justify-center px-4 text-center z-0">
        <p className="text-white font-bold text-sm drop-shadow">{revealContent}</p>
      </div>

      {/* Capa de scratch encima */}
      {!revealed && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full z-10 cursor-crosshair"
          onMouseDown={() => { isDrawing.current = true }}
          onMouseUp={() => { isDrawing.current = false }}
          onMouseMove={e => {
            if (!isDrawing.current) return
            const { x, y } = getPos(e.currentTarget, e.clientX, e.clientY)
            scratch(x, y)
          }}
          onTouchStart={() => { isDrawing.current = true }}
          onTouchEnd={() => { isDrawing.current = false }}
          onTouchMove={e => {
            const t = e.touches[0]
            if (!t) return
            const { x, y } = getPos(e.currentTarget, t.clientX, t.clientY)
            scratch(x, y)
          }}
        />
      )}
    </div>
  )
}
